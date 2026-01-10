import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
import express from "express";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const GENAI_API_KEY = process.env.GOOGLE_API_KEY;
const MODEL_ID = "gemini-2.0-flash-exp";

if (!GENAI_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY in environment variables");
}

const client = new GoogleGenAI({ apiKey: GENAI_API_KEY });

wss.on("connection", async (ws: WebSocket) => {
  console.log("Client connected");

  try {
    // Connect to Gemini Live API with ASL-optimized system instruction
    const session = await client.live.connect({
      model: MODEL_ID,
      config: {
        responseModalities: [Modality.TEXT],
        systemInstruction: {
          parts: [{
            text: `You are an ASL alphabet interpreter. You will receive video frames of a person signing ASL letters.

TASK: Identify the ASL letter being shown and respond with ONLY the single uppercase letter (A-Z).

RULES:
- Output only ONE letter per recognition
- If no clear hand sign is visible, output nothing
- Do not add explanations or punctuation
- Be decisive - pick the most likely letter`
          }]
        },
      },
      callbacks: {
        onopen: () => {
          console.log("Connected to Gemini Live");
        },
        onmessage: (message: { serverContent?: { modelTurn?: { parts?: Array<{ text?: string }> }, turnComplete?: boolean } }) => {
          const serverContent = message.serverContent;
          if (serverContent?.modelTurn?.parts) {
            for (const part of serverContent.modelTurn.parts) {
              if (part.text) {
                // Send each text chunk immediately for real-time display
                ws.send(JSON.stringify({ type: "text", content: part.text }));
              }
            }
          }
          if (serverContent?.turnComplete) {
            ws.send(JSON.stringify({ type: "done" }));
          }
        },
        onerror: (error: Error | Event) => {
          console.error("Gemini Live API error:", error);
          ws.send(JSON.stringify({ type: "error", message: "Gemini API error" }));
        },
        onclose: () => {
          console.log("Gemini Live session closed");
          ws.send(JSON.stringify({ type: "error", message: "Gemini session closed" }));
        },
      },
    });

    console.log("Gemini Live session established");

    // Listen for messages from Frontend -> Send to Gemini
    ws.on("message", async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "frame") {
          // msg.image is base64 string (no header)
          // Use sendRealtimeInput for continuous video streaming
          session.sendRealtimeInput({
            media: {
              data: msg.image,
              mimeType: "image/jpeg"
            }
          });
        }
      } catch (err) {
        console.error("Error processing frontend message:", err);
        ws.send(JSON.stringify({ type: "error", message: "Failed to process frame" }));
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      // Session cleanup is handled automatically by SDK
    });

  } catch (err) {
    console.error("Gemini connection error:", err);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "error", message: "Failed to connect to Gemini" }));
    }
    ws.close();
  }
});

server.listen(8080, () => {
  console.log("Server started on http://localhost:8080");
});