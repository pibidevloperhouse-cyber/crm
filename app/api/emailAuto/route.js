import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Store process reference globally so we can kill it later
let emailProcess = null;

export async function POST(request) {
  try {
    const { action } = await request.json();

    if (action === "start") {
      // Prevent multiple instances
      if (emailProcess) {
        return Response.json({ success: false, error: "Already running" }, { status: 400 });
      }

      // Path to app.js — you need to have it checked out locally
      // Run: git checkout email_auto -- email_auto_app.js
      const appPath = path.join(process.cwd(), "app.py");

      // Check if file exists
      if (!fs.existsSync(appPath)) {
        return Response.json(
          { success: false, error: "app.py not found. Run: git checkout email_auto -- app.py && mv app.py email_auto_app.py" },
          { status: 404 }
        );
      }

      // Spawn app.js as a child process
      emailProcess = spawn("python3", [appPath], {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"], // capture logs
      });

      // Log output
      emailProcess.stdout.on("data", (data) => {
        console.log(`[email_auto] stdout: ${data}`);
      });

      emailProcess.stderr.on("data", (data) => {
        console.error(`[email_auto] stderr: ${data}`);
      });

      // Cleanup when process exits
      emailProcess.on("close", (code) => {
        console.log(`[email_auto] process exited with code ${code}`);
        emailProcess = null;
      });

      return Response.json({ success: true, status: "started", pid: emailProcess.pid });
    }

    if (action === "stop") {
      if (!emailProcess) {
        return Response.json({ success: false, error: "No process running" }, { status: 400 });
      }

      // Kill the process
      emailProcess.kill("SIGTERM");
      emailProcess = null;

      return Response.json({ success: true, status: "stopped" });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Email auto error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Check current status
export async function GET() {
  return Response.json({
    running: emailProcess !== null,
    pid: emailProcess?.pid ?? null,
  });
}