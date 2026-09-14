"""
tools.py - Tools available to the Worker Agent.
Some succeed, some fail randomly. This is intentional.
Real AI agents hit real failures — timeouts, bad data, rate limits.
We simulate all of them so the Overmind has real problems to solve.
"""
import time
import random


def fetch_user_data(user_id: str) -> str:
    """Fetch user data from the database. Fails if user_id requests invalid/timeout user."""
    time.sleep(0.3)  # simulate network latency

    if "error" in user_id.lower() or "timeout" in user_id.lower() or user_id == "user_999":
        raise TimeoutError(f"Database timeout: connection to users_db timed out after 5000ms while fetching user '{user_id}'")

    return f"User '{user_id}': active account, 5 open tickets, last login 2h ago, plan=enterprise"


def search_knowledge_base(query: str) -> str:
    """Search internal docs. Fails if query contains unavailable resources."""
    time.sleep(0.3)

    if "broken" in query.lower() or "unavailable" in query.lower() or "503" in query:
        raise ConnectionError(f"Knowledge base search API returned 503: service temporarily unavailable for query '{query}'")

    return f"Found 3 relevant docs for '{query}': [KB-1042: Billing FAQ, KB-2091: Refund Policy, KB-3001: Account Recovery]"


def calculate_billing(account_id: str) -> str:
    """Calculate billing for an account."""
    time.sleep(0.2)

    if "corrupt" in account_id.lower() or "invalid" in account_id.lower():
        return f"Account '{account_id}' billing: -$42.00 (credit balance: $-999.99)"

    return f"Account '{account_id}' billing: $149.00/month, next invoice: Aug 1, usage: 82% of quota"
