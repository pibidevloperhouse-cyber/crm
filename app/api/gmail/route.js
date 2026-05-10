import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { to_email, from_email, subject, body, refresh_token, access_token } =
      await req.json();

    if (!to_email || !from_email || !subject || !body) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (to, from, subject, body)" },
        { status: 400 }
      );
    }

    if (!refresh_token && !access_token) {
      return NextResponse.json(
        { success: false, error: "No Gmail token. Please connect Gmail first." },
        { status: 401 }
      );
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Set whichever token we have — refresh_token is preferred
    const credentials = {};
    if (refresh_token) credentials.refresh_token = refresh_token;
    if (access_token) credentials.access_token = access_token;
    oAuth2Client.setCredentials(credentials);

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const messageParts = [
      `From: ${from_email}`,
      `To: ${to_email}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      body,
    ];

    const message = messageParts.join("\n");
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Failed to send email:", error);

    // Surface a human-readable error — "unauthorized_client" means Gmail OAuth not set up
    let userMessage = error.message;
    if (error.message?.includes("unauthorized_client")) {
      userMessage =
        "unauthorized_client — Your Google OAuth app may be in Testing mode. " +
        "Add your email as a Test User in Google Cloud Console → APIs & Services → OAuth consent screen, " +
        "or publish the app.";
    } else if (error.message?.includes("invalid_grant")) {
      userMessage = "invalid_grant — Token expired or revoked. Please reconnect Gmail.";
    }

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 400 }
    );
  }
}
