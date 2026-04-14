import os
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime
from config import ENTITY_TABLES, DEFAULT_STATUS

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)


# ─────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────


def get_users():
    """
    For testing: returns one hardcoded user.
    For production: uncomment the supabase query.
    """
    # ── TESTING (one email) ──
    return [get_user_by_email("kikuu737@gmail.com")]

    # ── PRODUCTION (all users) ──
    # try:
    #     response = supabase.table("Users").select("*").execute()
    #     return response.data or []
    # except Exception as e:
    #     print("Error fetching users:", e)
    #     return []


def get_user_by_email(email: str):
    response = supabase.table("Users").select("*").eq("email", email).execute()
    return response.data[0] if response.data else None


# ─────────────────────────────────────────────
# GENERIC ENTITY (Lead / Deal / Customer)
# ─────────────────────────────────────────────


def get_entity_by_email(entity_type: str, user_email: str, contact_email: str):
    """Fetch a lead/deal/customer by contact email."""
    table = ENTITY_TABLES.get(entity_type)
    if not table:
        print(f"Unknown entity type: {entity_type}")
        return None
    try:
        response = (
            supabase.table(table)
            .select("*")
            .eq("user_email", user_email)
            .eq("email", contact_email)
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error fetching {entity_type}:", e)
        return None


def upsert_entity(
    entity_type: str,
    contact_email: str,
    message: str,
    status: str,
    user_email: str,
    content: dict = None,
    direction: str = "inbound",
):
    """
    Create or update a lead/deal/customer.
    Appends message to messages array.
    Returns ("created"|"updated", status_code)
    """
    table = ENTITY_TABLES.get(entity_type)
    if not table:
        return {"error": f"Unknown entity type: {entity_type}"}, 400

    timestamp_str = datetime.now().isoformat()
    msg_entry = {
        "message": message,
        "type": direction,
        "timestamp": timestamp_str,
    }

    try:
        existing = (
            supabase.table(table)
            .select("*")
            .eq("user_email", user_email)
            .eq("email", contact_email)
            .execute()
        )

        if existing.data:
            current_messages = existing.data[0].get("messages", [])
            entity_id = existing.data[0]["id"]
            supabase.table(table).update(
                {
                    "messages": current_messages + [msg_entry],
                    "status": status,
                    "updated_at": timestamp_str,
                }
            ).eq("id", entity_id).execute()
            return "updated", 200

        else:
            data = {
                "email": contact_email,
                "messages": [msg_entry],
                "status": status,
                "user_email": user_email,
                "source": "Email",
                "created_at": timestamp_str,
                "updated_at": timestamp_str,
            }
            if content:
                for field in [
                    "name",
                    "number",
                    "age",
                    "linkedIn",
                    "industry",
                    "company",
                    "income",
                    "website",
                    "address",
                    "description",
                ]:
                    data[field] = content.get(field)

            supabase.table(table).insert(data).execute()
            return "created", 201

    except Exception as e:
        print(f"Error upserting {entity_type}:", e)
        return {"error": str(e)}, 500


def update_entity_status(
    entity_type: str, contact_email: str, user_email: str, new_status: str
):
    """Update only the status field."""
    table = ENTITY_TABLES.get(entity_type)
    try:
        supabase.table(table).update(
            {
                "status": new_status,
                "updated_at": datetime.now().isoformat(),
            }
        ).eq("email", contact_email).eq("user_email", user_email).execute()
    except Exception as e:
        print(f"Error updating status:", e)


# ─────────────────────────────────────────────
# EMAIL MEMORY
# ─────────────────────────────────────────────


def save_email_memory(
    lead_id,
    lead_email: str,
    user_email: str,
    direction: str,  # "inbound" | "outbound"
    summary: str,
    status_before: str,
    status_after: str,
    llm_reasoning: str = "",
    original_content: str = "",
):
    """Save a summarized memory entry for each email interaction."""
    try:
        supabase.table("email_memory").insert(
            {
                "lead_id": lead_id,
                "lead_email": lead_email,
                "user_email": user_email,
                "direction": direction,
                "summary": summary,
                "status_before": status_before,
                "status_after": status_after,
                "llm_reasoning": llm_reasoning,
                "original_content": original_content,
                "created_at": datetime.now().isoformat(),
            }
        ).execute()
    except Exception as e:
        print("Error saving email memory:", e)


def delete_lead_memory(lead_id) -> None:
    """Delete all memory entries for a disqualified lead."""
    try:
        supabase.table("email_memory").delete().eq("lead_id", lead_id).execute()
        print(f"🗑️  Deleted memory for lead_id={lead_id}")
    except Exception as e:
        print("Error deleting lead memory:", e)


def get_email_memory(lead_id, limit: int = 6) -> list:
    """Fetch last N memory entries for a lead (for LLM context)."""
    try:
        response = (
            supabase.table("email_memory")
            .select("direction, summary, status_after, created_at")
            .eq("lead_id", lead_id)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception as e:
        print("Error fetching email memory:", e)
        return []


# ─────────────────────────────────────────────
# PRODUCTS
# ─────────────────────────────────────────────


def get_products(user_email: str = None) -> list:
    """Fetch products for a specific user."""
    try:
        query = supabase.table("products").select(
            "id, name, description, category, base_price"
        )
        if user_email:
            query = query.eq("user_email", user_email)
        return query.execute().data or []
    except Exception as e:
        print("Error fetching products:", e)
        return []


# ─────────────────────────────────────────────
# DEAL CREATION (from promoted lead)
# ─────────────────────────────────────────────


def create_deal(
    user_email: str,
    contact_email: str,
    contact_name: str,
    contact_number: str,
    deal_title: str,
    product_names: list,
    estimated_value: str,
    status: str = "New",
) -> dict:
    """Create a new Deal record when a lead is promoted."""
    try:
        timestamp = datetime.now().isoformat()
        value = None
        try:
            value = (
                float(estimated_value.replace(",", "").replace("$", ""))
                if estimated_value
                else None
            )
        except Exception:
            value = None

        data = {
            "user_email": user_email,
            "email": contact_email,
            "name": contact_name or contact_email,
            "number": contact_number,
            "title": deal_title or "New Deal",
            "products": product_names,
            "value": value,
            "status": status,
            "source": "Email",
            "priority": "Medium",
            "created_at": timestamp,
            "closeDate": timestamp,
        }
        response = supabase.table("Deals").insert(data).execute()
        print(f"🤝 Deal created for {contact_email}")
        return response.data[0] if response.data else {}
    except Exception as e:
        print(f"Error creating deal: {e}")
        return {}


def get_deal_by_email(user_email: str, contact_email: str) -> dict:
    """Check if a deal already exists for this contact."""
    try:
        response = (
            supabase.table("Deals")
            .select("id, status, name, number")
            .eq("user_email", user_email)
            .eq("email", contact_email)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error fetching deal: {e}")
        return None


# ====================== SIMPLE FUNCTIONS FOR DASHBOARD ======================


def get_leads(user_email=None):
    """Get all leads for dashboard (or for specific user)"""
    try:
        query = supabase.table("Leads").select("*")
        if user_email:
            query = query.eq("user_email", user_email)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        print("Error fetching leads:", e)
        return []


def get_deals(user_email=None):
    """Get all deals"""
    try:
        query = supabase.table("Deals").select("*")
        if user_email:
            query = query.eq("user_email", user_email)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        print("Error fetching deals:", e)
        return []


def get_customers(user_email=None):
    """Get all customers"""
    try:
        query = supabase.table("Customers").select("*")
        if user_email:
            query = query.eq("user_email", user_email)
        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        print("Error fetching customers:", e)
        return []


# import os
# from supabase import create_client
# from dotenv import load_dotenv
# from datetime import datetime

# load_dotenv()

# url = os.environ.get("SUPABASE_URL")
# key = os.environ.get("SUPABASE_KEY")
# supabase = create_client(url, key)

# def get_users():
#     return [get_user_by_email("kikuu737@gmail.com")]
#     # """Fetch all users from the database.
#     # Returns:
#     #     list: A list of users with their details.
#     # """
#     # try:
#     #     response = supabase.table("Users").select("*").execute()
#     #     return response.data
#     # except Exception as e:
#     #     print(e)
#     #     return []

# def get_user_by_email(email):
#     response = supabase.table("Users").select("*").eq("email", email).execute()
#     return response.data[0] if response.data else None

# def addLeads(email, message, status, user_email, content= None, type="customer"):
#     try:
#         existing = supabase.table("Leads").select("*") \
#             .eq("user_email", user_email).eq("email", email).execute()

#         timestamp_str = datetime.now().isoformat()

#         if existing.data:
#             updated_messages = existing.data[0].get("messages", []) + [{
#                 "message": message,
#                 "type": type,
#                 "timestamp": timestamp_str
#             }]

#             lead_id = existing.data[0]["id"]
#             supabase.table("Leads").update({
#                 "messages": updated_messages,
#                 "status": status,
#             }).eq("id", lead_id).execute()

#             return "updated", 200

#         else:
#             data = [{
#                 "email": email,
#                 "messages": [{
#                     "message": message,
#                     "type": type,
#                     "timestamp": timestamp_str
#                 }],
#                 "status": status,
#                 "user_email": user_email,
#                 "name": content["name"],
#                 "number": content["number"] or None,
#                 "age": content["age"] or None,
#                 "linkedIn": content["linkedIn"] or None,
#                 "industry": content["industry"] or None,
#                 "company": content["company"] or None,
#                 "income": content["income"] or None,
#                 "website": content["website"] or None,
#                 "address": content["address"] or None,
#                 "description": content["description"] or None,
#                 "source": "Email",
#             }]
#             supabase.table("Leads").insert(data).execute()
#             return "created", 201

#     except Exception as e:
#         print("Error adding Leads:", e)
#         return {"error": str(e)}, 500

# def get_lead_with_email(user_email, email):
#     try:
#         response = supabase.table("Leads").select("*").eq("email", email).eq("user_email", user_email).execute()
#         if response.data:
#             return response.data[0]
#         return None
#     except Exception as e:
#         print("Error fetching lead:", e)
#         return None

# def get_leads(user_email):
#     try:
#         response = supabase.table("Leads").select("*").eq("user_email", user_email).execute()
#         return response.data if response.data else []
#     except Exception as e:
#         print("Error fetching Leads:", e)
#         return []
