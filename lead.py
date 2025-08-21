import os
from dotenv import load_dotenv
from langchain.prompts import PromptTemplate
# from langchain_huggingface import HuggingFaceEndpoint
from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain_openai import ChatOpenAI
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from typing import Dict

load_dotenv()

response_schemas = [
    ResponseSchema(name="is_lead", description="Boolean indicating if the email is a potential lead", type="boolean"),
    ResponseSchema(name="confidence", description="Confidence score for the classification (0 to 1)", type="float")
]

output_parser = StructuredOutputParser.from_response_schemas(response_schemas)

prompt_template = """
You are an AI assistant tasked with analyzing an email to determine if it represents a potential business lead for a company. A lead is defined as an email that shows interest in the company's products or services, contains inquiries about offerings, requests for quotes, or indications of potential business opportunities. Non-leads include spam, personal messages, or unrelated communications.

Analyze the following email content:
{email_content}

Instructions:
1. Determine if the email is a potential lead (true) or not (false).
2. Assign a confidence score between 0 and 1 based on how certain you are of the classification.

Return the response in JSON format as specified by the output parser.
{format_instructions}
"""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["email_content"],
    partial_variables={"format_instructions": output_parser.get_format_instructions()}
)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
)

chain = prompt | llm | output_parser

def analyze_email(email_content: str) -> Dict:
    """
    Analyze an email to determine if it's a potential lead.
    
    Args:
        email_content (str): The content of the email to analyze
        
    Returns:
        Dict: JSON containing is_lead (bool) and confidence (float)
    """
    try:
        return chain.invoke({"email_content": email_content})
    except Exception as e:
        print(f"Error analyzing email: {e}")
        return {
            "is_lead": False,
            "confidence": 0.0
        }