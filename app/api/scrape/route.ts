import { auth } from "@/auth";
import { createClient } from "redis";
import { NextRequest, NextResponse } from "next/server";

const redisClient = createClient({
  url: process.env.REDIS_CLIENT_URL,
});

export async function POST(request: NextRequest) {
  const userSession = await auth();

  try {
    await redisClient.connect();
  } catch (error) {
    console.error("Error connecting to Redis:", error);
    return NextResponse.json(
      { error: "Failed to connect to Redis" },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const url = formData.get("url");
  const firmName = formData.get("firmName");
  const userId = formData.get("userId");

  try {
    await redisClient.lPush(
      "submissions",
      JSON.stringify({ url, userId, firmName })
    );
    return NextResponse.json(
      { message: "Submission received" }
    );
  } catch (error) {
    console.error("Error pushing to Redis:", error);
    return NextResponse.json(
      { error: "Error pushing to Redis"},
      {status: 500}
    );
  }
}
