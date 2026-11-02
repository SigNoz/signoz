from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import ATTRIBUTE_JSON_ROLLOUT_TIME, TraceIdGenerator, Traces, TracesKind


def test_waterfall_and_flamegraph_read_each_attribute_home(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    legacy_id, json_id, dual_id = (TraceIdGenerator.span_id() for _ in range(3))
    resources = {"service.name": "tracedetail-attribute-homes"}

    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=10), duration=timedelta(seconds=9), trace_id=trace_id, span_id=legacy_id, name="GET /legacy", kind=TracesKind.SPAN_KIND_SERVER, resources=resources, attributes={"http.route": "/legacy", "http.retry.count": 1, "cache.hit": True}, attribute_write_mode="legacy_only"),
            Traces(timestamp=now - timedelta(seconds=8), trace_id=trace_id, span_id=json_id, parent_span_id=legacy_id, name="db call", resources=resources, attributes={"http.route": "/json", "db.function": "node_refresh", "db.function.arg_count": 2}, attribute_write_mode="json_only"),
            Traces(timestamp=now - timedelta(seconds=6), trace_id=trace_id, span_id=dual_id, parent_span_id=legacy_id, name="GET /dual", resources=resources, attributes={"http.route": "/dual"}),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v4/traces/{trace_id}/waterfall"),
        json={"selectedSpanId": "", "uncollapsedSpans": []},
        headers=headers,
        timeout=10,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    waterfall = {span["span_id"]: span["attributes"] for span in response.json()["data"]["spans"]}
    assert waterfall[legacy_id] == {"http.route": "/legacy", "http.retry.count": 1, "cache.hit": True}
    # a key stored at both a scalar and an object path stays two flat keys
    assert waterfall[json_id] == {"http.route": "/json", "db.function": "node_refresh", "db.function.arg_count": 2}
    assert waterfall[dual_id] == {"http.route": "/dual"}

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v3/traces/{trace_id}/flamegraph"),
        json={
            "selectedSpanId": "",
            "selectFields": [
                {"name": "http.route", "fieldContext": "attribute"},
                {"name": "db.function.arg_count", "fieldContext": "attribute"},
                {"name": "service.name", "fieldContext": "resource"},
            ],
        },
        headers=headers,
        timeout=10,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    flamegraph = {span["spanId"]: span for level in response.json()["data"]["spans"] for span in level}
    assert flamegraph[legacy_id]["attributes"] == {"http.route": "/legacy"}
    assert flamegraph[json_id]["attributes"] == {"http.route": "/json", "db.function.arg_count": 2}
    assert flamegraph[dual_id]["attributes"] == {"http.route": "/dual"}
    assert all(span["resource"] == resources for span in flamegraph.values())
