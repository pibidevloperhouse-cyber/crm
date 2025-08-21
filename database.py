import os
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def get_users():
    """Fetch all users from the database.
    Returns:
        list: A list of users with their details.
    """
    try:
        response = supabase.table("Users").select("*").execute()
        return response.data
    except Exception as e:
        print(e)
        return []

def addLeads(email, message, status, user_email, content= None, type="customer"):
    try:
        existing = supabase.table("Leads").select("*") \
            .eq("user_email", user_email).eq("email", email).execute()

        timestamp_str = datetime.now().isoformat()

        if existing.data:
            updated_messages = existing.data[0].get("messages", []) + [{
                "message": message,
                "type": type,
                "timestamp": timestamp_str
            }]

            lead_id = existing.data[0]["id"]
            supabase.table("Leads").update({
                "messages": updated_messages,
                "status": status,
            }).eq("id", lead_id).execute()

            return "updated", 200

        else:
            data = [{
                "email": email,
                "messages": [{
                    "message": message,
                    "type": type,
                    "timestamp": timestamp_str
                }],
                "status": status,
                "user_email": user_email,
                "name": content["name"],
                "number": content["number"] or None,
                "age": content["age"] or None,
                "linkedIn": content["linkedIn"] or None,
                "industry": content["industry"] or None,
                "company": content["company"] or None,
                "income": content["income"] or None,
                "website": content["website"] or None,
                "address": content["address"] or None,
                "description": content["description"] or None,
                "source": "Email",
            }]
            supabase.table("Leads").insert(data).execute()
            return "created", 201

    except Exception as e:
        print("Error adding Leads:", e)
        return {"error": str(e)}, 500
    
def get_lead_with_email(user_email, email):
    try:
        response = supabase.table("Leads").select("*").eq("email", email).eq("user_email", user_email).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print("Error fetching lead:", e)
        return None
    
def get_leads(user_email):
    try:
        response = supabase.table("Leads").select("*").eq("user_email", user_email).execute()
        return response.data if response.data else []
    except Exception as e:
        print("Error fetching Leads:", e)
        return []