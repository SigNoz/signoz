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


@pytest.mark.parametrize("attribute_backend", ["map", "json"])
def test_inspect_overview(
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

    insert_traces(
        [
            span("root", "", "POST /checkout", gateway, 0, 1000, kind=TracesKind.SPAN_KIND_SERVER, status_code=TracesStatusCode.STATUS_CODE_ERROR, attributes={"http.response.status_code": 500}),
            # the error is carried up from charge_card through place_order to the root
            span("place_order", "root", "place_order", orders, 10, 600, status_code=TracesStatusCode.STATUS_CODE_ERROR),
            span("charge_card", "place_order", "charge_card", orders, 20, 300, kind=TracesKind.SPAN_KIND_CLIENT, status_code=TracesStatusCode.STATUS_CODE_ERROR, status_message="card declined", attributes={"payment.provider": "worldpay"}),
            # three failures that do not carry the error flag
            span("inventory_http", "place_order", "GET /inventory", orders, 330, 40, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"http.response.status_code": 404}),
            span("inventory_grpc", "place_order", "inventory.Check", orders, 380, 40, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"rpc.grpc.status_code": 5}),
            span("render", "root", "render_receipt", gateway, 700, 50, events=[TracesEvent("exception", now, {"exception.message": "template missing, fell back"}, is_error=True)]),
            # a link out to another trace
            span("consume", "root", "consume order.created", orders, 760, 20, kind=TracesKind.SPAN_KIND_CONSUMER, links=[TracesLink(trace_id=other_trace_id, span_id="aaaaaaaaaaaaaaaa", ref_type=TracesRefType.REF_TYPE_FOLLOWS_FROM)]),
            span("model", "root", "chat gpt-4o-mini", agent, 800, 100, kind=TracesKind.SPAN_KIND_CLIENT, attributes={"gen_ai.request.model": "gpt-4o-mini", "gen_ai.usage.input_tokens": 100, "gen_ai.usage.output_tokens": 20, "signoz.gen_ai.usage.tokens.cost": 0.01}),
            span("tool", "root", "execute_tool", agent, 910, 30, attributes={"gen_ai.tool.name": "get_weather"}),
        ]
    )

    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/inspect")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}
    response = requests.get(url, headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    overview = response.json()["data"]

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

    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/inspect")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}
    response = requests.get(url, headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    overview = response.json()["data"]
    assert overview["identity"]["spanCount"] == 49

    for name in OVERVIEW_LISTS:
        first = overview[name]
        assert len(first["items"]) == LIST_SIZE, name
        assert first["nextCursor"], name
        seen = [item["span"]["spanId"] for item in first["items"]]
        cursor = first["nextCursor"]
        for _ in range(10):
            response = requests.get(url, params={"cursor": cursor}, headers=headers, timeout=10)
            assert response.status_code == HTTPStatus.OK, response.text
            page = response.json()["data"]
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
    response = requests.get(url, params={"cursor": overview["errors"]["nextCursor"]}, headers=headers, timeout=10)
    assert [item["statusMessage"] for item in response.json()["data"]["errors"]["items"]] == ["failure 10", "failure 11"]


def test_inspect_large_trace_shows_the_top_of_the_tree(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": "td-inspect-large"}
    spans = [Traces(timestamp=now - timedelta(seconds=30), duration=timedelta(seconds=20), trace_id=trace_id, span_id=root_id, name="POST /import", kind=TracesKind.SPAN_KIND_SERVER, resources=resources)]
    for i in range(150):
        spans.append(Traces(timestamp=now - timedelta(seconds=29) + timedelta(milliseconds=i * 10), duration=timedelta(milliseconds=5), trace_id=trace_id, span_id=TraceIdGenerator.span_id(), parent_span_id=root_id, name="write_item", resources=resources))
    insert_traces(spans)
    in_time_order = [span.span_id for span in spans]

    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/inspect")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}
    response = requests.get(url, headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    overview = response.json()["data"]

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


@pytest.mark.parametrize("attribute_backend", ["map", "json"])
def test_inspect_span(
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
    resources = {"service.name": f"td-inspect-span-{attribute_backend}"}
    root_id, handler_id, middle_id, target_id = (TraceIdGenerator.span_id() for _ in range(4))
    long_statement = "SELECT * FROM orders WHERE id IN (" + ", ".join(str(i) for i in range(400)) + ")"
    start = now - timedelta(seconds=10)

    def span(span_id: str, parent_id: str, name: str, offset_ms: int, duration_ms: int, **kwargs) -> Traces:
        return Traces(timestamp=start + timedelta(milliseconds=offset_ms), duration=timedelta(milliseconds=duration_ms), trace_id=trace_id, span_id=span_id, parent_span_id=parent_id, name=name, resources=resources, attribute_write_mode=write_mode, **kwargs)

    spans = [
        span(root_id, "", "POST /orders", 0, 2000, kind=TracesKind.SPAN_KIND_SERVER),
        span(handler_id, root_id, "handle_order", 10, 1900),
        span(middle_id, handler_id, "load_order", 20, 1800),
        span(
            target_id,
            middle_id,
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
    ]
    child_ids, grandchild_ids = [], []
    for i in range(25):
        child_id, grandchild_id = TraceIdGenerator.span_id(), TraceIdGenerator.span_id()
        child_ids.append(child_id)
        grandchild_ids.append(grandchild_id)
        spans.append(span(child_id, target_id, "fetch_page", 40 + i * 10, 8))
        spans.append(span(grandchild_id, child_id, "decode_row", 41 + i * 10, 2))
    # the same operation in nine other traces of the hour before, 100 ms to 900 ms long
    for i in range(1, 10):
        spans.append(Traces(timestamp=start - timedelta(minutes=5 * i), duration=timedelta(milliseconds=100 * i), trace_id=TraceIdGenerator.trace_id(), span_id=TraceIdGenerator.span_id(), name="query_orders", kind=TracesKind.SPAN_KIND_CLIENT, resources=resources, attribute_write_mode=write_mode))
    insert_traces(spans)

    spans_url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/inspect/spans")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}
    response = requests.get(f"{spans_url}/{target_id}", headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    detail = response.json()["data"]

    summary = detail["summary"]
    assert summary["spanId"] == target_id
    assert summary["parentSpanId"] == middle_id
    assert summary["name"] == "query_orders"
    assert (summary["level"], summary["childCount"], summary["subtreeSpanCount"]) == (3, 25, 50)
    assert summary["hasError"] is True
    assert summary["durationNano"] == 1_000_000_000

    record = detail["record"]
    assert record["spanId"] == target_id
    assert record["statusMessage"] == "deadlock detected"
    assert record["attributes"]["db.system"] == "postgresql"
    assert record["attributes"]["db.rows"] == 42
    assert record["resource"]["service.name"] == resources["service.name"]
    assert record["events"][0]["name"] == "retry"
    assert record["links"] == [{"traceId": other_trace_id, "spanId": "bbbbbbbbbbbbbbbb"}]
    # a value over 500 characters is cut and listed with its full length
    assert len(record["attributes"]["db.statement"]) == 501
    assert record["truncated"] == [{"field": "attributes.db.statement", "length": len(long_statement)}]

    # two levels up, the parent first, then the root
    assert [line["spanId"] for line in detail["ancestors"]] == [middle_id, handler_id, root_id]
    assert detail["ancestorCount"] == 3
    # two levels down, each with its total and its first 20 spans in time order
    levels = detail["descendants"]
    assert [(level["level"], level["total"], len(level["spans"])) for level in levels] == [(1, 25, 20), (2, 25, 20)]
    assert [line["spanId"] for line in levels[0]["spans"]] == child_ids[:20]
    assert [line["spanId"] for line in levels[1]["spans"]] == grandchild_ids[:20]

    # ten spans of this name and service started in the hour up to this one, and this is the longest
    percentile = detail["percentile"]
    assert percentile["windowMinutes"] == 60
    assert percentile["position"] == pytest.approx(100)
    assert 400_000_000 <= percentile["p50Nano"] <= 700_000_000
    assert percentile["p50Nano"] <= percentile["p90Nano"] <= percentile["p99Nano"] <= 1_000_000_000

    one_level = requests.get(f"{spans_url}/{target_id}", params={"depth": 1}, headers=headers, timeout=10).json()["data"]
    assert [line["spanId"] for line in one_level["ancestors"]] == [middle_id, root_id]
    assert [level["level"] for level in one_level["descendants"]] == [1]

    selected = requests.get(f"{spans_url}/{target_id}", params={"selectFields": "db.statement"}, headers=headers, timeout=10).json()["data"]
    # a call for named fields reads more of an opened span, so the percentile is not computed again
    assert "percentile" not in selected
    selected = selected["record"]
    assert selected["attributes"] == {"db.statement": long_statement}
    assert selected["truncated"] == []

    # a selected name also picks the attribute of an event, and keeps only the events that have it
    event_selected = requests.get(f"{spans_url}/{target_id}", params={"selectFields": ["attempt", "db.system"]}, headers=headers, timeout=10).json()["data"]["record"]
    assert event_selected["attributes"] == {"db.system": "postgresql"}
    assert [(event["name"], event["attributes"]) for event in event_selected["events"]] == [("retry", {"attempt": "2"})]

    # a blank name selects nothing, so the usual record comes back
    blank = requests.get(f"{spans_url}/{target_id}", params={"selectFields": ""}, headers=headers, timeout=10).json()["data"]["record"]
    assert blank["attributes"]["db.system"] == "postgresql"
    assert len(blank["attributes"]["db.statement"]) == 501

    root = requests.get(f"{spans_url}/{root_id}", headers=headers, timeout=10).json()["data"]
    assert root["ancestors"] == []
    assert [level["total"] for level in root["descendants"]] == [1, 1]

    unknown = requests.get(f"{spans_url}/{TraceIdGenerator.span_id()}", headers=headers, timeout=10)
    assert unknown.status_code == HTTPStatus.NOT_FOUND, unknown.text


def test_inspect_rejects_invalid_requests(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{TraceIdGenerator.trace_id()}/inspect")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}

    response = requests.get(url, params={"cursor": "not-a-cursor"}, headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    for depth in (11, "all"):
        response = requests.get(f"{url}/spans/0000000000000001", params={"depth": depth}, headers=headers, timeout=10)
        assert response.status_code == HTTPStatus.BAD_REQUEST, f"depth {depth}: {response.text}"

    response = requests.get(url, headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text
