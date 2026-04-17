import base64
import re
import time
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv

from config import (
    DEAL_PROMOTABLE_STATUSES,
    DEAL_DEAD_STATUSES,
    DEFAULT_STATUS,
    FIRST_REPLY_STATUS,
    safe_transition,
    get_valid_next_statuses,
    is_terminal,
)
from database import (
    get_entity_by_email,
    upsert_entity,
    update_entity_status,
    save_email_memory,
    get_email_memory,
    delete_lead_memory,
    get_products,
    create_deal,
    get_deal_by_email,
)
from lead import (
    screen_sender,
    analyze_new_email,
    analyze_existing_lead,
    format_products,
    format_conversation_history,
)
from response_leads import send_email  # ← this will call the nice reply

load_dotenv()

JUNK_KEYWORDS = [
    "newsletter",
    "no-reply",
    "noreply",
    "jobs",
    "webinar",
    "unsubscribe",
    "notification",
    "alert",
    "glassdoor",
    "linkedin",
    "simplilearn",
]


def decode_subject(subject_header: str) -> str:
    from email.header import decode_header

    subject, encoding = decode_header(subject_header)[0]
    if isinstance(subject, bytes):
        subject = subject.decode(encoding or "utf-8", errors="ignore")
    return subject


def clean_email_body(body: str, assistant_email: str) -> str:
    reply_delimiters = [r"On\s+.*?\s+wrote:", r"From:\s+.*", r"---.*---"]
    for delimiter in reply_delimiters:
        body = re.split(delimiter, body, flags=re.IGNORECASE | re.MULTILINE)[0]
    body_lines = [line for line in body.splitlines() if not line.startswith(">")]
    body = "\n".join(body_lines).strip()
    if assistant_email.lower() in body.lower():
        body = body[: body.lower().index(assistant_email.lower())].strip()
    return body


def is_junk(email_data: dict) -> bool:
    sender = (email_data.get("from") or "").lower()
    subject = (email_data.get("subject") or "").lower()
    return any(k in sender for k in JUNK_KEYWORDS) or any(
        k in subject for k in JUNK_KEYWORDS
    )

def fetch_unseen_emails(service, assistant_email: str) -> list:
    """
    Fetch ALL unread and read emails, sorted by newest first.
    Limit to 6 valid emails.
    """
    results = (
        service.users()
        .messages()
        .list(
            userId="me",
            labelIds=["INBOX"],
            maxResults=50,  # Fetch a larger batch to account for skipped emails
        )
        .execute()
    )

    messages = results.get("messages", [])

    new_messages = []

    for msg in messages:  # Gmail already returns newest → oldest
        if len(new_messages) >= 6:
            break
            
        m = service.users().messages().get(userId="me", id=msg["id"]).execute()
        headers = m["payload"].get("headers", [])

        sender = next((h["value"] for h in headers if h["name"] == "From"), None)
        subject = decode_subject(
            next((h["value"] for h in headers if h["name"] == "Subject"), "")
        )

        if assistant_email.lower() in (sender or "").lower():
            continue

        # Extract body
        body = ""
        if "parts" in m["payload"]:
            for part in m["payload"]["parts"]:
                if part["mimeType"] == "text/plain":
                    body = base64.urlsafe_b64decode(part["body"]["data"]).decode(
                        "utf-8", errors="ignore"
                    )
                    break
        elif m["payload"].get("body", {}).get("data"):
            body = base64.urlsafe_b64decode(m["payload"]["body"]["data"]).decode(
                "utf-8", errors="ignore"
            )

        body = clean_email_body(body, assistant_email)

        if body.strip():
            new_messages.append(
                {
                    "subject": subject,
                    "body": body,
                    "from": sender,
                }
            )

        # Mark as read so it doesn't come again
        service.users().messages().modify(
            userId="me", id=msg["id"], body={"removeLabelIds": ["UNREAD"]}
        ).execute()

    print(f"📬 Found {len(new_messages)} new email(s) to process (newest first)")
    return new_messages


# def fetch_unseen_emails(service, assistant_email: str) -> list:
#     results = (
#         service.users()
#         .messages()
#         .list(userId="me", labelIds=["INBOX"], q="is:unread")
#         .execute()
#     )
#     messages = results.get("messages", [])[:15]

#     new_messages = []
#     for msg in messages:
#         m = service.users().messages().get(userId="me", id=msg["id"]).execute()
#         headers = m["payload"].get("headers", [])

#         sender = next((h["value"] for h in headers if h["name"] == "From"), None)
#         subject = decode_subject(
#             next((h["value"] for h in headers if h["name"] == "Subject"), "")
#         )

#         if assistant_email.lower() in (sender or "").lower():
#             continue

