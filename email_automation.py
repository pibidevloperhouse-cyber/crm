import base64
import re
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv
from lead import analyze_email
from database import addLeads, get_lead_with_email
from response_leads import response_leads
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
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

def is_junk(email_data):
    sender = (email_data.get('from') or "").lower()
    subject = (email_data.get('subject') or "").lower()

    junk_keywords = [
        "newsletter", "no-reply", "noreply",
        "jobs", "webinar", "unsubscribe",
        "notification", "alert", "glassdoor",
        "linkedin", "simplilearn"
    ]

    if any(k in sender for k in junk_keywords):
        return True
    if any(k in subject for k in junk_keywords):
        return True

    return False


def fetch_unseen_emails(service, assistant_email):
    results = service.users().messages().list(userId="me", labelIds=["INBOX"], q="is:unread").execute()
    messages = results.get("messages", [])[:5]

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
        scopes=["https://mail.google.com/"]
    )

    service = build("gmail", "v1", credentials=creds)
    new_emails = fetch_unseen_emails(service, user["email"])
    
    
    import time

    for i, email_data in enumerate(new_emails, start=1):

        print("\n==============================")
        print(f"📩 Email #{i}")
        print(f"From: {email_data['from']}")
        print(f"Subject: {email_data['subject']}")
        print("==============================")

        # 🚫 STEP 1: Skip junk emails
        if is_junk(email_data):
            print("🚫 Skipping junk email")
            continue

        # 🔁 STEP 2: Check existing lead
        user_lead = get_lead_with_email(user['email'], email=email_data['from'])

        if user_lead:
            print("🔁 Existing lead → updating")

            addLeads(
                email=email_data['from'],
                message=email_data['body'],
                status="Contacted",
                user_email=user['email']
            )

            response_leads(refresh_token)
            continue

        # 🧠 STEP 3: Run LLM (LIMITED)
        if i > 3:
            print("⛔ Skipping remaining emails (quota protection)")
            break

        print("🧠 Running LLM analysis...")

        result = analyze_email(
            f"Subject: {email_data['subject']}\nBody: {email_data['body']}",
            user['companyDescription'],
            formatProduct(user['products'])
        )

        print("LLM RESULT →")
        print("Is Lead:", result.get("is_lead"))
        print("Confidence:", result.get("confidence"))

        if result.get("is_lead"):
            print("✅ Lead detected → saving")

            addLeads(
                email=email_data['from'],
                message=email_data['body'],
                status="New",
                user_email=user['email'],
                content=result["extracted_content"]
            )

            response_leads(refresh_token)
        else:
            print("❌ Not a lead")

        # ⏳ STEP 4: Delay (VERY IMPORTANT)
        time.sleep(12)

    # for email_data in new_emails:
    #     print(f"New email from {email_data['from']}")

    #     user_lead = get_lead_with_email(user['email'], email=email_data['from'])
    #     if user_lead:
    #         addLeads(
    #             email=email_data['from'],
    #             message=email_data['body'],
    #             status="Contacted",
    #             user_email=user['email']
    #         )
    #         response_leads(refresh_token)
    #         print("User lead found.")
    #     else:
    #         result = analyze_email(f"Subject: {email_data['subject']}\nBody: {email_data['body']}", user['companyDescription'], formatProduct(user['products']))
    #         if result["is_lead"]:
    #             addLeads(
    #                 email=email_data['from'],
    #                 message=email_data['body'],
    #                 status="New",
    #                 user_email=user['email'],
    #                 content=result["extracted_content"]
    #             )
    #             response_leads(refresh_token)