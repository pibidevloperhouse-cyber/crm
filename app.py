from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage, HumanMessage
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain.prompts import ChatPromptTemplate
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import dotenv

dotenv.load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/chat", methods=["POST"])
def chat():
    print("Request Recieved")
    user_message = request.json
    print("User Message:", user_message)
    response = generate_response(user_message)
    print("Generated Response:", response)
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
        model="gemini-1.5-flash",
        temperature=0.7,
        api_key=os.getenv("GOOGLE_API_KEY"),
    )
    prompt_template = ChatPromptTemplate(
        messages=[
            SystemMessage("You are an expert in market analysis with immense experience in the field of ICP analysis and customer segmentation."),
            HumanMessage("""Your task:
                                Given a product or company description, output ONLY a valid JSON object in the exact structure below:

                                {
                                "ICP": {
                                    "designation": "string",
                                    "income_range": "string",
                                    "age_group": "string",
                                    "industry": "string",
                                    "company_size": "string",
                                    "region": "string"
                                },
                                "high_prospect_group": {
                                    "conversion_chance": integer (0-100, without % sign),
                                    "profile": "string"
                                    },
                                    "medium_prospect_group": {
                                    "conversion_chance": integer (0-100, without % sign),
                                    "profile": "string"
                                    },
                                    "low_prospect_group": {
                                    "conversion_chance": integer (0-100, without % sign),
                                    "profile": "string"
                                    }
                                
                                }

                                Rules:
                                1. Output must be valid JSON — no markdown, no code fences, no extra text.
                                2. Field names must match exactly as shown.
                                3. The "prospect_groups" object must contain exactly three keys: High, Medium, Low.

                                Example 1:
                                Product/Company Description: "A SaaS platform that automates HR onboarding for mid-sized tech companies in North America."
                                Output:
                                {
                                "ICP": {
                                    "designation": "HR Manager",
                                    "income_range": "$60,000-$100,000",
                                    "age_group": "30-50",
                                    "industry": "Technology",
                                    "company_size": "100-500 employees",
                                    "region": "North America"
                                },
                                    "high_prospect_group": {
                                    "conversion_chance": 85,
                                    "profile": "Mid-sized tech companies actively hiring and scaling HR operations."
                                    },
                                    "medium_prospect_group": {
                                    "conversion_chance": 60,
                                    "profile": "Small tech firms planning to expand within the next year."
                                    },
                                    "low_prospect_group": {
                                    "conversion_chance": 35,
                                    "profile": "Large enterprises with established in-house HR systems."
                                }
                                }

                                Example 2:
                                Product/Company Description: "An AI-powered inventory tracking system for small local grocery stores."
                                Output:
                                {
                                "ICP": {
                                    "designation": "Store Owner",
                                    "income_range": "$30,000-$70,000",
                                    "age_group": "28-55",
                                    "industry": "Retail - Grocery",
                                    "company_size": "1-10 employees",
                                    "region": "Local/Regional"
                                },
                                "high_prospect_group": {
                                    "conversion_chance": 90,
                                    "profile": "Small grocery stores struggling with manual stock tracking."
                                },
                                "medium_prospect_group": {
                                    "conversion_chance": 55,
                                    "profile": "Franchise convenience stores that partially automate inventory."
                                },
                                "low_prospect_group": {
                                    "conversion_chance": 25,
                                    "profile": "Large supermarket chains with centralized inventory systems."
                                }
                                }

                                Now process the following:

                                Product/Company Description:
                                {description}

                                {format_instructions}
                                """)
        ]
    )
    # Generate a response using the model
    
    response=model.invoke(prompt_template.format(description=description, format_instructions=format_instructions))
 
    parsed=parser.parse(response.content)
 
    return parsed

if __name__ == "__main__":
    app.run(debug=True)
