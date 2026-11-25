from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import get_attribute_backend_now
from fixtures.traces import TraceIdGenerator, Traces, TracesEvent, TracesKind, TracesLink, TracesRefType, TracesStatusCode

SPAN_LISTS = ("errorOrigins", "unmarkedFailures", "timeSpent", "aiUsage", "links")


@pytest.mark.parametrize("attribute_backend", ["map", "json"])
def test_trace_highlights(
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
    names = ("root", "place_order", "charge_card", "inventory_http", "inventory_grpc", "render", "notify", "consume", "model", "tool")
    ids = {name: TraceIdGenerator.span_id() for name in names}
    gateway, orders, agent = (f"td-highlights-{service}-{attribute_backend}" for service in ("gateway", "orders", "agent"))
    start = now - timedelta(seconds=10)

    def span(key: str, parent: str, name: str, service: str, offset_ms: int, duration_ms: int, **kwargs) -> Traces:
        return Traces(
            timestamp=start + timedelta(milliseconds=offset_ms),
            duration=timedelta(milliseconds=duration_ms),
            trace_id=trace_id,
            span_id=ids[key],
            parent_span_id=ids[parent] if parent else "",
            name=name,
            resources={"service.name": service, "k8s.pod.name": f"{service}-0"},
            attribute_write_mode=write_mode,
            **kwargs,
        )

    insert_traces(
        [
            span("root", "", "POST /checkout", gateway, 0, 1000, kind=TracesKind.SPAN_KIND_SERVER, status_code=TracesStatusCode.STATUS_CODE_ERROR, attributes={"http.response.status_code": 500}),
            # the error is carried up from charge_card through place_order to the root
            span("place_order", "root", "place_order", orders, 10, 600, status_code=TracesStatusCode.STATUS_CODE_ERROR),
            span("charge_card", "place_order", "charge_card", orders, 20, 300, kind=TracesKind.SPAN_KIND_CLIENT, status_code=TracesStatusCode.STATUS_CODE_ERROR, status_message="card declined", attributes={"payment.provider": "worldpay"}),
            # four failures that do not carry the error flag
            span("inventory_http", "place_order", "GET /inventory", orders, 330, 40, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"http.response.status_code": 404}),
            span("inventory_grpc", "place_order", "inventory.Check", orders, 380, 40, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"rpc.grpc.status_code": 5}),
            span("render", "root", "render_receipt", gateway, 700, 50, events=[TracesEvent("exception", now, {"exception.message": "template missing, fell back"}, is_error=True)]),
            span("notify", "root", "POST /notify", gateway, 752, 5, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"http.response.status_code": 503}),
            # a link out to another trace
            span("consume", "root", "consume order.created", orders, 760, 20, kind=TracesKind.SPAN_KIND_CONSUMER, links=[TracesLink(trace_id=other_trace_id, span_id="aaaaaaaaaaaaaaaa", ref_type=TracesRefType.REF_TYPE_FOLLOWS_FROM)]),
            span("model", "root", "chat gpt-4o-mini", agent, 800, 100, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"gen_ai.request.model": "gpt-4o-mini", "gen_ai.usage.input_tokens": 100, "gen_ai.usage.output_tokens": 20, "signoz.gen_ai.usage.tokens.cost": 0.01}),
            span("tool", "root", "execute_tool", agent, 910, 30, attributes={"gen_ai.tool.name": "get_weather"}),
        ]
    )

    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}
    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/highlights"), headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    highlights = response.json()["data"]

    # own time is the duration minus what the children cover
    assert [(service["serviceName"], service["spanCount"], service["errorSpanCount"], service["ownTimeNano"]) for service in highlights["services"]] == [
        (orders, 5, 2, 620_000_000),
        (gateway, 3, 1, 250_000_000),
        (agent, 2, 0, 130_000_000),
    ]

    # one entry for the error, at the span that threw it
    errors = highlights["errorOrigins"]
    assert errors["total"] == 1
    error = errors["items"][0]
    assert error["span"] == {
        "span_id": ids["charge_card"],
        "trace_id": trace_id,
        "parent_span_id": ids["place_order"],
        "name": "charge_card",
        "kind_string": "Client",
        "time_unix": int(start.timestamp()) * 1_000 + 20,
        "duration_nano": 300_000_000,
        "has_error": True,
        "status_code_string": "STATUS_CODE_ERROR",
        "status_message": "card declined",
        "response_status_code": "",
        "resource": {"service.name": orders},
        "attributes": {},
        "events": [],
        "references": [{"traceId": trace_id, "spanId": ids["place_order"], "refType": "CHILD_OF"}],
    }
    assert error["treeStats"] == {"level": 2, "childCount": 0, "subtreeSpanCount": 0, "ownTimeNano": 300_000_000, "errorAncestorCount": 2}
    assert "unmarkedFailureKind" not in error
    assert "matches" not in error

    unmarked = highlights["unmarkedFailures"]
    assert unmarked["total"] == 4
    assert [(item["span"]["span_id"], item["unmarkedFailureKind"]) for item in unmarked["items"]] == [(ids["inventory_http"], "http_4xx"), (ids["inventory_grpc"], "grpc_status"), (ids["render"], "exception_event"), (ids["notify"], "http_5xx")]
    assert unmarked["items"][0]["span"]["response_status_code"] == "404"

    links = highlights["links"]
    assert links["total"] == 1
    assert links["items"][0]["span"]["span_id"] == ids["consume"]
    assert {"traceId": other_trace_id, "spanId": "aaaaaaaaaaaaaaaa", "refType": "FOLLOWS_FROM"} in links["items"][0]["span"]["references"]

    # the aiUsage list reads the usage of its spans from the JSON attributes only; no other list carries attributes
    ai_usage = highlights["aiUsage"]
    if attribute_backend == "json":
        # the tool span carries no token or cost value, so it is not listed
        assert ai_usage["total"] == 1
        assert ai_usage["items"][0]["span"]["span_id"] == ids["model"]
        assert ai_usage["items"][0]["span"]["attributes"] == {"gen_ai.usage.input_tokens": 100, "gen_ai.usage.output_tokens": 20, "signoz.gen_ai.usage.tokens.cost": pytest.approx(0.01)}
    else:
        assert ai_usage == {"total": 0, "items": []}

    # every span is its own entry here, most own time first
    time_spent = highlights["timeSpent"]
    assert time_spent["total"] == 10
    assert [item["span"]["span_id"] for item in time_spent["items"][:3]] == [ids["charge_card"], ids["place_order"], ids["root"]]
    assert time_spent["items"][0]["treeStats"]["ownTimeNano"] == 300_000_000
    assert "sameNameSiblings" not in time_spent["items"][0]["treeStats"]
    assert time_spent["items"][1]["treeStats"] == {"level": 1, "childCount": 3, "subtreeSpanCount": 3, "ownTimeNano": 220_000_000, "errorAncestorCount": 1}

    # the totals of the trace are not here: they come from the summary route
    assert set(highlights) == {"services", *SPAN_LISTS}
    for name in SPAN_LISTS:
        for item in highlights[name]["items"]:
            assert item["span"]["events"] == [], name
            assert list(item["span"]["resource"]) == ["service.name"], name


