import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import RequestType, build_raw_query, get_rows, make_query_request

SERVICE = "scalar-object-body"


def test_scalar_and_object_body_key_collapses(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """A log body key stored as both a scalar and an object (db.function and db.function.arg) keeps
    only one: the body is returned nested, not flattened to dotted keys, so it cannot hold both."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": SERVICE},
            body_v2=json.dumps({"db.function": "refresh", "db.function.arg": 2}),
            body_promoted="",
        ),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", limit=10, filter_expression=f"service.name = '{SERVICE}'")],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = get_rows(response)
    assert len(rows) == 1
    body = rows[0]["data"]["body"]
    # The scalar survives as a string; the sibling object path db.function.arg is not preserved
    # under it, so db.function is a plain value rather than an object.
    assert body["db"]["function"] == "refresh"
    assert isinstance(body["db"]["function"], str)
