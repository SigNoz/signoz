import uuid
from http import HTTPStatus
from typing import Callable

import pytest
import requests
from sqlalchemy import sql
from sqlalchemy.exc import IntegrityError

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import SigNoz

UNIQUE_INDEX_USER_EMAIL = "useruniqueindex@integration.test"


def test_unique_index_allows_multiple_deleted_rows(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
):
    """
    Verify that the partial unique index on (email, org_id) WHERE status != 'deleted'
    allows multiple deleted rows for the same (org_id, email) while still enforcing
    uniqueness among non-deleted rows.

    The partial unique index only covers rows where status != 'deleted', so active
    users cannot share the same (org_id, email). Deleted users are excluded from
    the index, allowing multiple deleted rows for the same (org_id, email).

    Steps:
    1. Invite and soft-delete a user via the API (first deleted row).
    2. Re-invite and soft-delete the same email via the API (second deleted row).
    3. Assert via SQL that exactly two deleted rows exist for the email.
    4. Assert via SQL that inserting one active row succeeds (no conflict — only
       deleted rows exist), then inserting a second active row for the same
       (org_id, email) fails with a unique constraint error.
    5. Assert via SQL that inserting a third deleted row for the same (org_id, email)
       succeeds — confirming the index does not cover deleted rows.
    6. Assert via SQL that the final count of deleted rows is 3.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Step 1: invite and delete the first user
    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={
            "email": UNIQUE_INDEX_USER_EMAIL,
            "role": "EDITOR",
            "name": "unique index user v1",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    first_user_id = resp.json()["data"]["id"]

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/user/{first_user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT

    # Step 2: re-invite and delete the same email (second deleted row)
    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={
            "email": UNIQUE_INDEX_USER_EMAIL,
            "role": "EDITOR",
            "name": "unique index user v2",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    second_user_id = resp.json()["data"]["id"]
    assert second_user_id != first_user_id

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/user/{second_user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT

    # Step 3: assert the DB has exactly two deleted rows for this email
    with signoz.sqlstore.conn.connect() as conn:
        result = conn.execute(
            sql.text(
                "SELECT id FROM users WHERE email = :email AND status = 'deleted'"
            ),
            {"email": UNIQUE_INDEX_USER_EMAIL},
        )
        deleted_rows = result.fetchall()

    assert (
        len(deleted_rows) == 2
    ), f"expected 2 deleted rows for {UNIQUE_INDEX_USER_EMAIL}, got {len(deleted_rows)}"
    deleted_ids = {row[0] for row in deleted_rows}
    assert first_user_id in deleted_ids
    assert second_user_id in deleted_ids

    # Retrieve org_id for the direct SQL inserts below
    with signoz.sqlstore.conn.connect() as conn:
        result = conn.execute(
            sql.text("SELECT org_id FROM users WHERE id = :id"),
            {"id": first_user_id},
        )
        org_id = result.fetchone()[0]

    # Step 4: the unique index must still block a duplicate non-deleted row.
    # The partial unique index covers rows WHERE status != 'deleted', so two active
    # rows with the same (org_id, email) must conflict.
    # First insert must succeed (only deleted rows exist so far).
    # Second insert for the same (org_id, email) with status='active' must fail.
    active_id = str(uuid.uuid4())
    with signoz.sqlstore.conn.connect() as conn:
        conn.execute(
            sql.text(
                "INSERT INTO users"
                " (id, display_name, email, org_id, is_root, status, created_at, updated_at)"
                " VALUES (:id, :display_name, :email, :org_id,"
                "         false, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "id": active_id,
                "display_name": "first active row",
                "email": UNIQUE_INDEX_USER_EMAIL,
                "org_id": org_id,
            },
        )
        conn.commit()

    with signoz.sqlstore.conn.connect() as conn:
        with pytest.raises(IntegrityError):
            conn.execute(
                sql.text(
                    "INSERT INTO users"
                    " (id, display_name, email, org_id, is_root, status, created_at, updated_at)"
                    " VALUES (:id, :display_name, :email, :org_id,"
                    "         false, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "display_name": "should violate index",
                    "email": UNIQUE_INDEX_USER_EMAIL,
                    "org_id": org_id,
                },
            )

    # Step 5: a third deleted row must be accepted (excluded from partial index)
    with signoz.sqlstore.conn.connect() as conn:
        conn.execute(
            sql.text(
                "INSERT INTO users"
                " (id, display_name, email, org_id, is_root, status, created_at, updated_at)"
                " VALUES (:id, :display_name, :email, :org_id,"
                "         false, 'deleted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ),
            {
                "id": str(uuid.uuid4()),
                "display_name": "third deleted row",
                "email": UNIQUE_INDEX_USER_EMAIL,
                "org_id": org_id,
            },
        )
        conn.commit()

    # Step 6: confirm three deleted rows now exist
    with signoz.sqlstore.conn.connect() as conn:
        result = conn.execute(
            sql.text(
                "SELECT COUNT(*) FROM users"
                " WHERE email = :email AND status = 'deleted'"
            ),
            {"email": UNIQUE_INDEX_USER_EMAIL},
        )
        count = result.fetchone()[0]

    assert count == 3, f"expected 3 deleted rows after direct insert, got {count}"
