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
    subject: str, body: str, company_name: str, company_number: str
) -> str:
    return f"""
    <html>
    <head>
        <style>
            body {{font-family: Arial, sans-serif; line-height: 1.6; color: #333;}}
            .header {{background: #2c3e50; color: white; padding: 20px; text-align: center;}}
            .body {{padding: 30px;}}
            .footer {{font-size: 12px; color: #777; margin-top: 30px; text-align: center;}}
        </style>
    </head>
    <body>
        <div class="header">
            <h2>{company_name}</h2>
            <p>Professional Reply • AI Sales Assistant</p>
        </div>
        <div class="body">{body}</div>
        <div class="footer">
            This email was sent automatically by your CRM AI Assistant.<br>
            Questions? Reply directly or call {company_number}
        </div>
    </body>
    </html>
    """


def generate_and_send_reply(
    user, refresh_token, contact_email, result, lead_description=""
):
    """Called from process_email"""
    llm = ChatGroq(
        model="llama-3.1-8b-instant", temperature=0.3, api_key=os.getenv("GROQ_API_KEY")
    )
    structured_llm = llm.with_structured_output(EmailResponse)
    chain = prompt | structured_llm

    response = chain.invoke(
        {
            "sender_name": user.get("name", "Sales Team"),
            "sender_role": user.get("role", "Sales Representative"),
            "company_name": user.get("companyName", "Our Company"),
            "company_description": user.get("companyDescription", ""),
            "company_products": "Your products will be shown here",  # you can improve later
            "lead_description": lead_description,
            "current_status": result.get("next_status", "Contacted"),
            "conversation_history": "Previous conversation will be here",  # you can pass real history later
            "email_content": "Latest email content",
        }
    ).model_dump()

    html_body = format_html_email(
        response["subject"],
        response["body"],
        user.get("companyName", ""),
        user.get("companyNumber", ""),
    )

    sent = send_email(
        refresh_token=refresh_token,
        to_email=contact_email,
        subject=response["subject"],
        body=html_body,
        sender_email=user["email"],
    )

    return sent, response["status"]


# # import os
# # import base64
# # import smtplib
# # from dotenv import load_dotenv
# # from typing import Dict
# # from database import get_leads, addLeads, get_users
# # from langchain_core.prompts import PromptTemplate
# # from langchain_google_genai import ChatGoogleGenerativeAI
# # from langchain_core.output_parsers import StructuredOutputParser, ResponseSchema
# # from email.mime.text import MIMEText
# # from email.mime.multipart import MIMEMultipart
# # from googleapiclient.discovery import build
# # from google.oauth2.credentials import Credentials

# import os
# import base64
# import smtplib
# from typing import Dict

# from dotenv import load_dotenv

# # DB
# from database import get_leads, addLeads, get_users

# # LangChain (CORRECT for 0.0.350)
# from langchain_core.prompts import PromptTemplate
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.output_parsers import StructuredOutputParser, ResponseSchema
# # Email
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart

# # Gmail API
# from googleapiclient.discovery import build
# from google.oauth2.credentials import Credentials

# load_dotenv()

# response_schemas = [
#     ResponseSchema(name="subject", description="Subject of the response email", type="string"),
#     ResponseSchema(name="body", description="Body of the response email", type="string"),
#     ResponseSchema(name="status", description="Status of the lead (type: 'New' | 'In progress' | 'Contact Attempted' | 'Contacted' | 'Meeting Booked' | 'Unqualified')", type="string"),
# ]

# output_parser = StructuredOutputParser.from_response_schemas(response_schemas)

# prompt_template = """
# You are a professional AI sales assistant working for {company_name}, representing the brand in email conversations. Your task is to draft a personalized, human-sounding, and professional reply to an current email. Give some random name in the salutations of your mail. Make sure that the name suits the company demographics.Your name is {sender_name} and position is {sender_role}.

# Company Description:
# {company_description}

# Products Offerings:
# {company_products}

# Company Website:
# {company_website}

# Company Phone Number:
# {company_number}

# Previous Conversation (if any):
# {conversation_history}

# Current Email:
# {email_content}

# Instructions:
# 1. Analyze the email carefully.
# 2. Refer to the company description and any previous conversation history to ensure your reply is relevant and personalized.
# 3. Maintain a friendly, polite, and helpful tone — like a seasoned sales representative.
# 4. If the customer is asking a question, answer it with clear details.
# 5. If they're requesting a quote, acknowledge and mention that the quote will be sent (or provide a rough idea if available).
# 6. If they're showing interest, gently move them toward the next step (e.g., booking a call, sharing a brochure, or asking clarifying questions).
# 7. Always maintain a professional structure and grammar.

# Return the response in JSON format as specified by the output parser.
# {format_instructions}
# """

# prompt = PromptTemplate(
#     template=prompt_template,
#     input_variables=["company_name", "company_description", "conversation_history", "email_content"],
#     partial_variables={"format_instructions": output_parser.get_format_instructions()}
# )

