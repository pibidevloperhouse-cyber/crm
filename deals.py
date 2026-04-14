# # deals.py
# from langchain_groq import ChatGroq
# from langchain_core.prompts import PromptTemplate
# from pydantic import BaseModel, Field
# import os
# from dotenv import load_dotenv
# pass
# load_dotenv()

# class DealAnalysis(BaseModel):
#     is_deal: bool
#     next_status: str
#     reply_text: str
#     summary: str
#     reasoning: str

# llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0, api_key=os.getenv("GROQ_API_KEY"))

# # Add your prompt templates here (similar to lead.py but for deal stage)
# # Example:
# prompt_existing_deal = PromptTemplate(...)   # you can expand later

# def analyze_existing_deal(...):
#     # same pattern as analyze_existing_lead in lead.py
#     pass

# def check_deal_promotion(message: str):
#     # already used in your code
    