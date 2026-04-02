import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GTM_SYSTEM_PROMPT } from "@/lib/gtmSystemPrompt";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // Only last user message is sent to Gemini
    const lastMessage = messages[messages.length - 1]?.content;
    if (!lastMessage || !lastMessage.trim()) {
      return NextResponse.json(
        { error: "Empty message" },
        { status: 400 }
      );
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: GTM_SYSTEM_PROMPT, // just pass string
    });

    // Start chat WITHOUT history to avoid role errors
    const chat = model.startChat();

    // Send last user message
    const result = await chat.sendMessage(lastMessage, {
      temperature: 0.4,
      maxOutputTokens: 256,
    });

    return NextResponse.json({
      role: "assistant",
      content: result.response.text(),
    });
  } catch (error) {
    console.error("GTM Chatbot Error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          "The GTM assistant is temporarily unavailable. Please try again.",
      },
      { status: 500 }
    );
  }
}
