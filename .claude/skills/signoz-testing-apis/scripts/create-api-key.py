#!/usr/bin/env python3
"""Create a SigNoz API key directly in a local SQLite database.

Inserts the full chain needed for the SIGNOZ-API-KEY header to authenticate
and pass authorization:
  organizations row (if none) -> managed signoz-admin role (if none)
  -> service_account -> factor_api_key (plaintext) -> openfga tuple
  (role#assignee for the service account) + changelog row.

The SigNoz server must have been started at least once against this database
so the schema and the openfga store row exist. Safe to run while the server
is up; if you got a 403 right before creating the key, retry after a few
seconds (authorization checks are cached briefly).

Prints only the token to stdout (all messages go to stderr), so callers can
capture it or export it via the create-api-key.sh wrapper:
  source create-api-key.sh /path/to/signoz.db
"""

import secrets
import sqlite3
import sys
import time
import uuid


def fail(msg):
    sys.stderr.write(msg + "\n")
    sys.exit(1)


def main():
    if len(sys.argv) != 2:
        fail(f"usage: {sys.argv[0]} <path-to-signoz.db>")

    conn = sqlite3.connect(sys.argv[1])
    cur = conn.cursor()

    required = {"organizations", "role", "service_account", "factor_api_key", "store", "tuple", "changelog"}
    tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    missing = sorted(required - tables)
    if missing:
        fail(f"database is missing tables {missing}; start the SigNoz server once before running this script")

    row = cur.execute("SELECT id FROM store LIMIT 1").fetchone()
    if not row:
        fail("openfga store not initialized; start the SigNoz server once before running this script")
    store_id = row[0]

    now = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())

    # 1. organization (reuse the existing one if present)
    row = cur.execute("SELECT id FROM organizations LIMIT 1").fetchone()
    if row:
        org_id = row[0]
    else:
        org_id = str(uuid.uuid4())
        h = 2166136261  # fnv-1a 32, mirrors NewOrganizationKey
        for ch in org_id:
            h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
        cur.execute(
            "INSERT INTO organizations (id, created_at, updated_at, name, alias, key, display_name) VALUES (?,?,?,?,?,?,?)",
            (org_id, now, now, "", "", h, "default"),
        )

    # 2. managed admin role
    role_name = "signoz-admin"
    row = cur.execute("SELECT id FROM role WHERE org_id = ? AND name = ?", (org_id, role_name)).fetchone()
    if not row:
        cur.execute(
            "INSERT INTO role (id, created_at, updated_at, name, description, type, org_id) VALUES (?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), now, now, role_name, "Managed admin role", "managed", org_id),
        )

    # 3. service account
    suffix = secrets.token_hex(3)
    sa_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO service_account (id, created_at, updated_at, name, email, status, org_id) VALUES (?,?,?,?,?,?,?)",
        (sa_id, now, now, f"agent-{suffix}", f"agent-{suffix}@example.com", "active", org_id),
    )

    # 4. api key, stored in plaintext, never expires
    key = secrets.token_urlsafe(32)
    cur.execute(
        "INSERT INTO factor_api_key (id, created_at, updated_at, name, key, expires_at, last_observed_at, service_account_id) VALUES (?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), now, now, f"agent-{suffix}", key, 0, now, sa_id),
    )

    # 5. openfga tuple: service account is an assignee of the admin role
    enc = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # Crockford base32
    v = ((int(time.time() * 1000) & ((1 << 48) - 1)) << 80) | secrets.randbits(80)
    tuple_id = "".join(enc[(v >> (5 * i)) & 31] for i in range(25, -1, -1))

    obj = f"organization/{org_id}/role/{role_name}"
    user_obj = f"organization/{org_id}/serviceaccount/{sa_id}"
    cur.execute(
        "INSERT INTO tuple (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation, user_type, ulid, inserted_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (store_id, "role", obj, "assignee", "serviceaccount", user_obj, "", "user", tuple_id, now),
    )
    cur.execute(
        "INSERT INTO changelog (store, object_type, object_id, relation, user_object_type, user_object_id, user_relation, operation, ulid, inserted_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (store_id, "role", obj, "assignee", "serviceaccount", user_obj, "", 0, tuple_id, now),
    )

    conn.commit()
    print(key)


if __name__ == "__main__":
    main()
