import { auth } from "@/auth";
import { addScraperResultsToDatabase } from "@/app/actions/add-scraper-database";
import axios from "axios";
import { createClient } from "redis";
import { NextRequest, NextResponse } from "next/server";
import {v4 as uuidv4} from 'uuid';

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

  // connect to a websocket, this will remain open until the request is finished
  const receivingWebsocket = new WebSocket("ws://localhost:8080");

  // send data to Redis, so it can be parsed
  const formData = await request.formData();
  const url = formData.get("url");
  const firmName = formData.get("firmName");
  const userId = formData.get("userId");

  receivingWebsocket.onopen = () => {
    console.log("Connected to websocket");
    receivingWebsocket.send(JSON.stringify({type: "register", userId: userId, websocketId: uuidv4()}));
  }

  try {
    await redisClient.lPush(
      "submissions",
      JSON.stringify({ url, userId, firmName })
    );
  } catch (error) {
    console.error("Error pushing to Redis:", error);
    return NextResponse.json(
      { error: "Error pushing to Redis"},
      {status: 500}
    );
  }

  receivingWebsocket.onmessage = (event) => {
    const result = JSON.parse(event.data);
    console.log("Result", result);
    try {
      addResultsToDatabase(userId, result);
      receivingWebsocket.close();
    } catch (error) {
      receivingWebsocket.send(JSON.stringify({type: "status", status: "failure"}));
    }
  }

  receivingWebsocket.onclose = (event) => {
    console.log("Websocket closed")
  }


  return NextResponse.json(
    {
      type: "success",
    }
  );
}
