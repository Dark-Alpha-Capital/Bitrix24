import { auth } from "@/auth";
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
    receivingWebsocket.send(JSON.stringify({type: "register", userId: userId}));
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
    // upload to database
    // if database fails, store on websocket for 5 minutes, then try again. If it fails 3 times in a row, wait 1 hour. If that fails 3 times, wait 1 day
  }
}
