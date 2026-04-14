# # customers.py
# from langchain_groq import ChatGroq
# from langchain_core.prompts import PromptTemplate
# from pydantic import BaseModel, Field
# import os
# from dotenv import load_dotenv

# load_dotenv()


# class CustomerAnalysis(BaseModel):
#     next_status: str
#     reply_text: str
#     summary: str
#     reasoning: str


# llm = ChatGroq(
#     model="llama-3.1-8b-instant", temperature=0, api_key=os.getenv("GROQ_API_KEY")
# )

# # Add prompts for customer support / upselling
