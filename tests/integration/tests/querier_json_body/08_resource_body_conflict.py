import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_raw_query,
    get_rows,
    make_query_request,
)


def test_resource_body_conflict(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # python's body carries service.name, making the bare key ambiguous across
    # resource and body; java's body omits it, so ANDing body in would drop it.
    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "java"},
            body_v2=json.dumps({"msg": "hello"}),
            body_promoted="",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "python"},
            body_v2=json.dumps({"service.name": "python"}),
            body_promoted="",
        ),
    ]
    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    cases = [
        {
            "name": "bare_key_resolves_to_resource",
            "filter": "service.name = 'java'",
            "expected_service_names": ["java"],
            "expect_resource_warning": True,
        },
        {
            "name": "qualified_body_key_targets_body",
            "filter": "body.service.name = 'python'",
            "expected_service_names": ["python"],
            "expect_resource_warning": False,
        },
    ]

    for case in cases:
        response = make_query_request(
            signoz,
            token,
            start_ms,
            end_ms,
            request_type="raw",
            queries=[
                build_raw_query(
                    name="A",
                    signal="logs",
                    filter_expression=case["filter"],
                    limit=100,
                    step_interval=60,
                )
            ],
        )

        assert response.status_code == HTTPStatus.OK, f"{case['name']}: {response.text}"
        rows = get_rows(response)
        assert [row["data"]["resources_string"].get("service.name") for row in rows] == case["expected_service_names"], f"{case['name']}: {response.json()}"

        warning = response.json()["data"].get("warning")
        if case["expect_resource_warning"]:
            assert warning is not None and "Using `resource` context by default" in warning["warnings"][0]["message"], f"{case['name']}: {warning}"
        else:
            assert warning is None, f"{case['name']}: {warning}"
