import base64
import email
import re
import os
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv

load_dotenv()

def decode_subject(subject_header):
    from email.header import decode_header
    subject, encoding = decode_header(subject_header)[0]
    if isinstance(subject, bytes):
        subject = subject.decode(encoding or 'utf-8', errors='ignore')
    return subject


def clean_email_body(body, assistant_email):
    reply_delimiters = [
        r'On\s+.*?\s+wrote:',
        r'From:\s+.*',
        r'---.*---',
        r'>.*'
    ]

    for delimiter in reply_delimiters:
        body = re.split(delimiter, body, flags=re.IGNORECASE | re.MULTILINE)[0]

    body_lines = [line for line in body.splitlines() if not line.startswith('>')]
    body = '\n'.join(body_lines).strip()

    if assistant_email.lower() in body.lower():
        body = body[:body.lower().index(assistant_email.lower())].strip()

    return body


def fetch_unseen_emails(service, assistant_email):
    results = service.users().messages().list(userId="me", labelIds=["INBOX"], q="is:unread").execute()
    messages = results.get("messages", [])

    new_messages = []

    for msg in messages:
        m = service.users().messages().get(userId="me", id=msg["id"]).execute()

        headers = m["payload"].get("headers", [])
        sender = next((h["value"] for h in headers if h["name"] == "From"), None)
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")
        subject = decode_subject(subject)

        if assistant_email.lower() in (sender or "").lower():
            continue

        body = ""
        if "parts" in m["payload"]:
            for part in m["payload"]["parts"]:
                if part["mimeType"] == "text/plain":
                    body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")
                    body = clean_email_body(body, assistant_email)
                    break
        else:
            body = base64.urlsafe_b64decode(m["payload"]["body"]["data"]).decode("utf-8", errors="ignore")
            body = clean_email_body(body, assistant_email)

        if body.strip():
            new_messages.append({"subject": subject, "body": body, "from": sender})

        service.users().messages().modify(
            userId="me",
            id=msg["id"],
            body={"removeLabelIds": ["UNREAD"]}
        ).execute()

    return new_messages


def formatProduct(product):
    out = ""
    for i, p in enumerate(product):
        out += f"Product {i}) {p['name']} : {p['description']}\n"
    return out


def monitor_emails(refresh_token, client_id, client_secret, user):
    """
    Monitor unseen emails using Gmail API (OAuth2).
    Args:
        refresh_token (str): Refresh token from OAuth2 flow.
        client_id (str): Google OAuth2 Client ID.
        client_secret (str): Google OAuth2 Client Secret.
        user (dict): User info.
    """
    creds = Credentials(
        None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/gmail.modify"]
    )

    service = build("gmail", "v1", credentials=creds)
    new_emails = fetch_unseen_emails(service, user["email"])

    for email_data in new_emails:
        print("-" * 40)
        print(f"📩 New email from {email_data['from']}")
        print(f"Subject: {email_data['subject']}")
        print(f"Body: {email_data['body']}")
        print("-" * 40)
