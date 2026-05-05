import os
import base64
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

load_dotenv()


class EmailResponse(BaseModel):
    subject: str
    body: str
    status: str


prompt_template = """
You are a professional sales assistant named {sender_name} ({sender_role}) at {company_name}.

Company Description:
{company_description}

Products:
{company_products}

Human Notes (RESPECT 100% - never contradict):
{lead_description}

Current Status: {current_status}
Conversation History:
{conversation_history}

Latest Customer Email:
{email_content}

Rules:
- Never downgrade status if human marked Qualified/Closed Won/Closed Lost/Unqualified
- If customer asks about product → list products and ask which one
- If strong buying intent → set "Qualified"
- If wants meeting/demo → set "Meeting Booked"
- If ready to buy → set "Closed Won"
- Keep reply professional, short, warm, Kaggle-style clean

Return ONLY valid JSON with subject, body, status.
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=[
        "sender_name",
        "sender_role",
        "company_name",
        "company_description",
        "company_products",
        "lead_description",
        "current_status",
        "conversation_history",
        "email_content",
    ],
)


def send_email(refresh_token, to_email, subject, body, sender_email):
    """Send beautiful HTML email"""
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    creds = Credentials(
        None,
        refresh_token=refresh_token,
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://mail.google.com/"],
    )

    service = build("gmail", "v1", credentials=creds)
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    try:
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
        print(f"   📧 Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"   ❌ Email failed: {e}")
        return False


def format_html_email(
    subject: str, 
    body: str, 
    company_name: str, 
    company_number: str, 
    company_logo: str = None, 
    company_address: str = None, 
    company_website: str = None
) -> str:
    # Build Header Content
    logo_html = f'<img src="{company_logo}" alt="{company_name} Logo" style="max-height: 50px; margin-bottom: 10px;"/><br>' if company_logo else ''
    header_html = f"""
        {logo_html}
        <h2 style="margin: 0;">{company_name}</h2>
    """

    # Build Footer Content
    address_html = f"{company_address}<br>" if company_address else ""
    website_html = f'<a href="{company_website}" style="color: #4CAF50;">{company_website}</a><br>' if company_website else ""
    
    footer_html = f"""
        {address_html}
        {website_html}
        Phone: {company_number}<br>
        <br>
        <span style="font-size: 10px; color: #aaa;">This email was sent by your AI Sales Assistant.</span>
    """

    return f"""
    <html>
    <head>
        <style>
            body {{font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;}}
            .email-container {{max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;}}
            .header {{background: #fdfdfd; border-bottom: 1px solid #eee; padding: 20px; text-align: center; color: #333;}}
            .body {{padding: 30px; font-size: 15px;}}
            .footer {{background: #fafafa; border-top: 1px solid #eee; padding: 20px; font-size: 12px; color: #777; text-align: center; line-height: 1.8;}}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                {header_html}
            </div>
            <div class="body">
                {body}
            </div>
            <div class="footer">
                {footer_html}
            </div>
        </div>
    </body>
    </html>
    """


def generate_and_send_reply(
    user, refresh_token, contact_email, result, lead_description=""
):
    """Generate and send a reply based on LLM analysis."""
    html_body = format_html_email(
        subject=result["subject"],
        body=result["body"],
        company_name=user.get("companyName", "Our Company"),
        company_number=user.get("companyNumber", ""),
        company_logo=user.get("logo_url", ""),
        company_address=user.get("address", ""),
        company_website=user.get("companyWebsite", ""),
    )

    sent = send_email(
        refresh_token=refresh_token,
        to_email=contact_email,
        subject=result["subject"],
        body=html_body,
        sender_email=user["email"],
    )

    if sent:
        print(f"✅ Email sent to {contact_email}")
    else:
        print(f"❌ Failed to send email to {contact_email}")
