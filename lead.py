# lead.py
import os
from dotenv import load_dotenv
from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

load_dotenv()

# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────


class SenderScreen(BaseModel):
    is_human: bool = Field(
        ..., description="True only if real human personally writing this"
    )
    sender_type: str = Field(
        ...,
        description="One of: human, newsletter, marketing, automated, company_broadcast",
    )
    reasoning: str = Field(..., description="Why you classified this sender")


class ExtractedContent(BaseModel):
    name: Optional[str] = Field(None, description="Full name")
    number: Optional[str] = Field(None)
    age: Optional[str] = Field(None)
    linkedIn: Optional[str] = Field(None)
    industry: Optional[str] = Field(None)
    company: Optional[str] = Field(None)
    income: Optional[str] = Field(None)
    website: Optional[str] = Field(None)
    address: Optional[str] = Field(None)
    description: Optional[str] = Field(None)


class NewLeadAnalysis(BaseModel):
    is_lead: bool = Field(
        ..., description="True only if asking about OUR product/service"
    )
    confidence: float = Field(..., ge=0, le=1)
    extracted_content: Optional[ExtractedContent] = Field(None)
    reply_text: str = Field(
        ..., description="Reply to send. Empty string if not a lead."
    )
    summary: str = Field(..., description="Max 2 lines summary")
    reasoning: str = Field(..., description="Why lead or not")


class ExistingLeadAnalysis(BaseModel):
    next_status: str = Field(..., description="Best next status")
    reply_text: str = Field(..., description="Context-aware reply")
    summary: str = Field(..., description="Max 2 lines summary of this email")
    reasoning: str = Field(..., description="Why this status")


class DealPromotionCheck(BaseModel):
    should_promote: bool = Field(
        ...,
        description="True if lead is asking about specific product/pricing and ready for deal stage",
    )
    product_names: list = Field(
        default=[], description="Specific product names they mentioned"
    )
    deal_title: str = Field(default="", description="Suggested deal title")
    estimated_value: str = Field(
        default="", description="Any pricing/value mentioned by lead"
    )
    reasoning: str = Field(..., description="Why promote or not")


# ─────────────────────────────────────────────
# LLM
# ─────────────────────────────────────────────
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY"),
)

# ─────────────────────────────────────────────
# REFINED PROMPTS (This is the main upgrade)
# ─────────────────────────────────────────────

SENDER_SCREEN_PROMPT = PromptTemplate(
    template="""
You are screening incoming emails for a B2B CRM system.

Sender: {sender}
Subject: {subject}
Body preview: {body_preview}

Classify sender_type as ONE of:
- "human"             → real person writing personally to us
- "newsletter"        → blog digest, weekly update, tutorial
- "marketing"         → product promotion, campaign, announcement
- "automated"         → system alert, notification, job board
- "company_broadcast" → company announcement, press release

is_human = true ONLY if sender_type is "human".

Return strictly as JSON.
""",
    input_variables=["sender", "subject", "body_preview"],
)

NEW_LEAD_PROMPT = PromptTemplate(
    template="""
You are a strict lead qualifier for a B2B tech software company.

Our Company:
{description}

Our Products:
{products}

Incoming Email:
{email_content}

A TRUE LEAD is ONLY when this person is:
✅ Asking about OUR product or service specifically
✅ Requesting a demo, pricing, trial, or partnership with US
✅ Describing their business problem that OUR product solves
✅ Aware of us and reaching out intentionally

NOT a lead — reject immediately if:
❌ They are selling their own product/service TO us
❌ Newsletter, blog post, tutorial, or content
❌ Cold recruiting, job offers, or HR emails
❌ Industry news or third-party announcements
❌ They have no awareness of who we are
❌ Generic mass email

Confidence threshold: is_lead=true ONLY if confidence >= 0.75.
When in doubt → is_lead: false, reply_text: "".

Return strictly as JSON.
""",
    input_variables=["email_content", "description", "products"],
)

EXISTING_LEAD_PROMPT = PromptTemplate(
    template="""
You are managing an active CRM lead conversation for a B2B tech software company.

Our Company: {description}
Our Products: {products}

Full Conversation History (oldest → newest):
{conversation_history}

Current Lead Status: {current_status}
Valid Next Statuses: {valid_next_statuses}

New Email Just Received:
{email_content}

Instructions:
1. Study the full history + new email carefully.
2. Pick next_status from valid options only. Stay on current if none fit.
3. Write a warm, specific reply that references past conversation context.
4. Summarize the new email in max 2 lines.
5. Explain your status decision.

Return strictly as JSON.
""",
    input_variables=[
        "email_content",
        "description",
        "products",
        "conversation_history",
        "current_status",
        "valid_next_statuses",
    ],
)

DEAL_PROMOTION_PROMPT = PromptTemplate(
    template="""
You are deciding if a lead should be promoted to a DEAL stage in a CRM.

Our Products:
{products}

Full Conversation History:
{conversation_history}

Latest Email:
{email_content}

Promote to DEAL (should_promote=true) ONLY if the lead:
✅ Mentions a SPECIFIC product name from our catalog by name
✅ Asks about pricing, plans, specs, or purchase details
✅ Requests a proposal, quote, or demo of a specific product
✅ Shows clear buying intent (ready to purchase or evaluate seriously)

Do NOT promote if:
❌ Just general inquiry or early-stage curiosity
❌ No specific product mentioned
❌ Still asking broad questions about what we do

If promoting, fill product_names, deal_title, estimated_value.

Return strictly as JSON.
""",
    input_variables=["products", "conversation_history", "email_content"],
)

