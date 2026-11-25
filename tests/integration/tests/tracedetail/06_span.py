from collections.abc import Callable
from datetime import timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import get_attribute_backend_now
from fixtures.traces import TraceIdGenerator, Traces, TracesEvent, TracesKind, TracesLink, TracesRefType, TracesStatusCode


@pytest.mark.parametrize("attribute_backend", ["map", "json"])
def test_get_trace_span(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    attribute_backend: str,
) -> None:
    """Attributes are written to one layout only, so a read from the wrong column loses them."""
    now = get_attribute_backend_now(signoz, attribute_backend).replace(second=0, microsecond=0)
    write_mode = "json_only" if attribute_backend == "json" else "legacy_only"
    trace_id = TraceIdGenerator.trace_id()
    other_trace_id = TraceIdGenerator.trace_id()
    resources = {"service.name": f"td-span-{attribute_backend}", "k8s.pod.name": "orders-0"}
    root_id, target_id, plain_id, orphan_id, gone_id = (TraceIdGenerator.span_id() for _ in range(5))
    long_statement = "SELECT * FROM orders WHERE id IN (" + ", ".join(str(i) for i in range(2000)) + ")"
    start = now - timedelta(seconds=10)

    def span(span_id: str, parent_id: str, name: str, offset_ms: int, duration_ms: int, **kwargs) -> Traces:
        return Traces(timestamp=start + timedelta(milliseconds=offset_ms), duration=timedelta(milliseconds=duration_ms), trace_id=trace_id, span_id=span_id, parent_span_id=parent_id, name=name, resources=resources, attribute_write_mode=write_mode, **kwargs)

    # POST /orders          root, error, attribute http.route
    # ├─ query_orders       error "deadlock detected", 3 attributes (one is 12 KB), 1 event, a link to another trace
    # └─ fetch_page         no attributes, no events
    #
    # flush_metrics         its parent was never received; status 404
    insert_traces(
        [
            span(root_id, "", "POST /orders", 0, 2000, kind=TracesKind.SPAN_KIND_SERVER, status_code=TracesStatusCode.STATUS_CODE_ERROR, attributes={"http.route": "/orders"}),
            span(
                target_id,
                root_id,
                "query_orders",
                30,
                1000,
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_ERROR,
                status_message="deadlock detected",
                attributes={"db.system": "postgresql", "db.statement": long_statement, "db.rows": 42},
                events=[TracesEvent("retry", start, {"attempt": "2"})],
                links=[TracesLink(trace_id=other_trace_id, span_id="bbbbbbbbbbbbbbbb", ref_type=TracesRefType.REF_TYPE_FOLLOWS_FROM)],
            ),
            span(plain_id, root_id, "fetch_page", 1100, 8),
            span(orphan_id, gone_id, "flush_metrics", 1500, 100, attributes={"http.response.status_code": 404}),
        ]
    )

    spans_url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/spans")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}
    response = requests.get(f"{spans_url}/{target_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text

    # the response is the span itself: everything it stores, with no value cut
    assert response.json()["data"] == {
        "span_id": target_id,
        "trace_id": trace_id,
        "parent_span_id": root_id,
        "name": "query_orders",
        "kind_string": "Client",
        "time_unix": int(start.timestamp()) * 1_000 + 30,
        "duration_nano": 1_000_000_000,
        "has_error": True,
        "status_code_string": "STATUS_CODE_ERROR",
        "status_message": "deadlock detected",
        "response_status_code": "",
        "resource": resources,
        "attributes": {"db.system": "postgresql", "db.statement": long_statement, "db.rows": 42},
        "events": [{"name": "retry", "timeUnixNano": int(start.timestamp()) * 1_000_000_000, "attributeMap": {"attempt": "2"}}],
        "references": [{"traceId": trace_id, "spanId": root_id, "refType": "CHILD_OF"}, {"traceId": other_trace_id, "spanId": "bbbbbbbbbbbbbbbb", "refType": "FOLLOWS_FROM"}],
    }

    root = requests.get(f"{spans_url}/{root_id}", headers=headers, timeout=10).json()["data"]
    assert root["parent_span_id"] == ""
    assert root["kind_string"] == "Server"
    assert root["attributes"] == {"http.route": "/orders"}

    # a span that stores no attributes and no events returns them empty, not null
    plain = requests.get(f"{spans_url}/{plain_id}", headers=headers, timeout=10).json()["data"]
    assert plain["attributes"] == {}
    assert plain["events"] == []
    assert plain["resource"] == resources

    # a span whose parent was never received keeps the parent's id
    orphan = requests.get(f"{spans_url}/{orphan_id}", headers=headers, timeout=10).json()["data"]
    assert orphan["parent_span_id"] == gone_id
    assert orphan["response_status_code"] == "404"
    assert orphan["has_error"] is False

    unknown_span = requests.get(f"{spans_url}/{TraceIdGenerator.span_id()}", headers=headers, timeout=10)
    assert unknown_span.status_code == HTTPStatus.NOT_FOUND, unknown_span.text

    unknown_trace = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{TraceIdGenerator.trace_id()}/spans/{target_id}"), headers=headers, timeout=10)
    assert unknown_trace.status_code == HTTPStatus.NOT_FOUND, unknown_trace.text
