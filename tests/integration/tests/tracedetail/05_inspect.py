import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import get_attribute_backend_now
from fixtures.traces import TraceIdGenerator, Traces, TracesEvent, TracesKind, TracesLink, TracesRefType, TracesStatusCode

OVERVIEW_LISTS = ("errors", "unmarkedFailures", "slowest", "expensive", "links")
LIST_SIZE = 10


def get_inspect(signoz: types.SigNoz, token: str, trace_id: str, params: dict | None = None) -> requests.Response:
    return requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/inspect"),
        params=params,
        headers={"authorization": f"Bearer {token}"},
        timeout=10,
    )


def get_overview(signoz: types.SigNoz, token: str, trace_id: str, params: dict | None = None) -> dict:
    response = get_inspect(signoz, token, trace_id, params)
    assert response.status_code == HTTPStatus.OK, f"{params}: {response.text}"
    return response.json()["data"]


@pytest.mark.parametrize("attribute_backend", ["map", "json"])
def test_inspect_overview(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    attribute_backend: str,
) -> None:
    """The overview of a small trace: identity with per-service totals and gen_ai usage, where the
    error started, the failures not marked as errors, span links, the most expensive gen_ai spans and
    the whole tree with every span's record. Attributes are written to one layout only, so a read
    from the wrong column loses the tokens, the cost and the record's attributes."""
    now = get_attribute_backend_now(signoz, attribute_backend).replace(second=0, microsecond=0)
    write_mode = "json_only" if attribute_backend == "json" else "legacy_only"
    trace_id = TraceIdGenerator.trace_id()
    other_trace_id = TraceIdGenerator.trace_id()
    names = ("root", "place_order", "charge_card", "inventory_http", "inventory_grpc", "render", "consume", "model", "tool")
    ids = {name: TraceIdGenerator.span_id() for name in names}
    gateway, orders, agent = (f"td-inspect-{service}-{attribute_backend}" for service in ("gateway", "orders", "agent"))

    def span(key: str, parent: str, name: str, service: str, offset_ms: int, duration_ms: int, **kwargs) -> Traces:
        return Traces(
            timestamp=now - timedelta(seconds=10) + timedelta(milliseconds=offset_ms),
            duration=timedelta(milliseconds=duration_ms),
            trace_id=trace_id,
            span_id=ids[key],
            parent_span_id=ids[parent] if parent else "",
            name=name,
            resources={"service.name": service},
            attribute_write_mode=write_mode,
            **kwargs,
        )

    render = span("render", "root", "render_receipt", gateway, 700, 50, events=[TracesEvent("exception", now, {"exception.message": "template missing, fell back"})])
    # The collector marks an exception event with isError; the fixture does not write it.
    render._events_db = [json.dumps({"name": "exception", "timeUnixNano": 1, "attributeMap": {"exception.message": "template missing, fell back"}, "isError": True}, separators=(",", ":"))]  # pylint: disable=protected-access

    insert_traces(
        [
            span("root", "", "POST /checkout", gateway, 0, 1000, kind=TracesKind.SPAN_KIND_SERVER, status_code=TracesStatusCode.STATUS_CODE_ERROR, attributes={"http.response.status_code": 500}),
            # the error is carried up from charge_card through place_order to the root
            span("place_order", "root", "place_order", orders, 10, 600, status_code=TracesStatusCode.STATUS_CODE_ERROR),
            span("charge_card", "place_order", "charge_card", orders, 20, 300, kind=TracesKind.SPAN_KIND_CLIENT, status_code=TracesStatusCode.STATUS_CODE_ERROR, status_message="card declined", attributes={"payment.provider": "worldpay"}),
            # three failures that do not carry the error flag
            span("inventory_http", "place_order", "GET /inventory", orders, 330, 40, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"http.response.status_code": 404}),
            span("inventory_grpc", "place_order", "inventory.Check", orders, 380, 40, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"rpc.grpc.status_code": 5}),
            render,
            # a link out to another trace
            span("consume", "root", "consume order.created", orders, 760, 20, kind=TracesKind.SPAN_KIND_CONSUMER, links=[TracesLink(trace_id=other_trace_id, span_id="aaaaaaaaaaaaaaaa", ref_type=TracesRefType.REF_TYPE_FOLLOWS_FROM)]),
            span("model", "root", "chat gpt-4o-mini", agent, 800, 100, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"gen_ai.request.model": "gpt-4o-mini", "gen_ai.usage.input_tokens": 100, "gen_ai.usage.output_tokens": 20, "signoz.gen_ai.usage.tokens.cost": 0.01}),
            span("tool", "root", "execute_tool", agent, 910, 30, attributes={"gen_ai.tool.name": "get_weather"}),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    overview = get_overview(signoz, token, trace_id)

    identity = overview["identity"]
    assert identity["traceId"] == trace_id
    assert identity["spanCount"] == 9
    assert identity["errorSpanCount"] == 3
    assert identity["rootCount"] == 1
    assert identity["hasMissingSpans"] is False
    assert identity["durationNano"] == 1_000_000_000
    assert identity["root"]["spanId"] == ids["root"]
    assert identity["root"]["name"] == "POST /checkout"
    assert identity["root"]["responseStatusCode"] == "500"
    assert identity["serviceCount"] == 3
    assert {service["serviceName"]: (service["spanCount"], service["errorSpanCount"]) for service in identity["services"]} == {gateway: (2, 1), orders: (5, 2), agent: (2, 0)}
    assert identity["ai"]["modelCallCount"] == 1
    assert identity["ai"]["toolCallCount"] == 1
    assert identity["ai"]["tokens"] == {"input": 100, "output": 20, "cacheRead": 0, "cacheWrite": 0, "reasoning": 0}
    assert identity["ai"]["totalCost"] == pytest.approx(0.01)

    # one entry for the error, at the span that threw it
    errors = overview["errors"]
    assert errors["total"] == 1
    assert "nextCursor" not in errors
    assert errors["items"][0]["span"]["spanId"] == ids["charge_card"]
    assert errors["items"][0]["parent"]["spanId"] == ids["place_order"]
    assert errors["items"][0]["statusMessage"] == "card declined"
    assert errors["items"][0]["errorAncestorCount"] == 2

    unmarked = overview["unmarkedFailures"]
    assert unmarked["total"] == 3
    assert {item["span"]["spanId"]: item["reason"] for item in unmarked["items"]} == {ids["inventory_http"]: "http_4xx", ids["inventory_grpc"]: "grpc_status", ids["render"]: "exception_event"}

    links = overview["links"]
    assert links["total"] == 1
    assert links["items"][0]["span"]["spanId"] == ids["consume"]
    assert links["items"][0]["parent"]["spanId"] == ids["root"]
    assert links["items"][0]["linkCount"] == 1
    assert links["items"][0]["links"] == [{"traceId": other_trace_id, "spanId": "aaaaaaaaaaaaaaaa"}]

    expensive = overview["expensive"]
    assert expensive["total"] == 2
    assert expensive["items"][0]["span"]["spanId"] == ids["model"]
    assert expensive["items"][0]["cost"] == pytest.approx(0.01)
    assert (expensive["items"][0]["inputTokens"], expensive["items"][0]["outputTokens"]) == (100, 20)

    # own time is the duration minus what the children cover: 300 ms of charge_card is all its own
    slowest = overview["slowest"]
    assert slowest["total"] == 9
    assert slowest["items"][0]["span"]["spanId"] == ids["charge_card"]
    assert slowest["items"][0]["ownTimeNano"] == 300_000_000
    assert slowest["items"][0]["spanCount"] == 1

    # every list item carries its direct parent, and the root has none
    for name in OVERVIEW_LISTS:
        for item in overview[name]["items"]:
            assert item.get("parent", {}).get("spanId", "") == item["span"].get("parentSpanId", ""), f"{name}: {item}"

    tree = overview["tree"]
    assert tree["total"] == 9
    assert tree["complete"] is True
    # tree order: a span is followed by the spans below it, siblings by start time
    assert [line["spanId"] for line in tree["spans"]] == [ids[name] for name in ("root", "place_order", "charge_card", "inventory_http", "inventory_grpc", "render", "consume", "model", "tool")]
    place_order = tree["spans"][1]
    assert (place_order["level"], place_order["childCount"], place_order["subtreeSpanCount"]) == (1, 3, 3)
    assert place_order["ownTimeNano"] == 220_000_000

    # a small trace carries every span's record
    records = {record["spanId"]: record for record in tree["records"]}
    assert set(records) == set(ids.values())
    assert records[ids["charge_card"]]["attributes"]["payment.provider"] == "worldpay"
    assert records[ids["charge_card"]]["statusMessage"] == "card declined"
    assert records[ids["charge_card"]]["resource"]["service.name"] == orders
    assert records[ids["consume"]]["links"] == [{"traceId": other_trace_id, "spanId": "aaaaaaaaaaaaaaaa"}]
    assert records[ids["render"]]["events"][0]["name"] == "exception"