# llm = ChatGoogleGenerativeAI(
#     model="gemini-2.5-flash",
#     temperature=0,
# )

# chain = prompt | llm | output_parser

# def lead_response(email_content,company_name,company_description,company_products,company_website,company_number,sender_name,sender_role,conversation_history,email,user, refresh_token) -> Dict:
#     """
#     Generate a response to an email based on company details and conversation history.

#     Args:
#         company_name (str): Name of the company.
#         company_description (str): Description of the company.
#         conversation_history (str): Previous conversation history with the customer.
#         email_content (str): Content of the current email to respond to.

#     Returns:
#         Dict: A dictionary containing the response email's subject and body.
#     """
#     try:
#         response = chain.invoke({
#             "company_name": company_name,
#             "company_description": company_description,
#             "company_products": company_products,
#             "company_website": company_website,
#             "company_number": company_number,
#             "sender_name": sender_name,
#             "sender_role": sender_role,
#             "conversation_history": conversation_history,
#             "email_content": email_content,
#         })

#         send_email(
#             refresh_token,
#             to_email=email,
#             subject=response.get('subject', 'Re: Inquiry'),
#             body=format_html_email(
#     response.get('subject', 'Re: Inquiry'),
#     response.get('body', 'Thank you for reaching out. We will get back to you shortly.'),
#     response.get('status', 'New')
# ),
#             from_email=user['email']
#         )

#         addLeads(
#             email=email,
#             message=response.get('body', ''),
#             status=response.get('status', ''),
#             user_email=user['email'],
#             type="assistant"
#         )

#     except Exception as e:
#         print(f"Error analyzing email: {e}")
#         return {
#             "is_lead": False,
#             "confidence": 0.0
#         }

# def formatProduct(product):
#     out = ""

#     for i, p in enumerate(product):
#         out += f"Product {i}) {p['name']} : {p['description']}\n"
#     return out

# def format_html_email(subject, body, status):
#     return f"""
#     <html>
#       <head>
#         <style>
#           body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
#           .container {{ border: 1px solid #ddd; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; }}
#           .header {{ font-size: 18px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; }}
#           .body {{ margin-bottom: 20px; white-space: pre-line; }}
#           .status {{ font-size: 14px; color: #555; background: #f4f4f4; padding: 8px; border-radius: 5px; display: inline-block; }}
#           .footer {{ font-size: 12px; color: #999; margin-top: 20px; }}
#         </style>
#       </head>
#       <body>
#         <div class="container">
#           <div class="header">{subject}</div>
#           <div class="body">{body}</div>
#           <div class="status">Lead Status: <b>{status}</b></div>
#           <div class="footer">This email was sent automatically by your AI Sales Assistant.</div>
#         </div>
#       </body>
#     </html>
#     """


# def send_email(refresh_token,to_email, subject, body, from_email):
#     msg = MIMEMultipart()
#     msg['From'] = from_email
#     msg['To'] = to_email
#     msg['Subject'] = subject
#     # msg.attach(MIMEText(body, 'plain'))
#     msg.attach(MIMEText(body, 'html'))


#     creds = Credentials(
#             None,
#             refresh_token=refresh_token,
#             client_id=os.getenv("GOOGLE_CLIENT_ID"),
#             client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
#             token_uri="https://oauth2.googleapis.com/token",
#             scopes=["https://mail.google.com/"]
#         )

#     service = build("gmail", "v1", credentials=creds)

#     raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

#     try:
#         message = (
#             service.users()
#             .messages()
#             .send(userId="me", body={"raw": raw_message})
#             .execute()
#         )
#         print(f"✅ Email sent to {to_email}, Message ID: {message['id']}")

#         return True
#     except Exception as e:
#         print(f"❌ Failed to send email: {e}")
#         return False

# def response_leads(refresh_token):
#     users = get_users()

#     for user in users:
#         leads = get_leads(user['email'])
#         for lead in leads:
#             if lead['source'] == "Email" and lead['messages']:
#                 if lead['messages'][-1]['type'] == 'assistant':
#                     continue
#                 company_name = user['companyName']
#                 company_description = user.get('companyDescription', 'No description available.')
#                 company_products = formatProduct(user.get('products', []))
#                 company_website = user.get('companyWebsite', 'No website available.')
#                 company_number = user.get('companyNumber', 'No number available.')
#                 sender_name = user.get('name', 'Sales Team')
#                 sender_role = user.get('role', 'Sales Representative')
#                 conversation_history = lead.get('messages', [])
#                 email_content = lead.get('email', '')

#                 response = lead_response(
#                     email_content=email_content,
#                     company_name=company_name,
#                     company_description=company_description,
#                     company_products=company_products,
#                     company_website=company_website,
#                     company_number=company_number,
#                     sender_name=sender_name,
#                     sender_role=sender_role,
#                     conversation_history=conversation_history,
#                     email=lead['email'],
#                     user=user,
#                     refresh_token=refresh_token
#                 )

#                 print(f"Response for {lead['email']}: {response}")
