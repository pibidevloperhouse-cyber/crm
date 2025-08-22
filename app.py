import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import get_users
from email_automation import monitor_emails
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

def CRMBot():
    print("CRMBot is running...")
    users = get_users()
    for user in users:
        if user['email'] and user['refresh_token']:
            print(f"Monitoring emails for {user['email']}")
            monitor_emails(user['refresh_token'], os.getenv("GOOGLE_CLIENT_ID"), os.getenv("GOOGLE_CLIENT_SECRET"), user)

scheduler = BackgroundScheduler()

def start_scheduler():
    print("Starting scheduler...")
    try:
        scheduler.add_job(CRMBot, 'interval', minutes=1)  
        scheduler.start()
    except Exception as e:
        print(f"Error starting scheduler: {e}")

start_scheduler()

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)
    