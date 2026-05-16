import os
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
import warnings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain.prompts import ChatPromptTemplate
from database import get_users, get_leads
from email_automation import monitor_emails
from supabase import create_client

load_dotenv()
app = Flask(__name__)
CORS(app)
warnings.filterwarnings("ignore")

logs = []
running = False
scheduler = None  # Don't create at module level

supabase = None
try:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if url and key:
        supabase = create_client(url, key)
        print("✅ Supabase connected")
except Exception as e:
    print("❌ Supabase init error:", e)


def add_log(msg):
    logs.append(str(msg))
    if len(logs) > 400:
        logs.pop(0)
    print(msg)


@app.route("/")
def home():
    return jsonify({"status": "Backend Running 🚀"})


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


@app.route("/start", methods=["POST"])
def start():
    global running, scheduler
    if not running:
        # Always create a fresh scheduler — never reuse a stopped one
        scheduler = BackgroundScheduler()
        # scheduler.add_job(crm_bot, "interval", minutes=2)
        scheduler.add_job(crm_bot, "interval", minutes=1)
        scheduler.start()
        running = True
        add_log("✅ Scheduler started")
    return jsonify({"status": "started"})


@app.route("/stop", methods=["POST"])
def stop():
    global running, scheduler
    if running and scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        scheduler = None
        running = False
        add_log("🛑 Scheduler stopped")
    return jsonify({"status": "stopped"})


@app.route("/status")
def status():
    return jsonify({"running": running})


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


@app.route("/get-users", methods=["POST"])
def fetch_users():
    """
    API endpoint to fetch users based on the provided email.
    Expects a JSON payload with an 'email' field.
    """
    data = request.get_json()
    email = data.get("email")

    try:
        users = get_users(email)
        return jsonify({"success": True, "users": users}), 200
    except Exception as e:
        print("Error in fetch_users endpoint:", e)
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
