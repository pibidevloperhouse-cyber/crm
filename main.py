import pandas as pd
import numpy as np
import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
from langchain.prompts import ChatPromptTemplate
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Welcome to the Revenue Optimizer API!"})


def get_optimal_discount(customer_intent_score):

    df =pd.read_csv('product_deals_dataset.csv')
    winning_deals = df[df['won_lost'] == 1]
   
    if customer_intent_score >= 75:
        high_intent_wins = winning_deals[winning_deals['customer_intent_score'] >= 75]
        
        if not high_intent_wins.empty:
            min_discount = high_intent_wins['discount_offered'].min()
            max_discount = high_intent_wins['discount_offered'].max()
        
            normalized_score = (customer_intent_score - 75) / (100 - 75)
            optimal_discount = max_discount - (max_discount - min_discount) * normalized_score
        else:
            optimal_discount = 5

    elif 50 <= customer_intent_score < 75:

        medium_intent_wins =winning_deals[(winning_deals['customer_intent_score'] >= 50) & (winning_deals['customer_intent_score'] < 75)]
 
        if not medium_intent_wins.empty:
            min_discount = medium_intent_wins['discount_offered'].min()
            max_discount = medium_intent_wins['discount_offered'].max()
            normalized_score = (customer_intent_score - 50) / (75 - 50)
            
            optimal_discount = max_discount - (max_discount - min_discount) * normalized_score
        else:
            optimal_discount = 10

    else:
  
        low_intent_wins = winning_deals[winning_deals['customer_intent_score'] < 50]

        if not low_intent_wins.empty:
            min_discount = low_intent_wins['discount_offered'].min()
            max_discount = low_intent_wins['discount_offered'].max()
            normalized_score = (customer_intent_score - 25) / (50 - 25)
            
            optimal_discount = max_discount - (max_discount - min_discount) * normalized_score
        else:
            optimal_discount = 15

    return {
        'recommended_discount': optimal_discount,
    }

def generate_llm_analysis(pricing_data, product_details):
    """
    Sends the pricing data to the LLM and gets a structured market analysis.
    
    Args:
        pricing_data (dict): The pricing data to be analyzed.
        product_details (dict): The product description and configuration.
        
    Returns:
        dict: A structured dictionary containing the market analysis.
    """
    response_schemas = [
        ResponseSchema(
            name="market_analysis",
            description="A concise summary of current market trends related to the product."
        ),
        ResponseSchema(
            name="competitor_pricing_summary",
            description="A brief analysis of competitor pricing and strategies."
        ),
        ResponseSchema(
            name="final_optimized_quote",
            description="The final price recommendation based on both the internal calculation and market analysis, as a single numerical value."
        )
    ]
    parser = StructuredOutputParser.from_response_schemas(response_schemas)
    format_instructions = parser.get_format_instructions()
 
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.25,
        api_key=os.getenv("GOOGLE_API_KEY")
    )

    # Define the prompt to be sent to the LLM
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """You are a world-class pricing and market analyst. Your primary function is to provide
        a final, optimized price quote based on internal calculations and external market data.
        
        Rules:
        1. Base your analysis on the provided internal data, market trends, and competitor pricing.
        2. DO NOT invent details or make assumptions about specific competitors.
        3. Your output MUST be a single, valid JSON object following the provided schema.
        4. The final quote should be a single numerical value, without currency symbols."""),
        ("human", """
        My calculated pricing suggestion for the following product is:
        {pricing_data}
        
        Product Details:
        {product_details}
        
        Please analyze current market trends and competitor pricing for similar products.
        Based on both the calculated suggestion and your market analysis, provide a final, optimized price quote.
        
        {format_instructions}
        """)
    ])
    
    formatted_pricing_data = json.dumps(pricing_data, indent=2)
    formatted_product_details = json.dumps(product_details, indent=2)

    chain = prompt_template | model | parser

    parsed_response = chain.invoke({
        "pricing_data": formatted_pricing_data,
        "product_details": formatted_product_details,
        "format_instructions": format_instructions
    })

    return parsed_response

if __name__ == "__main__":
 
        new_product_base_price = 1000
        new_customer_intent_score = 95
        sample_product_details = {
        "Product": "Aether 12 Pro Smartphone",
        "Description": "The latest flagship smartphone with a triple-lens camera, all-day battery life, and a stunning ProMotion display.",
        "Configurations": {
            "Model": "Aether 12 Pro",
            "Color": "Midnight Black",
            "Storage": "512 GB",
            "Screen Size": "6.7 inches"
        }
    }

        optimal_quote = get_optimal_discount(new_customer_intent_score)
        
        recommended_discount = optimal_quote['recommended_discount']
        final_price = new_product_base_price * (1 - recommended_discount / 100)
        pricing_data_for_llm = {
            "Base Price": new_product_base_price,
            "Customer Intent Score": new_customer_intent_score,
            "Recommended Discount": round(recommended_discount, 2),
            "Final Quote Price": round(final_price, 2),
        }
        
        llm_response = generate_llm_analysis(pricing_data_for_llm, sample_product_details)  

        print(f"Base Price: ${new_product_base_price:,.2f}")
        print(f"Customer Intent Score: {new_customer_intent_score}")
        print(f"Recommended Discount: {recommended_discount:.2f}%")
        print(f"Final Quote Price: ${final_price:,.2f}")
        print("\n--- LLM-Generated Market Analysis ---")
        print(f"  Market Analysis: {llm_response['market_analysis']}")
        print(f"  Competitor Pricing: {llm_response['competitor_pricing_summary']}")
        final_quote_float = float(llm_response['final_optimized_quote'])
        print(f"  Final Optimized Quote: ${final_quote_float:,.2f}")
    

