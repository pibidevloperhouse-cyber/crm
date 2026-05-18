import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GTM_SYSTEM_PROMPT } from "@/lib/gtmSystemPrompt";

// Initialize the API with your key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { messages } = await req.json();

    // 1. Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1]?.content;
    if (!lastMessage) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    // 2. Initialize Model (Using 1.5-flash as 2.5 does not exist)
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: GTM_SYSTEM_PROMPT, // Most stable as a direct string
    });

    // 3. Generate Content (Simpler and faster than startChat for this use case)
    const result = await model.generateContent(lastMessage);
    const response = await result.response;
    const text = response.text();

    // 4. Return the EXACT format the frontend needs
    // Your frontend looks for data.content, so we must provide it here.
    return NextResponse.json({
      role: "assistant",
      content: text,
    });

  } catch (error) {
    console.error("GTM Chatbot Error:", error);

    // If this runs, the frontend will show your "Apologies" message
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}










// import { NextResponse } from "next/server";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { GTM_SYSTEM_PROMPT } from "@/lib/gtmSystemPrompt";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// export async function POST(req) {
//   try {
//     const { messages } = await req.json();

//     // Validate messages
//     if (!messages || !Array.isArray(messages) || messages.length === 0) {
//       return NextResponse.json(
//         { error: "No messages provided" },
//         { status: 400 }
//       );
//     }

//     // Only last user message is sent to Gemini
//     const lastMessage = messages[messages.length - 1]?.content;
//     if (!lastMessage || !lastMessage.trim()) {
//       return NextResponse.json(
//         { error: "Empty message" },
//         { status: 400 }
//       );
//     }

//     // Initialize Gemini model
//     const model = genAI.getGenerativeModel({
//       model: "gemini-1.5-flash",
//       systemInstruction: {
//         role: "system",
//         parts: [{ text: GTM_SYSTEM_PROMPT }],
//       },
//     });

//     // Start chat WITHOUT history to avoid role errors
//     const chat = model.startChat();

//     // Send last user message
//     const result = await chat.sendMessage(lastMessage, {
//       temperature: 0.4,
//       maxOutputTokens: 256,
//     });

//     return NextResponse.json({
//       role: "assistant",
//       content: result.response.text(),
//     });
//   } catch (error) {
//     console.error("GTM Chatbot Error:", error);

//     return NextResponse.json(
//       {
//         error: "Internal Server Error",
//         message:
//           "The GTM assistant is temporarily unavailable. Please try again.",
//       },
//       { status: 500 }
//     );
//   }
// }
