import time
from collections.abc import Callable
from http import HTTPStatus

import requests
from sqlalchemy import sql

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def test_last_observed_at_is_flushed(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    """Verify the tokenizer GC persists the cached last observed at of a used token to the sql store."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK

    deadline = time.time() + 30
    while time.time() < deadline:
        with signoz.sqlstore.conn.connect() as conn:
            row = conn.execute(
                sql.text("SELECT last_observed_at FROM auth_token WHERE access_token = :access_token"),
                {"access_token": token},
            ).fetchone()

        if row is not None and row[0] is not None:
            return

        time.sleep(1)

    raise AssertionError("last_observed_at was not flushed to the sql store within 30s")