#         body = ""
#         if "parts" in m["payload"]:
#             for part in m["payload"]["parts"]:
#                 if part["mimeType"] == "text/plain":
#                     body = base64.urlsafe_b64decode(part["body"]["data"]).decode(
#                         "utf-8", errors="ignore"
#                     )
#                     break
#         elif m["payload"].get("body", {}).get("data"):
#             body = base64.urlsafe_b64decode(m["payload"]["body"]["data"]).decode(
#                 "utf-8", errors="ignore"
#             )

#         body = clean_email_body(body, assistant_email)

#         if body.strip():
#             new_messages.append({"subject": subject, "body": body, "from": sender})

#         service.users().messages().modify(
#             userId="me", id=msg["id"], body={"removeLabelIds": ["UNREAD"]}
#         ).execute()

#     return new_messages


def process_email(email_data: dict, user: dict, entity_type: str = "lead"):
    user_email = user["email"]
    contact_email = email_data["from"]
    email_content = f"Subject: {email_data['subject']}\nBody: {email_data['body']}"
    refresh_token = user["refresh_token"]

    products = get_products(user_email)
    products_str = format_products(products)
    company_desc = user.get("companyDescription", "")

    print(f"\n{'='*70}")
    print(f"📩 Processing {entity_type.upper()} | From: {contact_email}")
    print(f"📌 Subject: {email_data['subject']}")
    print(f"{'='*70}")

    existing = get_entity_by_email(entity_type, user_email, contact_email)

    if existing:
        current_status = existing.get("status", DEFAULT_STATUS[entity_type])
        entity_id = existing.get("id")

        if is_terminal(entity_type, current_status):
            print(
                f"🔒 Terminal status [{current_status}] — respecting human decision (no back-push)"
            )
            return

        print(f"🔁 Existing {entity_type} | Status: {current_status}")

        memories = get_email_memory(entity_id)
        history = format_conversation_history(memories)
        valid_next = get_valid_next_statuses(entity_type, current_status)

        result = analyze_existing_lead(
            email_content=email_content,
            description=company_desc,
            products=products_str,
            conversation_history=history,
            current_status=current_status,
            valid_next_statuses=valid_next,
        )

        if not result:
            return

        new_status = safe_transition(entity_type, current_status, result["next_status"])

        upsert_entity(
            entity_type=entity_type,
            contact_email=contact_email,
            message=email_data["body"],
            status=new_status,
            user_email=user_email,
            direction="inbound",
        )

        save_email_memory(
            lead_id=entity_id,
            lead_email=contact_email,
            user_email=user_email,
            direction="inbound",
            summary=result["summary"],
            status_before=current_status,
            status_after=new_status,
            llm_reasoning=result["reasoning"],
            original_content=email_data["body"],
        )

        # Send reply using response_leads
        sent = send_email(
            refresh_token=refresh_token,
            to_email=contact_email,
            subject=f"Re: {email_data['subject']}",
            body=result["reply_text"],
            sender_email=user_email,
        )

        if sent:
            save_email_memory(
                lead_id=entity_id,
                lead_email=contact_email,
                user_email=user_email,
                direction="outbound",
                summary=f"We replied: {result['reply_text'][:120]}...",
                status_before=new_status,
                status_after=new_status,
                llm_reasoning="Outbound reply sent",
            )

        print(f"✅ Status: {current_status} → {new_status}")

        if entity_type == "lead" and new_status in DEAL_PROMOTABLE_STATUSES:
            try_promote_to_deal(
                existing,
                email_content,
                products_str,
                user_email,
                contact_email,
                entity_id,
                new_status,
            )

        if new_status in DEAL_DEAD_STATUSES:
            delete_lead_memory(entity_id)

    else:
        # New contact
        screen = screen_sender(
            sender=email_data["from"],
            subject=email_data["subject"],
            body=email_data["body"],
        )
        if not screen or not screen.get("is_human"):
            print("🚫 Not a human — skipping")
            return

        result = analyze_new_email(
            email_content=email_content,
            description=company_desc,
            products=products_str,
        )

        if not result or not result.get("is_lead"):
            print("❌ Not a valid lead")
            return

        initial_status = DEFAULT_STATUS[entity_type]
        after_reply_status = FIRST_REPLY_STATUS[entity_type]

        upsert_entity(
            entity_type=entity_type,
            contact_email=contact_email,
            message=email_data["body"],
            status=initial_status,
            user_email=user_email,
            content=result.get("extracted_content"),
            direction="inbound",
        )

        new_entity = get_entity_by_email(entity_type, user_email, contact_email)
        entity_id = new_entity["id"] if new_entity else None

        save_email_memory(
            lead_id=entity_id,
            lead_email=contact_email,
            user_email=user_email,
            direction="inbound",
            summary=result["summary"],
            status_before=initial_status,
            status_after=initial_status,
            llm_reasoning=result["reasoning"],
            original_content=email_data["body"],
        )

        sent = send_email(
            refresh_token=refresh_token,
            to_email=contact_email,
            subject=f"Re: {email_data['subject']}",
            body=result["reply_text"],
            sender_email=user_email,
        )

        if sent:
            update_entity_status(
                entity_type, contact_email, user_email, after_reply_status
            )
            save_email_memory(
                lead_id=entity_id,
                lead_email=contact_email,
                user_email=user_email,
                direction="outbound",
                summary=f"We replied: {result['reply_text'][:120]}...",
                status_before=initial_status,
                status_after=after_reply_status,
                llm_reasoning="First outbound reply sent",
            )
            print(f"✅ New {entity_type} created → {after_reply_status}")


