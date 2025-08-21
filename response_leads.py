from database import get_leads, addLeads, get_users
import os
from dotenv import load_dotenv
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict

load_dotenv()

response_schemas = [
    ResponseSchema(name="subject", description="Subject of the response email", type="string"),
    ResponseSchema(name="body", description="Body of the response email", type="string"),
    ResponseSchema(name="status", description="Status of the lead (type: 'new' | 'contacted' | 'qualified' | 'closed' | 'lost')", type="string"),
]

output_parser = StructuredOutputParser.from_response_schemas(response_schemas)

prompt_template = """
You are a professional AI sales assistant working for {company_name}, representing the brand in email conversations. Your task is to draft a personalized, human-sounding, and professional reply to an current email. Give some random name in the salutations of your mail. Make sure that the name suits the company demographics.

Company Description:
{company_description}

Previous Conversation (if any):
{conversation_history}

Current Email:
{email_content}

Instructions:
1. Analyze the email carefully.
2. Refer to the company description and any previous conversation history to ensure your reply is relevant and personalized.
3. Maintain a friendly, polite, and helpful tone — like a seasoned sales representative.
4. If the customer is asking a question, answer it with clear details.
5. If they're requesting a quote, acknowledge and mention that the quote will be sent (or provide a rough idea if available).
6. If they're showing interest, gently move them toward the next step (e.g., booking a call, sharing a brochure, or asking clarifying questions).
7. Always maintain a professional structure and grammar.

Return the response in JSON format as specified by the output parser.
{format_instructions}
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["company_name", "company_description", "conversation_history", "email_content"],
    partial_variables={"format_instructions": output_parser.get_format_instructions()}
)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
)

chain = prompt | llm | output_parser

def lead_response(company_name, company_description, conversation_history, email_content, email, user) -> Dict:
    """
    Generate a response to an email based on company details and conversation history.
    
    Args:
        company_name (str): Name of the company.
        company_description (str): Description of the company.
        conversation_history (str): Previous conversation history with the customer.
        email_content (str): Content of the current email to respond to.
        
    Returns:
        Dict: A dictionary containing the response email's subject and body.
    """
    try:
        response = chain.invoke({
            "company_name": company_name,
            "company_description": company_description,
            "conversation_history": conversation_history,
            "email_content": email_content,
        })
        
        subject = response.get("subject", response.get("body", "Re: Inquiry"))
        body = response.get("body", "Thank you for reaching out. We will get back to you shortly.")

        send_email(email, subject, body, user['email'], user['password'])

        addLeads(
            email=email,
            message=response.get('body', ''),
            status=response.get('status', ''),
            user_id=user['id'],
            type="assistant"
        )
    except Exception as e:
        print(f"Error analyzing email: {e}")
        return {
            "is_lead": False,
            "confidence": 0.0
        }
        
        
def send_email(to_email, subject, body, from_email, password):
    """
    Send an email response.
    
    Args:
        to_email (str): Recipient's email address.
        subject (str): Subject of the email.
        body (str): Body content of the email.
    """
    
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        with smtplib.SMTP(os.getenv("SMTP_SERVER"), int(os.getenv("SMTP_PORT"))) as server:
            server.starttls()
            server.login(from_email, password)
            server.sendmail(from_email, to_email, msg.as_string())
            print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")
        
def response_leads():
    users = get_users()

    for user in users:
        leads = get_leads(user['id'])
        for lead in leads:
            if lead['messages'][-1]['type'] == 'assistant':
                continue
            company_name = user['name']
            company_description = user.get('description', 'No description available.')
            conversation_history = lead.get('messages', [])
            email_content = lead.get('email', '')

            response = lead_response(
                company_name=company_name,
                company_description=company_description,
                conversation_history=conversation_history,
                email_content=email_content,
                email=lead['email'],
                user=user
            )
            
            print(f"Response for {lead['email']}: {response}")
        