# ─────────────────────────────────────────────
# FUNCTIONS (Exactly same as your old code)
# ─────────────────────────────────────────────


def screen_sender(sender: str, subject: str, body: str) -> dict:
    try:
        chain = SENDER_SCREEN_PROMPT | llm.with_structured_output(SenderScreen)
        result = chain.invoke(
            {
                "sender": sender,
                "subject": subject,
                "body_preview": body[:400],
            }
        )
        return result.model_dump()
    except Exception as e:
        print(f"LLM screen_sender error: {e}")
        return None


def analyze_new_email(email_content: str, description: str, products: str) -> dict:
    try:
        chain = NEW_LEAD_PROMPT | llm.with_structured_output(NewLeadAnalysis)
        result = chain.invoke(
            {
                "email_content": email_content,
                "description": description,
                "products": products,
            }
        )
        return result.model_dump()
    except Exception as e:
        print(f"LLM analyze_new_email error: {e}")
        return None


def analyze_existing_lead(
    email_content: str,
    description: str,
    products: str,
    conversation_history: str,
    current_status: str,
    valid_next_statuses: list,
) -> dict:
    try:
        chain = EXISTING_LEAD_PROMPT | llm.with_structured_output(ExistingLeadAnalysis)
        result = chain.invoke(
            {
                "email_content": email_content,
                "description": description,
                "products": products,
                "conversation_history": conversation_history,
                "current_status": current_status,
                "valid_next_statuses": ", ".join(valid_next_statuses)
                or "None (terminal)",
            }
        )
        return result.model_dump()
    except Exception as e:
        print(f"LLM analyze_existing_lead error: {e}")
        return None


def check_deal_promotion(
    email_content: str,
    products: str,
    conversation_history: str,
) -> dict:
    try:
        chain = DEAL_PROMOTION_PROMPT | llm.with_structured_output(DealPromotionCheck)
        result = chain.invoke(
            {
                "email_content": email_content,
                "products": products,
                "conversation_history": conversation_history,
            }
        )
        return result.model_dump()
    except Exception as e:
        print(f"LLM check_deal_promotion error: {e}")
        return None


# ─────────────────────────────────────────────
# HELPERS (Same as your old code)
# ─────────────────────────────────────────────


def format_products(products: list) -> str:
    if not products:
        return "No products listed."
    return "\n".join(
        [
            f"{i+1}) {p.get('name','N/A')} [{p.get('category','')}] — ${p.get('base_price','?')}\n   {p.get('description','')}"
            for i, p in enumerate(products)
        ]
    )


def format_conversation_history(memories: list) -> str:
    if not memories:
        return "No previous conversation."
    lines = []
    for m in memories:
        arrow = "→ They wrote" if m["direction"] == "inbound" else "← We replied"
        lines.append(f"[{arrow} | Status: {m['status_after']}]\n{m['summary']}")
    return "\n\n".join(lines)


# import os
# from dotenv import load_dotenv
# # from langchain_huggingface import HuggingFaceEndpoint
# # from langchain_openai import ChatOpenAI
# from typing import Dict
# from langchain_core.prompts import PromptTemplate
# from langchain_groq import ChatGroq
# from langchain.output_parsers import StructuredOutputParser, ResponseSchema


# load_dotenv()

# response_schemas = [
#     ResponseSchema(
#         name="is_lead",
#         description="Boolean indicating if the email is a potential lead",
#         type="boolean",
#     ),
#     ResponseSchema(
#         name="confidence",
#         description="Confidence score for the classification (0 to 1)",
#         type="float",
#     ),
#     ResponseSchema(
#         name="extracted_content",
#         description="Extracted content if the email is a lead and provide in json",
#         type="json",
#         optional=True,
#     ),
# ]

# output_parser = StructuredOutputParser.from_response_schemas(response_schemas)

# prompt_template = """
# You are an AI assistant tasked with analyzing an email to determine if it represents a potential business lead for a company with below description and product offerings. A lead is defined as an email that shows interest in the company's products or services, contains inquiries about offerings, requests for quotes, or indications of potential business opportunities. Non-leads include spam, personal messages, or unrelated communications.

# Company Description:
# {description}

# Product Offerings:
# {products}

# Analyze the following email content:
# {email_content}

# Instructions:
# 1. Determine if the email is a potential lead (true) or not (false).
# 2. Assign a confidence score between 0 and 1 based on how certain you are of the classification.
# 3. If it is Lead, Extract the following content if it exists and give in json with name as keys:
#     - name str required,
#     - number str | null,
#     - age str | null,
#     - "linkedIn" str | null,
#     - industry str | null,
#     - company str | null,
#     - income str | null,
#     - website str | null,
#     - address str | null,
#     - description str | null,

# Return the response in JSON format as specified by the output parser.
# {format_instructions}
# """

# prompt = PromptTemplate(
#     template=prompt_template,
#     input_variables=["email_content"],
#     partial_variables={"format_instructions": output_parser.get_format_instructions()},
# )

# llm = ChatGroq(
#     model="llama-3.1-8b-instant", temperature=0, api_key=os.getenv("GROQ_API_KEY")
# )
# chain = prompt | llm | output_parser


# def analyze_email(email_content: str, description: str, products: str) -> Dict:
#     """
#     Analyze an email to determine if it's a potential lead.

#     Args:
#         email_content (str): The content of the email to analyze

#     Returns:
#         Dict: JSON containing is_lead (bool) and confidence (float)
#     """
#     try:
#         return chain.invoke(
#             {
#                 "email_content": email_content,
#                 "description": description,
#                 "products": products,
#             }
#         )
#     except Exception as e:
#         print(f"Error analyzing email: {e}")
#         return None