def monitor_emails(refresh_token, client_id, client_secret, user):
    """Main entry point called by scheduler"""
    creds = Credentials(
        None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://mail.google.com/"],
    )
    service = build("gmail", "v1", credentials=creds)
    new_emails = fetch_unseen_emails(service, user["email"])

    if not new_emails:
        print("📭 No new emails")
        return

    for i, email_data in enumerate(new_emails, 1):
        print(f"\n── Email {i}/{len(new_emails)} ──")
        if is_junk(email_data):
            print("🚫 Junk — skipping")
            continue

        process_email(email_data, user, entity_type="lead")
        time.sleep(1.2)


def try_promote_to_deal(
    existing: dict,
    email_content: str,
    products_str: str,
    user_email: str,
    contact_email: str,
    entity_id,
    current_status: str,
):
    from lead import check_deal_promotion
    from database import get_email_memory

    existing_deal = get_deal_by_email(user_email, contact_email)
    if existing_deal:
        print(f"ℹ️ Deal already exists — skipping promotion")
        return False

    memories = get_email_memory(entity_id)
    history = format_conversation_history(memories)

    promo = check_deal_promotion(
        email_content=email_content,
        products=products_str,
        conversation_history=history,
    )

    if not promo or not promo.get("should_promote"):
        return False

    print(f"🚀 Promoting lead → Deal! Products: {promo['product_names']}")

    create_deal(
        user_email=user_email,
        contact_email=contact_email,
        contact_name=existing.get("name", ""),
        contact_number=existing.get("number", ""),
        deal_title=promo.get("deal_title", "New Deal"),
        product_names=promo.get("product_names", []),
        estimated_value=promo.get("estimated_value", ""),
        status="New",
    )

    update_entity_status("lead", contact_email, user_email, "Qualified")
    print(f"✅ Lead marked Qualified → Deal created")
    return True


# import base64
# import re
# from googleapiclient.discovery import build
# from google.oauth2.credentials import Credentials
# from dotenv import load_dotenv
# from lead import analyze_email
# from database import addLeads, get_lead_with_email
# from response_leads import response_leads
# from langchain.output_parsers import StructuredOutputParser, ResponseSchema

# load_dotenv()


# def decode_subject(subject_header):
#     from email.header import decode_header

#     subject, encoding = decode_header(subject_header)[0]
#     if isinstance(subject, bytes):
#         subject = subject.decode(encoding or "utf-8", errors="ignore")
#     return subject


# def clean_email_body(body, assistant_email):
#     reply_delimiters = [r"On\s+.*?\s+wrote:", r"From:\s+.*", r"---.*---", r">.*"]

#     for delimiter in reply_delimiters:
#         body = re.split(delimiter, body, flags=re.IGNORECASE | re.MULTILINE)[0]

#     body_lines = [line for line in body.splitlines() if not line.startswith(">")]
#     body = "\n".join(body_lines).strip()

#     if assistant_email.lower() in body.lower():
#         body = body[: body.lower().index(assistant_email.lower())].strip()

#     return body


# def is_junk(email_data):
#     sender = (email_data.get("from") or "").lower()
#     subject = (email_data.get("subject") or "").lower()

#     junk_keywords = [
#         "newsletter",
#         "no-reply",
#         "noreply",
#         "jobs",
#         "webinar",
#         "unsubscribe",
#         "notification",
#         "alert",
#         "glassdoor",
#         "linkedin",
#         "simplilearn",
#     ]

#     if any(k in sender for k in junk_keywords):
#         return True
#     if any(k in subject for k in junk_keywords):
#         return True

#     return False


# def fetch_unseen_emails(service, assistant_email):
#     results = (
#         service.users()
#         .messages()
#         .list(userId="me", labelIds=["INBOX"], q="is:unread")
#         .execute()
#     )
#     messages = results.get("messages", [])[:5]

#     new_messages = []

#     for msg in messages:
#         m = service.users().messages().get(userId="me", id=msg["id"]).execute()

#         headers = m["payload"].get("headers", [])
#         sender = next((h["value"] for h in headers if h["name"] == "From"), None)
#         subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")
#         subject = decode_subject(subject)

