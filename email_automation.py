import imaplib
import email
from email.header import decode_header
import re
from lead import analyze_email
from database import addLeads, get_lead_with_email
from response_leads import response_leads
# from langchain_community.tools import tool

def decode_subject(subject_header):
    subject, encoding = decode_header(subject_header)[0]
    if isinstance(subject, bytes):
        subject = subject.decode(encoding or 'utf-8', errors='ignore')
    return subject

def clean_email_body(body, assistant_email):
    """
    Clean the email body to remove quoted text and assistant's previous replies.
    Returns only the sender's latest message content.
    """
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

def fetch_unseen_emails(mail, seen_ids, assistant_email):
    mail.select("inbox")
    _, message_numbers = mail.search(None, "UNSEEN")
    new_messages = []

    for num in message_numbers[0].split():
        if num in seen_ids:
            continue
        seen_ids.add(num)
        _, msg_data = mail.fetch(num, "(RFC822)")
        email_body = msg_data[0][1]
        msg = email.message_from_bytes(email_body)

        sender = msg["from"]
        if assistant_email.lower() in sender.lower():
            continue

        subject = decode_subject(msg["subject"])
        body = ""

        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain" and not part.get("Content-Disposition"):
                    charset = part.get_content_charset() or "utf-8"
                    body = part.get_payload(decode=True).decode(charset, errors="ignore")
                    body = clean_email_body(body, assistant_email)
                    break
        else:
            charset = msg.get_content_charset() or "utf-8"
            body = msg.get_payload(decode=True).decode(charset, errors="ignore")
            body = clean_email_body(body, assistant_email)

        if body.strip():
            new_messages.append({"subject": subject, "body": body, "from": sender})

    return new_messages

def formatProduct(product):
    out = ""

    for i, p in enumerate(product):
        out += f"Product {i}) {p['name']} : {p['description']}\n"
    return out

# @tool
def monitor_emails(email_user, email_pass, imap_server, user):
    """Monitor unseen emails and process them.
    Args:
        email_user (str): The email address of the user.
        email_pass (str): The password for the email account.
        imap_server (str): The IMAP server address.
        user (dict): The user information.
    Returns:
        None
    """
    mail = imaplib.IMAP4_SSL(imap_server)
    mail.login(email_user, email_pass)
    seen_ids = set()
    new_emails = fetch_unseen_emails(mail, seen_ids, email_user)
    for email_data in new_emails:
        print(f"New email from {email_data['from']}")

        user_lead = get_lead_with_email(user['email'], email=email_data['from'])
        if user_lead:
            addLeads(
                email=email_data['from'],
                message=email_data['body'],
                status="Contacted",
                user_email=user['email']
            )
            response_leads()
            print("User lead found.")
        else:
            result = analyze_email(f"Subject: {email_data['subject']}\nBody: {email_data['body']}", user['companyDescription'], formatProduct(user['products']))
            if result["is_lead"]:
                addLeads(
                    email=email_data['from'],
                    message=email_data['body'],
                    status="New",
                    user_email=user['email'],
                    content=result["extracted_content"]
                )
                response_leads()
            
    mail.logout()