def test_inspect_pages_every_list(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Every list of the overview returns 10 items and a cursor. The cursor alone returns the
    rest of that list, and nothing else of the overview."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": "td-inspect-pages"}
    spans = [Traces(timestamp=now - timedelta(seconds=30), duration=timedelta(seconds=20), trace_id=trace_id, span_id=root_id, name="POST /batch", kind=TracesKind.SPAN_KIND_SERVER, resources=resources)]
    expected: dict[str, list[str]] = {name: [] for name in OVERVIEW_LISTS}

    def child(group: str, i: int, offset_ms: int, **kwargs) -> None:
        span_id = TraceIdGenerator.span_id()
        expected[group].append(span_id)
        # distinct names keep each span its own entry in the slowest list; distinct durations fix its order
        spans.append(Traces(timestamp=now - timedelta(seconds=29) + timedelta(milliseconds=offset_ms), duration=timedelta(milliseconds=100 + offset_ms), trace_id=trace_id, span_id=span_id, parent_span_id=root_id, name=f"{group}-{i:02d}", resources=resources, **kwargs))

    for i in range(12):
        child("errors", i, i, status_code=TracesStatusCode.STATUS_CODE_ERROR, status_message=f"failure {i:02d}")
        child("unmarkedFailures", i, 20 + i, attributes={"http.response.status_code": 404})
        child("expensive", i, 40 + i, attributes={"gen_ai.request.model": "gpt-4o-mini", "signoz.gen_ai.usage.tokens.cost": (i + 1) / 100})
        child("links", i, 60 + i, links=[TracesLink(trace_id=TraceIdGenerator.trace_id(), span_id=TraceIdGenerator.span_id(), ref_type=TracesRefType.REF_TYPE_FOLLOWS_FROM)])
    insert_traces(spans)
    # the slowest list ranks every span: the 48 children by duration, the longest first, then the root
    by_duration = sorted(spans[1:], key=lambda span: int(span.duration_nano), reverse=True)
    expected["slowest"] = [span.span_id for span in by_duration]
    expected["expensive"].reverse()

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    overview = get_overview(signoz, token, trace_id)
    assert overview["identity"]["spanCount"] == 49

    for name in OVERVIEW_LISTS:
        first = overview[name]
        assert len(first["items"]) == LIST_SIZE, name
        assert first["nextCursor"], name
        seen = [item["span"]["spanId"] for item in first["items"]]
        cursor = first["nextCursor"]
        for _ in range(10):
            page = get_overview(signoz, token, trace_id, {"cursor": cursor})
            assert list(page) == [name], f"{name}: a page returned {list(page)}"
            assert page[name]["total"] == first["total"]
            seen += [item["span"]["spanId"] for item in page[name]["items"]]
            cursor = page[name].get("nextCursor")
            if not cursor:
                break
        assert len(seen) == first["total"], name
        assert len(set(seen)) == len(seen), f"{name}: a span was returned twice"
        if name == "slowest":
            # the root's own time is what its children leave of it, so only its place is not asserted
            assert [span_id for span_id in seen if span_id != root_id] == expected[name]
            assert first["total"] == 49
        else:
            assert seen == expected[name], name
            assert first["total"] == 12

    # the second page of errors carries the status messages of its own spans
    second = get_overview(signoz, token, trace_id, {"cursor": overview["errors"]["nextCursor"]})
    assert [item["statusMessage"] for item in second["errors"]["items"]] == ["failure 10", "failure 11"]


