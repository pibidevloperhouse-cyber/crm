import os
import json
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
import warnings

# ===== LLM IMPORTS =====
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain.prompts import ChatPromptTemplate

# ===== CUSTOM IMPORTS =====
from database import get_users, get_leads
from email_automation import monitor_emails
from supabase import create_client

# ===== INIT =====
load_dotenv()
app = Flask(__name__)
CORS(app)

warnings.filterwarnings("ignore")

# ===== GLOBAL STATE =====
logs = []
running = False
scheduler = BackgroundScheduler()

# supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

supabase = None
try:
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    print("✅ Supabase connected")
except Exception as e:
    print("❌ Supabase failed:", e)


def add_log(msg):
    logs.append(str(msg))
    if len(logs) > 400:
        logs.pop(0)
    print(msg)


# ====================== BASIC ======================
@app.route("/")
def home():
    return jsonify({"status": "Backend Running 🚀"})


# ====================== EMAIL SYSTEM ======================
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


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(crm_bot, "interval", minutes=2)
        scheduler.start()
        add_log("✅ Scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        add_log("🛑 Scheduler stopped")


@app.route("/start", methods=["POST"])
def start():
    global running
    if not running:
        running = True
        start_scheduler()
    return jsonify({"status": "started"})


@app.route("/stop", methods=["POST"])
def stop():
    global running
    if running:
        running = False
        stop_scheduler()
    return jsonify({"status": "stopped"})


@app.route("/status")
def status():
    return jsonify({"running": running})


# ====================== ICP SYSTEM ======================
@app.route("/icp/chat", methods=["POST"])
def icp_chat():
    user_message = request.json
    response = generate_response(user_message)
    return jsonify({"response": response})


def generate_response(message):
    description = json.dumps(message, indent=2)

    response_schemas = [
        ResponseSchema(
            name="ICP",
            description="designation, income_range, age_group, industry, company_size, region",
        ),
        ResponseSchema(
            name="high_prospect_group", description="conversion_chance, profile"
        ),
        ResponseSchema(
            name="medium_prospect_group", description="conversion_chance, profile"
        ),
        ResponseSchema(
            name="low_prospect_group", description="conversion_chance, profile"
        ),
    ]

    parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = parser.get_format_instructions()

    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", temperature=0.25, api_key=os.getenv("GOOGLE_API_KEY")
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", "You are a marketing analyst AI. Output ONLY JSON."),
            ("human", "Description:\n{description}\n{format_instructions}"),
        ]
    )

    chain = prompt | model | parser

    return chain.invoke(
        {"description": description, "format_instructions": format_instructions}
    )


# ====================== MAIN ======================
if __name__ == "__main__":
    app.run(debug=True)
