# app.py
import os
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
import warnings

warnings.filterwarnings("ignore", category=UserWarning, module="apscheduler")
try:
    from pytz_deprecation_shim import PytzUsageWarning
    warnings.filterwarnings("ignore", category=PytzUsageWarning)
except ImportError:
    pass

from database import get_users, get_leads
from email_automation import monitor_emails

load_dotenv()


app = Flask(__name__)
CORS(app)

# ====================== LIVE LOGS ======================
logs = []

from supabase import create_client

# ... after load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


def add_log(msg):
    logs.append(str(msg))
    if len(logs) > 400:
        logs.pop(0)
    print(msg)


# ====================== PAGES ======================
@app.route("/")
def dashboard():
    return jsonify({"status": "CRM Server Running 🚀", "frontend": "Next.js"})

# Removed lead_detail HTML endpoint as UI is migrating to Next.js


# ====================== API ======================
@app.route("/api/data")
def api_data():
    entity_type = request.args.get("type", "lead")
    users = get_users()
    result = []
    for user in users:
        if entity_type == "lead":
            data = get_leads(user.get("email"))
        else:
            data = []
        for item in data:
            item["type"] = entity_type
            result.append(item)
    return jsonify(result)


@app.route("/api/logs")
def api_logs():
    return jsonify(logs[-150:])


@app.route("/api/logs/stream")
def stream_logs():
    def generate():
        last_idx = 0
        while True:
            import time
            if len(logs) > last_idx:
                for idx in range(last_idx, len(logs)):
                    yield f"data: {logs[idx]}\n\n"
                last_idx = len(logs)
            time.sleep(1)
            
    from flask import Response
    return Response(generate(), mimetype="text/event-stream")


# ====================== BOT ======================
def crm_bot():
    add_log("\n🤖 CRMBot triggered...")
    users = get_users()
    for user in users:
        if user and user.get("email") and user.get("refresh_token"):
            add_log(f"👤 Monitoring: {user['email']}")
            try:
                monitor_emails(
                    refresh_token=user["refresh_token"],
                    client_id=os.getenv("GOOGLE_CLIENT_ID"),
                    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
                    user=user,
                )
            except Exception as e:
                add_log(f"❌ Error with {user['email']}: {e}")


scheduler = BackgroundScheduler()


def start_scheduler():
    add_log("⏰ Starting scheduler (every 2 minutes)...")
    try:
        scheduler.add_job(crm_bot, "interval", minutes=2)
        scheduler.start()
        add_log("✅ Scheduler started")
    except Exception as e:
        add_log(f"❌ Scheduler error: {e}")


crm_bot()
start_scheduler()


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)

#---------------------------------------------------------------

# import os
# from flask import Flask, request, jsonify
# from flask_cors import CORS
# from database import get_users
# from email_automation import monitor_emails
# from apscheduler.schedulers.background import BackgroundScheduler
# from dotenv import load_dotenv

# load_dotenv()

# app = Flask(__name__)
# CORS(app)


# @app.route("/")
# def home():
#     return "CRM Bot Running 🚀"


# def CRMBot():
#     print("CRMBot is running...")
#     users = get_users()
#     for user in users:
#         if user["email"] and user["refresh_token"]:
#             print(f"Monitoring emails for {user['email']}")
#             monitor_emails(
#                 user["refresh_token"],
#                 os.getenv("GOOGLE_CLIENT_ID"),
#                 os.getenv("GOOGLE_CLIENT_SECRET"),
#                 user,
#             )


# scheduler = BackgroundScheduler()


# def start_scheduler():
#     print("Starting scheduler...")
#     try:
#         scheduler.add_job(CRMBot, "interval", minutes=3)
#         scheduler.start()
#     except Exception as e:
#         print(f"Error starting scheduler: {e}")


# CRMBot()
# start_scheduler()

# if __name__ == "__main__":
#     app.run(debug=True, use_reloader=False)