def test_trace_highlights_limits(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": "td-highlights-limits"}
    start = now - timedelta(seconds=30)
    spans = [Traces(timestamp=start, duration=timedelta(seconds=20), trace_id=trace_id, span_id=root_id, name="POST /import", kind=TracesKind.SPAN_KIND_SERVER, resources=resources)]
    for i in range(150):
        failed = {"status_code": TracesStatusCode.STATUS_CODE_ERROR, "status_message": f"failure {i:03d}"} if i < 12 else {}
        spans.append(Traces(timestamp=start + timedelta(seconds=1, milliseconds=i * 10), duration=timedelta(milliseconds=5), trace_id=trace_id, span_id=TraceIdGenerator.span_id(), parent_span_id=root_id, name="write_item", resources=resources, **failed))
    insert_traces(spans)

    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/highlights")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}
    response = requests.get(url, headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    highlights = response.json()["data"]

    # the default: 10 spans of a list, with the total behind it
    assert highlights["errorOrigins"]["total"] == 12
    assert [item["span"]["status_message"] for item in highlights["errorOrigins"]["items"]] == [f"failure {i:03d}" for i in range(10)]
    assert highlights["aiUsage"] == {"total": 0, "items": []}

    # the 150 same-name children are one entry of the timeSpent list, shown by one of them
    time_spent = highlights["timeSpent"]
    assert time_spent["total"] == 2
    group = next(item for item in time_spent["items"] if item["span"]["name"] == "write_item")
    assert group["treeStats"]["sameNameSiblings"] == {"spanCount": 150, "ownTimeNano": 150 * 5_000_000, "errorSpanCount": 12}
    assert group["span"]["parent_span_id"] == root_id
    root = next(item for item in time_spent["items"] if item["span"]["span_id"] == root_id)
    assert root["treeStats"]["childCount"] == 150
    assert root["treeStats"]["subtreeSpanCount"] == 150

    sized = requests.get(url, params={"limit": 3}, headers=headers, timeout=10).json()["data"]
    assert len(sized["errorOrigins"]["items"]) == 3
    assert sized["errorOrigins"]["total"] == 12

    # the highest value accepted returns everything
    largest = requests.get(url, params={"limit": 1000}, headers=headers, timeout=10)
    assert largest.status_code == HTTPStatus.OK, largest.text
    assert len(largest.json()["data"]["errorOrigins"]["items"]) == 12

    # views names the lists to return; the others are left out
    picked = requests.get(url, params={"views": ["error_origins", "time_spent"]}, headers=headers, timeout=10)
    assert picked.status_code == HTTPStatus.OK, picked.text
    assert set(picked.json()["data"]) == {"services", "errorOrigins", "timeSpent"}
    assert picked.json()["data"]["errorOrigins"]["total"] == 12
    assert picked.json()["data"]["timeSpent"]["total"] == 2

    for params in ({"limit": 1001}, {"limit": -1}, {"views": "fastest"}, {"views": "all"}):
        response = requests.get(url, params=params, headers=headers, timeout=10)
        assert response.status_code == HTTPStatus.BAD_REQUEST, f"{params}: {response.text}"

    unknown = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{TraceIdGenerator.trace_id()}/highlights"), headers=headers, timeout=10)
    assert unknown.status_code == HTTPStatus.NOT_FOUND, unknown.text
