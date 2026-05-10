import { createClient } from "@/utils/supabase/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  let success = false;
  let errorMsg = "";

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Google only returns refresh_token on FIRST auth or when prompt=consent.
    // We store both so we always have the latest valid token.
    const updatePayload = {
      access_token: tokens.access_token,
      token_expiry: tokens.expiry_date,
    };
    // Only overwrite refresh_token when Google actually sends one
    if (tokens.refresh_token) {
      updatePayload.refresh_token = tokens.refresh_token;
    }

    const supabase = await createClient();
    const session = await getServerSession(authOptions);

    const { error } = await supabase
      .from("Users")
      .update(updatePayload)
      .eq("email", session.user.email);

    if (error) {
      console.error("Supabase update error:", error);
      errorMsg = error.message;
    } else {
      success = true;
    }
  } catch (err) {
    console.error("OAuth callback error:", err);
    errorMsg = err.message;
  }

  // ── Close the popup and notify the opener via postMessage ────────────────
  // Instead of redirecting (which keeps popup open), return HTML that
  // calls window.close() so the polling timer in EmailTemplate triggers.
  const html = `<!DOCTYPE html>
<html>
  <head><title>Gmail Auth</title></head>
  <body>
    <script>
      try {
        if (window.opener) {
          window.opener.postMessage(
            { type: 'GMAIL_AUTH_RESULT', success: ${success}, error: '${errorMsg}' },
            window.location.origin
          );
        }
      } catch(e) {}
      window.close();
    <\/script>
    <p>Authorization ${success ? 'successful' : 'failed'}. This window will close automatically.</p>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
