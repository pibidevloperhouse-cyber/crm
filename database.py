import os
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime
# from langchain_community.tools import tool

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

# @tool
def create_user(name, desc, email, password):
    """Create a new user in the database.
    Args:
        name (str): The name of the user.
        desc (str): A description of the user.
        email (str): The email address of the user.
        password (str): The password for the user.
    Returns:
        str: A success message if the user is created successfully."""
    data = {
        "name": name,
        "description": desc,
        "email": email,
        "password": password
    }
    
    try:
        supabase.table("Users").insert(data).execute()
        return "success"
    except Exception as e:
        return "error"

# @tool
def get_users():
    """Fetch all users from the database.
    Returns:
        list: A list of users with their details.
    """
    try:
        response = supabase.table("Users").select("*").execute()
        return response.data
    except Exception as e:
        return []

# @tool
def addLeads(email, message, status, user_id, type="customer"):
    """Add or update leads in the database.
    Args:
        email (str): The email address of the lead.
        message (str): The message associated with the lead.
        status (str): The status of the lead (e.g., 'contacted').
        user_id (int): The ID of the user associated with the lead.
        type (str): The type of lead, default is 'customer'.
    Returns:
        str: A message indicating whether the lead was created or updated."""
    try:
        user_id = int(user_id)

        existing = supabase.table("leads").select("*") \
            .eq("user_id", user_id).eq("email", email).execute()

        timestamp_str = datetime.now().isoformat()

        if existing.data:
            updated_messages = existing.data[0].get("messages", []) + [{
                "message": message,
                "type": type,
                "timestamp": timestamp_str
            }]

            lead_id = existing.data[0]["id"]
            supabase.table("leads").update({
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
                "user_id": user_id
            }]
            supabase.table("leads").insert(data).execute()
            return "created", 201

    except Exception as e:
        print("Error adding leads:", e)
        return {"error": str(e)}, 500

# @tool
def get_leads(user_id):
    """Fetch leads associated with a user.
    Args:
        user_id (int): The ID of the user whose leads are to be fetched.
    Returns:
        list: A list of leads associated with the user.
    """
    try:
        response = supabase.table("leads").select("*").eq("user_id", user_id).execute()
        return response.data if response.data else []
    except Exception as e:
        print("Error fetching leads:", e)
        return []
    
def get_lead_with_email(user_id, email):
    """Fetch a lead by email for a specific user.
    Args:
        user_id (int): The ID of the user.
        email (str): The email address of the lead.
    Returns:
        dict: The lead data if found, otherwise None.
    """
    try:
        response = supabase.table("leads").select("*").eq("email", email).eq("user_id", user_id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print("Error fetching lead:", e)
        return None
    
# @tool
def get_user(user_id):
    """Fetch a user by ID.
    Args:
        user_id (int): The ID of the user to fetch.
    Returns:
        dict: The user data if found, otherwise None.
    """
    try:
        response = supabase.table("Users").select("*").eq("id", user_id).execute()
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        print("Error fetching user:", e)
        return None