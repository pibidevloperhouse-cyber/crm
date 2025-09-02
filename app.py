from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage, HumanMessage
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain.prompts import ChatPromptTemplate
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import dotenv
import json

dotenv.load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Welcome to the ICP Generation API!"})

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json
    response = generate_response(user_message)
    return jsonify({"response": response}),200

def generate_response(message):
    description=message
    response_schemas = [
        ResponseSchema(name="ICP", description="An object with fields: designation, income_range, age_group, industry, company_size, region."),
        ResponseSchema(
        name="high_prospect_group",
        description="""An object with:
            conversion_chance (integer, percentage without % symbol),
            profile (short, specific description of the target prospect with High level)."""
    ),
    ResponseSchema(
        name="medium_prospect_group",
        description="""An object with:
            conversion_chance (integer, percentage without % symbol),
            profile (short, specific description of the target prospect with Medium level)."""
    ),
    ResponseSchema(
        name="low_prospect_group",
        description="""An object with:
            conversion_chance (integer, percentage without % symbol),
            profile (short, specific description of the target prospect with Low level)."""
    )
                    ]
    parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = parser.get_format_instructions()
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.25
    )
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """You are a world-class marketing analyst AI. Your primary function is to derive precise, data-driven Ideal Customer Profiles (ICPs) from company information.
        You MUST adhere to the following core rules in all responses:
        1.  Your analysis MUST be based exclusively on the user-provided data.
        2.  DO NOT invent details, make assumptions, or use any external knowledge.
        3.  You MUST output a single, valid JSON object with no markdown, comments, or any other text outside the JSON structure."""),
        ("human", """Your task:
        Given all the company details, output ONLY a valid JSON object in the exact structure below.

        Rules:
        1. Output must be valid JSON — no markdown, no code fences, no extra text.
        2. Field names must match exactly as shown in the format instructions.

        Now process the following:

        Full company description:
        {description}

        {format_instructions}
        """)
    ])
    
    description = json.dumps(description, indent=2)

    chain = prompt_template | model | parser
    
    parsed_response = chain.invoke({
        "description": description, 
        "format_instructions": format_instructions
    })

    return parsed_response

if __name__ == "__main__":
    app.run(debug=True)
