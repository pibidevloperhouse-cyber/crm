from flask import Flask, request, jsonify
from flask_cors import CORS
from database import create_user, get_users
from email_automation import monitor_emails
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
CORS(app)

@app.route('/api/initialize', methods=['POST'])
def initialize():
    data = request.json
    
    name = data.get('name')
    description = data.get('description')
    email = data.get('email')
    password = data.get('password')

    result = create_user(name, description, email, password)
    
    return jsonify(result)


def CRMBot():
    users = get_users()
    for user in users:
        monitor_emails(user['email'], user['password'], "imap.gmail.com", user)

scheduler = BackgroundScheduler()
scheduler_started = False  

def start_scheduler():
    global scheduler_started
    if not scheduler_started:
        try:
            scheduler.add_job(CRMBot, 'interval', minutes=1)  
            scheduler.start()
            scheduler_started = True
        except Exception as e:
            print(f"Error starting scheduler: {e}")

start_scheduler()

if __name__ == '__main__':
    app.run(debug=True)
    