def test_inspect_large_trace_shows_the_top_of_the_tree(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Over 50 spans the tree holds the first 50 in time order, the records are left out, and
    same-name spans under one parent are one entry of the slowest list."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": "td-inspect-large"}
    spans = [Traces(timestamp=now - timedelta(seconds=30), duration=timedelta(seconds=20), trace_id=trace_id, span_id=root_id, name="POST /import", kind=TracesKind.SPAN_KIND_SERVER, resources=resources)]
    for i in range(150):
        spans.append(Traces(timestamp=now - timedelta(seconds=29) + timedelta(milliseconds=i * 10), duration=timedelta(milliseconds=5), trace_id=trace_id, span_id=TraceIdGenerator.span_id(), parent_span_id=root_id, name="write_item", resources=resources))
    insert_traces(spans)
    in_time_order = [span.span_id for span in spans]

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    overview = get_overview(signoz, token, trace_id)

    assert overview["identity"]["spanCount"] == 151
    tree = overview["tree"]
    assert tree["total"] == 151
    assert tree["complete"] is False
    assert "records" not in tree
    assert [line["spanId"] for line in tree["spans"]] == in_time_order[:50]
    assert tree["spans"][0]["childCount"] == 150

    slowest = overview["slowest"]
    assert slowest["total"] == 2
    group = next(item for item in slowest["items"] if item["span"]["name"] == "write_item")
    assert group["spanCount"] == 150
    assert group["ownTimeNano"] == 150 * 5_000_000
    assert group["parent"]["spanId"] == root_id
    assert "expensive" not in overview


def test_inspect_rejects_invalid_requests(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    trace_id = TraceIdGenerator.trace_id()

    response = get_inspect(signoz, token, trace_id, {"cursor": "not-a-cursor"})
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text

    missing = get_inspect(signoz, token, trace_id)
    assert missing.status_code == HTTPStatus.NOT_FOUND, missing.text
