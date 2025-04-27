"use server";

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import prismaDB from "@/lib/prisma";
import * as mammoth from "mammoth";
import { screenDealSchema } from "@/lib/schemas";
import { auth } from "@/auth";
import { LogUserAction } from "@/prisma/mutations"
import { User, UserRole } from "@prisma/client";

const openai = createOpenAI({
  apiKey: process.env.AI_API_KEY,
  compatibility: "strict",
});

/**
 * Function: screenDeal
 * ---------------------
 * This function is responsible for screening deals against a set of criteria in a deal flow management system.
 * It processes uploaded text or docx files, extracts relevant content, and uses OpenAI's GPT-4o model to analyze the deal based on the provided criteria.
 *
 * @param {FormData} formData - The FormData object containing the uploaded file, comment, and deal ID.
 *
 * Process Flow:
 * 1. **User Authentication**: Verifies if the user is authenticated.
 * 2. **Input Validation**: Ensures the `file` and `dealId` fields exist in the FormData.
 * 3. **File Processing**:
 *    - Supports `.txt` files (reads content using `file.text()`).
 *    - Supports `.docx` files (extracts content using `mammoth`).
 *    - Throws an error for unsupported file types.
 * 4. **Deal Fetching**: Retrieves deal details from the database using Prisma.
 * 5. **AI Reasoning**:
 *    - Uses OpenAI's GPT-4o model via the `generateObject` function to analyze the deal.
 *    - Input: Deal details, screening criteria (extracted from the file), and any additional comments.
 *    - Ensures reasoning adheres to the specified schema (`screenDealSchema`).
 * 6. **Response Handling**:
 *    - Returns a success response with AI-generated reasoning.
 *    - Catches and logs any errors, returning a standardized error message.
 *
 * @returns {Object} - A response object with the following structure:
 *    - type: "success" | "error"
 *    - result (if success): AI reasoning object adhering to the `screenDealSchema`
 *    - message: Descriptive message about the result.
 *
 * Example Response:
 * Success:
 * {
 *   type: "success",
 *   result: { ...aiReasoning },
 *   message: "Successfully screened this deal using AI"
 * }
 *
 * Error:
 * {
 *   type: "error",
 *   message: "Server side Error Occured, please try again!!!!"
 * }
 *
 * Dependencies:
 * - OpenAI SDK for AI integration.
 * - Prisma for database operations.
 * - Mammoth for `.docx` file content extraction.
 * - Zod for schema validation.
 * - `@/auth` for user authentication.
 *
 * File Handling:
 * - `.txt` files: Content is read directly using `file.text()`.
 * - `.docx` files: Content is extracted as raw text using `mammoth`.
 *
 * Errors Handled:
 * - Missing or invalid file/dealId.
 * - Unsupported file types.
 * - Deal not found in the database.
 * - Server-side errors during AI processing or database queries.
 */
export default async function screenDeal(formData: FormData) {
  try {
    const userSession = await auth();

    if (!userSession) {
      return {
        type: "error",
        message: "User is not authenticated!!!",
      };
    }

    const file = formData.get("file") as File;
    const comment = formData.get("comment") as string;
    const dealId = formData.get("dealId") as string;

    if (!file || !dealId) {
      throw new Error("File and deal ID are required");
    }

    // Check if the file is a text or docx file
    let fileContent = "";
    if (file.name.endsWith(".txt")) {
      // For text files, use file.text()
      fileContent = await file.text();
    } else if (file.name.endsWith(".docx")) {
      // For docx files, use mammoth to extract the text
      const arrayBuffer = await file.arrayBuffer(); // Get ArrayBuffer
      const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer
      const { value } = await mammoth.extractRawText({ buffer });
      fileContent = value;
    } else {
      throw new Error("Unsupported file type");
    }

    console.log("file contents", fileContent);
    // Fetch deal details
    const deal = await prismaDB.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new Error("Deal not found");
    }

    const { object: aiReasoning } = await generateObject({
      model: openai("gpt-4o"),
      system:
        "You are an AI assistant that screens deals for a deal flow management system, based on provided criteria. Provide detailed analysis for your resoning and dont hallucinate or generate inaccurate responses",
      prompt: `
      Screen the following deal against the provided criteria:

      Deal Details:
      ${JSON.stringify(deal, null, 2)}

      Screening Criteria:
      ${fileContent}

      Additional Comment:
      ${comment}

      Provide a detailed analysis of the deal based on the screening criteria.
    `,
      schema: screenDealSchema,
    });

    LogUserAction(userSession.user, "Screened a deal", "Deal ID: " + dealId);

    return {
      type: "success",
      result: aiReasoning,
      message: "Successfully screened this deal using AI",
    };
  } catch (error) {
    console.log("an error occured while trying to screen deals");
    return {
      type: "error",
      message: "Server side Error Occured, please try again!!!!",
    };
  }
}
