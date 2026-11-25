from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import get_attribute_backend_now
from fixtures.traces import TraceIdGenerator, Traces, TracesEvent, TracesKind, TracesStatusCode


def test_list_trace_spans_scopes_views_and_paging(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    resources = {"service.name": "td-spans-views"}
    start = now - timedelta(seconds=10)
    root_id, orphan_id, orphan_child_id = (TraceIdGenerator.span_id() for _ in range(3))

    # POST /batch                  1000 ms
    # ├─ batch-0                   80 ms
    # │  ├─ write_item ×3
    # │  └─ write_item             error "write failed in batch-0"
    # ├─ batch-1                   the same four below it
    # └─ batch-2                   the same four below it
    #
    # flush                        its parent was never received
    # └─ flush_item
    spans = [Traces(timestamp=start, duration=timedelta(seconds=1), trace_id=trace_id, span_id=root_id, name="POST /batch", kind=TracesKind.SPAN_KIND_SERVER, resources=resources)]
    tree_order = [root_id]
    branches: list[list[str]] = []
    failed_leaves: list[str] = []
    for branch in range(3):
        branch_id = TraceIdGenerator.span_id()
        spans.append(Traces(timestamp=start + timedelta(milliseconds=100 * branch + 10), duration=timedelta(milliseconds=80), trace_id=trace_id, span_id=branch_id, parent_span_id=root_id, name=f"batch-{branch}", resources=resources))
        below = [branch_id]
        for leaf in range(4):
            leaf_id = TraceIdGenerator.span_id()
            failed = {"status_code": TracesStatusCode.STATUS_CODE_ERROR, "status_message": f"write failed in batch-{branch}"} if leaf == 3 else {}
            spans.append(Traces(timestamp=start + timedelta(milliseconds=100 * branch + 20 + 10 * leaf), duration=timedelta(milliseconds=5 + leaf), trace_id=trace_id, span_id=leaf_id, parent_span_id=branch_id, name="write_item", resources=resources, **failed))
            below.append(leaf_id)
            if leaf == 3:
                failed_leaves.append(leaf_id)
        branches.append(below)
        tree_order += below
    spans.append(Traces(timestamp=start + timedelta(milliseconds=500), duration=timedelta(milliseconds=20), trace_id=trace_id, span_id=orphan_id, parent_span_id=TraceIdGenerator.span_id(), name="flush", resources=resources))
    spans.append(Traces(timestamp=start + timedelta(milliseconds=505), duration=timedelta(milliseconds=5), trace_id=trace_id, span_id=orphan_child_id, parent_span_id=orphan_id, name="flush_item", resources=resources))
    tree_order += [orphan_id, orphan_child_id]
    insert_traces(spans)
    spans_url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/spans")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}

    # without a view: every span in tree order, 50 a page
    response = requests.get(spans_url, headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    everything = response.json()["data"]
    assert everything["total"] == 18
    assert [item["span"]["span_id"] for item in everything["items"]] == tree_order
    assert [item["treeStats"]["level"] for item in everything["items"]] == [0] + [1, 2, 2, 2, 2] * 3 + [0, 1]
    assert all("matches" not in item for item in everything["items"])
    assert "warnings" not in everything

    # offset and limit cut the same order, and the total stays
    seen = []
    for offset in range(0, 20, 7):
        page = requests.get(spans_url, params={"offset": offset, "limit": 7}, headers=headers, timeout=10).json()["data"]
        assert page["total"] == 18
        seen += [item["span"]["span_id"] for item in page["items"]]
    assert seen == tree_order

    # a view keeps the spans of its kind, in its own order, and pages the same way
    errors = requests.get(spans_url, params={"view": "error_origins", "offset": 1, "limit": 5}, headers=headers, timeout=10).json()["data"]
    assert errors["total"] == 3
    assert [item["span"]["span_id"] for item in errors["items"]] == failed_leaves[1:]
    assert [item["span"]["status_message"] for item in errors["items"]] == ["write failed in batch-1", "write failed in batch-2"]
    assert [item["span"]["parent_span_id"] for item in errors["items"]] == [branches[1][0], branches[2][0]]

    # one entry for each group of same-name siblings, shown by its longest span
    time_spent = requests.get(spans_url, params={"view": "time_spent"}, headers=headers, timeout=10).json()["data"]
    assert time_spent["total"] == 9
    assert time_spent["items"][0]["span"]["span_id"] == root_id
    assert {item["span"]["span_id"] for item in time_spent["items"] if item["span"]["name"] == "write_item"} == set(failed_leaves)

    for view in ("unmarked_failures", "ai_usage", "links"):
        assert requests.get(spans_url, params={"view": view}, headers=headers, timeout=10).json()["data"] == {"total": 0, "items": []}, view

    # children: one level below, in start order
    children_url = f"{spans_url}/{branches[1][0]}/children"
    children = requests.get(children_url, headers=headers, timeout=10).json()["data"]
    assert children["total"] == 4
    assert [item["span"]["span_id"] for item in children["items"]] == branches[1][1:]
    assert children["items"][0]["treeStats"]["sameNameSiblings"] == {"spanCount": 4, "ownTimeNano": 26_000_000, "errorSpanCount": 1}
    assert [item["span"]["span_id"] for item in requests.get(f"{spans_url}/{root_id}/children", headers=headers, timeout=10).json()["data"]["items"]] == [branch[0] for branch in branches]
    assert requests.get(f"{spans_url}/{branches[1][1]}/children", headers=headers, timeout=10).json()["data"] == {"total": 0, "items": []}

    # descendants: everything below, in tree order; a view keeps the ones of its kind that are below
    descendants = requests.get(f"{spans_url}/{root_id}/descendants", headers=headers, timeout=10).json()["data"]
    assert descendants["total"] == 15
    assert [item["span"]["span_id"] for item in descendants["items"]] == tree_order[1:16]
    assert [item["span"]["span_id"] for item in requests.get(f"{spans_url}/{branches[2][0]}/descendants", headers=headers, timeout=10).json()["data"]["items"]] == branches[2][1:]
    page = requests.get(f"{spans_url}/{root_id}/descendants", params={"view": "error_origins", "limit": 2}, headers=headers, timeout=10).json()["data"]
    assert page["total"] == 3
    assert [item["span"]["span_id"] for item in page["items"]] == failed_leaves[:2]

    # ancestors: the one chain of parents, the parent first; nothing from the other branches
    ancestors_url = f"{spans_url}/{failed_leaves[1]}/ancestors"
    ancestors = requests.get(ancestors_url, headers=headers, timeout=10).json()["data"]
    assert ancestors["total"] == 2
    assert [item["span"]["span_id"] for item in ancestors["items"]] == [branches[1][0], root_id]
    assert requests.get(f"{spans_url}/{root_id}/ancestors", headers=headers, timeout=10).json()["data"] == {"total": 0, "items": []}

    # the chain stops at a parent that was never received
    assert [item["span"]["span_id"] for item in requests.get(f"{spans_url}/{orphan_child_id}/ancestors", headers=headers, timeout=10).json()["data"]["items"]] == [orphan_id]
    assert requests.get(f"{spans_url}/{orphan_id}/ancestors", headers=headers, timeout=10).json()["data"] == {"total": 0, "items": []}


@pytest.mark.parametrize("attribute_backend", ["map", "json"])
def test_list_trace_spans_select_fields(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    attribute_backend: str,
) -> None:
    """Attributes are written to one layout only, so a read from the wrong column finds nothing."""
    now = get_attribute_backend_now(signoz, attribute_backend).replace(second=0, microsecond=0)
    write_mode = "json_only" if attribute_backend == "json" else "legacy_only"
    trace_id = TraceIdGenerator.trace_id()
    resources = {"service.name": f"td-spans-fields-{attribute_backend}", "k8s.pod.name": "checkout-0"}
    root_id, charge_id, payment_id, notify_id = (TraceIdGenerator.span_id() for _ in range(4))
    long_statement = "SELECT * FROM payments WHERE id IN (" + ", ".join(str(i) for i in range(2000)) + ")"
    start = now - timedelta(seconds=10)

    def span(span_id: str, parent_id: str, name: str, offset_ms: int, **kwargs) -> Traces:
        return Traces(timestamp=start + timedelta(milliseconds=offset_ms), duration=timedelta(milliseconds=5), trace_id=trace_id, span_id=span_id, parent_span_id=parent_id, name=name, resources=resources, attribute_write_mode=write_mode, **kwargs)

    # POST /checkout              attribute http.route
    # ├─ charge_card
    # │  └─ POST /v1/payments     attributes payment.provider, http.request.method, http.response.status_code, db.statement (12 KB); a scope
    # └─ notify                   one event
    insert_traces(
        [
            span(root_id, "", "POST /checkout", 0, kind=TracesKind.SPAN_KIND_SERVER, attributes={"http.route": "/checkout"}),
            span(charge_id, root_id, "charge_card", 20),
            span(
                payment_id,
                charge_id,
                "POST /v1/payments",
                30,
                attributes={"payment.provider": "worldpay", "http.request.method": "POST", "http.response.status_code": 402, "db.statement": long_statement},
                scope={"name": "payments-lib", "version": "2.0.1"},
            ),
            span(notify_id, root_id, "notify", 40, events=[TracesEvent("retry", start, {"reason": "timeout"})]),
        ]
    )
    spans_url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/spans")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}

    # without selectFields a span carries service.name and nothing else
    plain = requests.get(spans_url, headers=headers, timeout=10).json()["data"]
    assert [item["span"]["span_id"] for item in plain["items"]] == [root_id, charge_id, payment_id, notify_id]
    assert all(item["span"]["attributes"] == {} and item["span"]["events"] == [] for item in plain["items"])
    assert all(item["span"]["resource"] == {"service.name": resources["service.name"]} for item in plain["items"])
    assert all("http_method" not in item["span"] and "scope" not in item["span"] for item in plain["items"])
    assert "warnings" not in plain

    # the named fields are filled where a span has them; a long value comes back whole
    selected = requests.get(spans_url, params={"selectFields": ["payment.provider", "db.statement", "http.route", "resource.k8s.pod.name"]}, headers=headers, timeout=10)
    assert selected.status_code == HTTPStatus.OK, selected.text
    selected = selected.json()["data"]
    assert [item["span"]["attributes"] for item in selected["items"]] == [{"http.route": "/checkout"}, {}, {"payment.provider": "worldpay", "db.statement": long_statement}, {}]
    assert all(item["span"]["resource"] == resources for item in selected["items"])
    assert all(item["span"]["events"] == [] for item in selected["items"])
    assert selected["items"][2]["unmarkedFailureKind"] == "http_4xx"
    assert "warnings" not in selected

    # a context picks one side: an attribute name is not looked up in the resource
    children_url = f"{spans_url}/{charge_id}/children"
    scoped = requests.get(children_url, params={"selectFields": ["attribute.payment.provider", "attribute.k8s.pod.name"]}, headers=headers, timeout=10).json()["data"]
    assert scoped["items"][0]["span"]["attributes"] == {"payment.provider": "worldpay"}
    assert scoped["items"][0]["span"]["resource"] == {"service.name": resources["service.name"]}
    assert scoped["warnings"] == ["field `attribute.k8s.pod.name` was not found on any returned span"]

    # a field of the span itself is filled where a span has it; one a list does not return is named in warnings
    own = requests.get(spans_url, params={"selectFields": ["http_method", "scope.name", "flags"]}, headers=headers, timeout=10).json()["data"]
    assert [(item["span"].get("http_method"), item["span"].get("scope")) for item in own["items"]] == [(None, None), (None, None), ("POST", {"name": "payments-lib"}), (None, None)]
    assert own["warnings"] == ["field `flags` was not found on any returned span"]

    # a field no span of the page has is named in warnings
    missing = requests.get(children_url, params={"selectFields": ["payment.provider", "not.there"]}, headers=headers, timeout=10).json()["data"]
    assert missing["items"][0]["span"]["attributes"] == {"payment.provider": "worldpay"}
    assert missing["warnings"] == ["field `not.there` was not found on any returned span"]


@pytest.mark.parametrize("attribute_backend", ["map", "json"])
def test_list_trace_spans_query(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    attribute_backend: str,
) -> None:
    """Attributes are written to one layout only, so a read from the wrong column finds nothing."""
    now = get_attribute_backend_now(signoz, attribute_backend).replace(second=0, microsecond=0)
    write_mode = "json_only" if attribute_backend == "json" else "legacy_only"
    trace_id = TraceIdGenerator.trace_id()
    resources = {"service.name": f"td-spans-query-{attribute_backend}", "k8s.pod.name": "checkout-0"}
    names = ("root", "by_name", "by_status", "by_attribute", "by_event", "unrelated")
    ids = {name: TraceIdGenerator.span_id() for name in names}
    start = now - timedelta(seconds=10)

    def span(key: str, parent: str, name: str, offset_ms: int, **kwargs) -> Traces:
        return Traces(timestamp=start + timedelta(milliseconds=offset_ms), duration=timedelta(milliseconds=5), trace_id=trace_id, span_id=ids[key], parent_span_id=ids[parent] if parent else "", name=name, resources=resources, attribute_write_mode=write_mode, **kwargs)

    # POST /checkout
    # ├─ call worldpay                the word is in the name
    # ├─ charge_card                  error, the word is in the status message
    # │  └─ POST /v1/payments         the word is in an attribute
    # ├─ notify                       the word is in an event
    # └─ render_receipt               error, the word is nowhere
    insert_traces(
        [
            span("root", "", "POST /checkout", 0, kind=TracesKind.SPAN_KIND_SERVER, attributes={"http.route": "/checkout"}),
            span("by_name", "root", "call worldpay", 10),
            span("by_status", "root", "charge_card", 20, status_code=TracesStatusCode.STATUS_CODE_ERROR, status_message="Worldpay declined the card"),
            span("by_attribute", "by_status", "POST /v1/payments", 30, attributes={"payment.provider": "worldpay", "http.response.status_code": 402, "order.id": 1234567, "payment.retried": True, "url.full": "https://pay.example.com/v1/charges"}),
            span("by_event", "root", "notify", 40, events=[TracesEvent("retry", start, {"reason": "worldpay timeout"})]),
            span("unrelated", "root", "render_receipt", 50, status_code=TracesStatusCode.STATUS_CODE_ERROR, status_message="template missing"),
        ]
    )
    spans_url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/spans")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}

    # a word is found wherever it occurs, ignoring case; the list keeps its own order
    response = requests.get(spans_url, params={"query": "worldpay"}, headers=headers, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    found = response.json()["data"]
    assert found["total"] == 4
    assert [item["span"]["span_id"] for item in found["items"]] == [ids[name] for name in ("by_name", "by_status", "by_attribute", "by_event")]
    assert {item["span"]["span_id"]: [match["field"] for match in item["matches"]] for item in found["items"]} == {
        ids["by_name"]: ["name"],
        ids["by_status"]: ["status_message"],
        ids["by_attribute"]: ["attributes.payment.provider"],
        ids["by_event"]: ["events[0]"],
    }
    assert found["items"][1]["matches"][0]["snippet"] == "Worldpay declined the card"
    # the attributes read to locate the word are not returned
    assert all(item["span"]["attributes"] == {} for item in found["items"])
    assert "warnings" not in found

    # offset and limit page the matches
    page = requests.get(spans_url, params={"query": "worldpay", "limit": 3, "offset": 3}, headers=headers, timeout=10).json()["data"]
    assert page["total"] == 4
    assert [item["span"]["span_id"] for item in page["items"]] == [ids["by_event"]]

    # a filter expression has no words to show
    failed = requests.get(spans_url, params={"query": "has_error = true"}, headers=headers, timeout=10).json()["data"]
    assert [item["span"]["span_id"] for item in failed["items"]] == [ids["by_status"], ids["unrelated"]]
    assert all("matches" not in item for item in failed["items"])

    by_attribute = requests.get(spans_url, params={"query": "payment.provider = 'worldpay'"}, headers=headers, timeout=10).json()["data"]
    assert [item["span"]["span_id"] for item in by_attribute["items"]] == [ids["by_attribute"]]

    both = requests.get(spans_url, params={"query": "worldpay AND has_error = true"}, headers=headers, timeout=10).json()["data"]
    assert [item["span"]["span_id"] for item in both["items"]] == [ids["by_status"]]

    # a query narrows the spans a route covers, and a view narrows them further
    children = requests.get(f"{spans_url}/{ids['root']}/children", params={"query": "worldpay"}, headers=headers, timeout=10).json()["data"]
    assert [item["span"]["span_id"] for item in children["items"]] == [ids[name] for name in ("by_name", "by_status", "by_event")]
    origins = requests.get(spans_url, params={"query": "worldpay", "view": "error_origins"}, headers=headers, timeout=10).json()["data"]
    assert [item["span"]["span_id"] for item in origins["items"]] == [ids["by_status"]]

    # a word is also found in an attribute's name and in a resource attribute
    by_key = requests.get(spans_url, params={"query": "payment.provider"}, headers=headers, timeout=10).json()["data"]
    assert [(item["span"]["span_id"], item["matches"][0]["field"]) for item in by_key["items"]] == [(ids["by_attribute"], "attributes.payment.provider")]
    by_resource = requests.get(spans_url, params={"query": "td-spans-query"}, headers=headers, timeout=10).json()["data"]
    assert by_resource["total"] == 6
    assert {item["matches"][0]["field"] for item in by_resource["items"]} == {"resource.service.name"}

    # a number and a bool are matched as they are written
    by_number = requests.get(spans_url, params={"query": "1234567"}, headers=headers, timeout=10).json()["data"]
    assert [(item["span"]["span_id"], item["matches"]) for item in by_number["items"]] == [(ids["by_attribute"], [{"field": "attributes.order.id", "snippet": "1234567"}])]
    by_bool = requests.get(spans_url, params={"query": "true"}, headers=headers, timeout=10).json()["data"]
    assert [(item["span"]["span_id"], item["matches"][0]["field"]) for item in by_bool["items"]] == [(ids["by_attribute"], "attributes.payment.retried")]

    # a slash inside a value is matched as written
    by_url = requests.get(spans_url, params={"query": "'example.com/v1'"}, headers=headers, timeout=10).json()["data"]
    assert [(item["span"]["span_id"], item["matches"][0]["field"]) for item in by_url["items"]] == [(ids["by_attribute"], "attributes.url.full")]

    # of an event only the name and the attributes are matched, not the labels it is stored with
    assert requests.get(spans_url, params={"query": "retry"}, headers=headers, timeout=10).json()["data"]["total"] == 1
    assert requests.get(spans_url, params={"query": "attributeMap"}, headers=headers, timeout=10).json()["data"] == {"total": 0, "items": []}

    assert requests.get(spans_url, params={"query": "stripe"}, headers=headers, timeout=10).json()["data"] == {"total": 0, "items": []}

    unknown_key = requests.get(spans_url, params={"query": "no.such.key = 'x'"}, headers=headers, timeout=10).json()["data"]
    assert unknown_key["total"] == 0
    assert "no.such.key" in unknown_key["warnings"][0]

    broken = requests.get(spans_url, params={"query": "has_error ="}, headers=headers, timeout=10)
    assert broken.status_code == HTTPStatus.BAD_REQUEST, broken.text


def test_list_trace_spans_rejects_invalid_requests(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    span_id = TraceIdGenerator.span_id()
    insert_traces([Traces(timestamp=now - timedelta(seconds=10), duration=timedelta(seconds=1), trace_id=trace_id, span_id=span_id, name="GET /health", resources={"service.name": "td-spans-invalid"})])
    spans_url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/spans")
    headers = {"authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}

    for url in (spans_url, f"{spans_url}/{span_id}/descendants"):
        for params in ({"view": "fastest"}, {"limit": 1001}, {"limit": -1}, {"offset": -1}, {"limit": "all"}):
            response = requests.get(url, params=params, headers=headers, timeout=10)
            assert response.status_code == HTTPStatus.BAD_REQUEST, f"{url} {params}: {response.text}"
        assert requests.get(url, params={"limit": 1000}, headers=headers, timeout=10).status_code == HTTPStatus.OK

    for scope in ("children", "descendants", "ancestors"):
        unknown_span = requests.get(f"{spans_url}/{TraceIdGenerator.span_id()}/{scope}", headers=headers, timeout=10)
        assert unknown_span.status_code == HTTPStatus.NOT_FOUND, f"{scope}: {unknown_span.text}"

    unknown_trace = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{TraceIdGenerator.trace_id()}/spans"), headers=headers, timeout=10)
    assert unknown_trace.status_code == HTTPStatus.NOT_FOUND, unknown_trace.text
