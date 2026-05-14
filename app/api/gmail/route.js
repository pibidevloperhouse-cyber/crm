import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { to_email, from_email, subject, body, refresh_token } =
      await req.json();
    
    if (!refresh_token) {
      return NextResponse.json({ success: false, error: "Gmail refresh token is missing. Please reconnect your Gmail account." }, { status: 400 });
    }
    if (!to_email || !from_email || !subject || !body) {
      return NextResponse.json({ success: false, error: "Missing required email fields (To, Subject, or Body)" }, { status: 400 });
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oAuth2Client.setCredentials({ refresh_token: refresh_token });

    // Ensure we have a fresh access token to fetch token info
    const { token } = await oAuth2Client.getAccessToken();
    const tokenInfo = await oAuth2Client.getTokenInfo(token);
    const authenticatedEmail = tokenInfo.email || from_email; 

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const messagesParts = [
      `From: ${authenticatedEmail}`,
      `To: ${to_email}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      body,
    ];

    const message = messagesParts.join("\r\n");
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    try {
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        data: res.data,
      });
    } catch (apiError) {
      console.error("❌ Gmail API specific error:", apiError.response?.data || apiError.message);
      return NextResponse.json(
        { 
          success: false, 
          error: apiError.response?.data?.error_description || apiError.message,
          details: apiError.response?.data
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Failed to send email (internal error):", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
