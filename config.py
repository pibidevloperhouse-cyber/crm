# config.py

STATUS_TRANSITIONS = {
    "lead": {
        "New": ["InProgress", "Contact Attempted", "NotQualified"],
        "InProgress": ["Contact Attempted", "NotQualified"],
        "Contact Attempted": ["Contacted", "NotQualified"],
        "Contacted": ["Meeting Booked", "Qualified", "NotQualified"],
        "Meeting Booked": ["Qualified", "NotQualified"],
        "Qualified": [],  # terminal → promote to Deal
        "NotQualified": [],  # terminal → delete memory
    },
    "deal": {
        "New": ["Proposal Sent", "On Hold", "Abandoned"],
        "Proposal Sent": ["Negotiation", "Contract Sent", "On Hold", "Abandoned"],
        "Negotiation": ["Contract Sent", "Closed-won", "Closed-lost", "On Hold"],
        "Contract Sent": ["Closed-won", "Closed-lost"],
        "On Hold": ["Proposal Sent", "Negotiation", "Abandoned"],
        "Closed-won": [],  # terminal
        "Closed-lost": [],  # terminal
        "Abandoned": [],  # terminal
    },
    "customer": {
        "Active": ["Churned", "Upsell"],
        "Upsell": ["Active", "Churned"],
        "Churned": ["Active"],
    },
}

DEFAULT_STATUS = {
    "lead": "New",
    "deal": "New",
    "customer": "Active",
}

FIRST_REPLY_STATUS = {
    "lead": "Contact Attempted",
    "deal": "Proposal Sent",
    "customer": "Active",
}

ENTITY_TABLES = {
    "lead": "Leads",
    "deal": "Deals",
    "customer": "Customers",
}

# Lead statuses that can trigger deal promotion if LLM detects product interest
DEAL_PROMOTABLE_STATUSES = ["Contacted", "Meeting Booked", "Qualified"]

# Deal disqualified terminal statuses → clean memory
DEAL_DEAD_STATUSES = ["Closed-lost", "Abandoned"]


def get_valid_next_statuses(entity_type: str, current_status: str) -> list:
    return STATUS_TRANSITIONS.get(entity_type, {}).get(current_status, [])


def safe_transition(entity_type: str, current_status: str, proposed_status: str) -> str:
    valid = get_valid_next_statuses(entity_type, current_status)
    if proposed_status in valid:
        return proposed_status
    print(
        f"⚠️  Invalid transition [{entity_type}]: {current_status} → {proposed_status}. Keeping {current_status}"
    )
    return current_status


def is_terminal(entity_type: str, status: str) -> bool:
    return get_valid_next_statuses(entity_type, status) == []