#         if assistant_email.lower() in (sender or "").lower():
#             continue

#         body = ""
#         if "parts" in m["payload"]:
#             for part in m["payload"]["parts"]:
#                 if part["mimeType"] == "text/plain":
#                     body = base64.urlsafe_b64decode(part["body"]["data"]).decode(
#                         "utf-8", errors="ignore"
#                     )
#                     body = clean_email_body(body, assistant_email)
#                     break
#         else:
#             body = base64.urlsafe_b64decode(m["payload"]["body"]["data"]).decode(
#                 "utf-8", errors="ignore"
#             )
#             body = clean_email_body(body, assistant_email)

#         if body.strip():
#             new_messages.append({"subject": subject, "body": body, "from": sender})

#         service.users().messages().modify(
#             userId="me", id=msg["id"], body={"removeLabelIds": ["UNREAD"]}
#         ).execute()

#     return new_messages


# def formatProduct(product):
#     out = ""
#     for i, p in enumerate(product):
#         out += f"Product {i}) {p['name']} : {p['description']}\n"
#     return out


# def monitor_emails(refresh_token, client_id, client_secret, user):
#     """
#     Monitor unseen emails using Gmail API (OAuth2).
#     Args:
#         refresh_token (str): Refresh token from OAuth2 flow.
#         client_id (str): Google OAuth2 Client ID.
#         client_secret (str): Google OAuth2 Client Secret.
#         user (dict): User info.
#     """
#     creds = Credentials(
#         None,
#         refresh_token=refresh_token,
#         client_id=client_id,
#         client_secret=client_secret,
#         token_uri="https://oauth2.googleapis.com/token",
#         scopes=["https://mail.google.com/"],
#     )

#     service = build("gmail", "v1", credentials=creds)
#     new_emails = fetch_unseen_emails(service, user["email"])

#     import time

#     for i, email_data in enumerate(new_emails, start=1):

#         print("\n==============================")
#         print(f"📩 Email #{i}")
#         print(f"From: {email_data['from']}")
#         print(f"Subject: {email_data['subject']}")
#         print("==============================")

#         # 🚫 STEP 1: Skip junk emails
#         if is_junk(email_data):
#             print("🚫 Skipping junk email")
#             continue

#         # 🔁 STEP 2: Check existing lead
#         user_lead = get_lead_with_email(user["email"], email=email_data["from"])

#         if user_lead:
#             print("🔁 Existing lead → updating")

#             addLeads(
#                 email=email_data["from"],
#                 message=email_data["body"],
#                 status="Contacted",
#                 user_email=user["email"],
#             )

#             response_leads(refresh_token)
#             continue

#         # 🧠 STEP 3: Run LLM (LIMITED)
#         if i > 3:
#             print("⛔ Skipping remaining emails (quota protection)")
#             break

#         print("🧠 Running LLM analysis...")

#         try:
#             result = analyze_email(
#                 f"Subject: {email_data['subject']}\nBody: {email_data['body']}",
#                 user["companyDescription"],
#                 formatProduct(user["products"]),
#             )
#         except Exception as e:
#             print("LLM Error:", e)
#             continue

#         if not result:
#             print("⚠️ LLM failed → skipping")
#             continue

#         print("LLM RESULT →")
#         print("Is Lead:", result.get("is_lead"))
#         print("Confidence:", result.get("confidence"))

#         if result.get("is_lead"):
#             print("✅ Lead detected → saving")

#             addLeads(
#                 email=email_data["from"],
#                 message=email_data["body"],
#                 status="New",
#                 user_email=user["email"],
#                 content=result.get("extracted_content", {}),
#             )

#             response_leads(refresh_token)
#         else:
#             print("❌ Not a lead")

#         time.sleep(1)


# # result = analyze_email(
# #     f"Subject: {email_data['subject']}\nBody: {email_data['body']}",
# #     user['companyDescription'],
# #     formatProduct(user['products'])
# # )


# # for email_data in new_emails:
# #     print(f"New email from {email_data['from']}")

# #     user_lead = get_lead_with_email(user['email'], email=email_data['from'])
# #     if user_lead:
# #         addLeads(
# #             email=email_data['from'],
# #             message=email_data['body'],
# #             status="Contacted",
# #             user_email=user['email']
# #         )
# #         response_leads(refresh_token)
# #         print("User lead found.")
# #     else:
# #         result = analyze_email(f"Subject: {email_data['subject']}\nBody: {email_data['body']}", user['companyDescription'], formatProduct(user['products']))
# #         if result["is_lead"]:
# #             addLeads(
# #                 email=email_data['from'],
# #                 message=email_data['body'],
# #                 status="New",
# #                 user_email=user['email'],
# #                 content=result["extracted_content"]
# #             )
# #             response_leads(refresh_token)
