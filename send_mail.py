import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

load_dotenv()

def send_email(service, to_email, subject, body, from_email):
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    try:
        message = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": raw_message})
            .execute()
        )
        print(f"✅ Email sent to {to_email}, Message ID: {message['id']}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

creds = Credentials(
    None,
    refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN"),
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    token_uri="https://oauth2.googleapis.com/token",
    scopes=["https://www.googleapis.com/auth/gmail.send"]
)

service = build("gmail", "v1", credentials=creds)
send_email(service, "guruvijaym21ec@psnacet.edu.in", "Test Subject", "Test Body", "guru78508@gmail.com")