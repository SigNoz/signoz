from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    Aggregation,
    BuilderQuery,
    OrderBy,
    RequestType,
    TelemetryFieldKey,
    format_timestamp,
    generate_traces_with_corrupt_metadata,
    get_all_warnings,
    get_rows,
    make_query_request,
)
from fixtures.traces import (
    ALL_SELECT_FIELDS,
    TraceIdGenerator,
    Traces,
    TracesEvent,
    TracesKind,
    TracesLink,
    TracesRefType,
    TracesStatusCode,
    trace_noise,
)

# The clean/corrupt `trace_noise` factor (fixtures/traces.py) is applied per test via
# @pytest.mark.parametrize("noise", ["clean", "corrupt"]) so each test doubles as a
# collision-robustness check.


# ============================================================================
# Basic list & row shape
# ============================================================================


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    extra_attrs, extra_resources = trace_noise(noise)
    http_service_trace_id = TraceIdGenerator.trace_id()
    http_service_span_id = TraceIdGenerator.span_id()
    http_service_db_span_id = TraceIdGenerator.span_id()
    http_service_patch_span_id = TraceIdGenerator.span_id()
    topic_service_trace_id = TraceIdGenerator.trace_id()
    topic_service_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    spans = [
        Traces(
            timestamp=now - timedelta(seconds=4),
            duration=timedelta(seconds=3),
            trace_id=http_service_trace_id,
            span_id=http_service_span_id,
            parent_span_id="",
            name="POST /integration",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"deployment.environment": "production", "service.name": "http-service", "os.type": "linux", "host.name": "linux-000", "cloud.provider": "integration", "cloud.account.id": "000", **extra_resources},
            attributes={"net.transport": "IP.TCP", "http.scheme": "http", "http.user_agent": "Integration Test", "http.request.method": "POST", "http.response.status_code": "200", **extra_attrs},
        ),
        Traces(
            timestamp=now - timedelta(seconds=3.5),
            duration=timedelta(seconds=0.5),
            trace_id=http_service_trace_id,
            span_id=http_service_db_span_id,
            parent_span_id=http_service_span_id,
            name="SELECT",
            kind=TracesKind.SPAN_KIND_CLIENT,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"deployment.environment": "production", "service.name": "http-service", "os.type": "linux", "host.name": "linux-000", "cloud.provider": "integration", "cloud.account.id": "000", **extra_resources},
            attributes={"db.name": "integration", "db.operation": "SELECT", "db.statement": "SELECT * FROM integration", **extra_attrs},
        ),
        Traces(
            timestamp=now - timedelta(seconds=3),
            duration=timedelta(seconds=1),
            trace_id=http_service_trace_id,
            span_id=http_service_patch_span_id,
            parent_span_id=http_service_span_id,
            name="HTTP PATCH",
            kind=TracesKind.SPAN_KIND_CLIENT,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"deployment.environment": "production", "service.name": "http-service", "os.type": "linux", "host.name": "linux-000", "cloud.provider": "integration", "cloud.account.id": "000", **extra_resources},
            attributes={"http.request.method": "PATCH", "http.status_code": "404", **extra_attrs},
        ),
        Traces(
            timestamp=now - timedelta(seconds=1),
            duration=timedelta(seconds=4),
            trace_id=topic_service_trace_id,
            span_id=topic_service_span_id,
            parent_span_id="",
            name="topic publish",
            kind=TracesKind.SPAN_KIND_PRODUCER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"deployment.environment": "production", "service.name": "topic-service", "os.type": "linux", "host.name": "linux-001", "cloud.provider": "integration", "cloud.account.id": "001", **extra_resources},
            attributes={"message.type": "SENT", "messaging.operation": "publish", "messaging.message.id": "001", **extra_attrs},
        ),
    ]
    post_span, select_span, patch_span, topic_span = spans
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    # 1. Raw list ordered by timestamp desc, projecting keys with context and
    #    datatype specified inline in the name.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                limit=10,
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                select_fields=[
                    TelemetryFieldKey("resource.service.name"),
                    TelemetryFieldKey("span.name:string"),
                    TelemetryFieldKey("span.duration_nano"),
                    TelemetryFieldKey("span.http_method"),
                    TelemetryFieldKey("span.response_status_code"),
                ],
                aggregations=[Aggregation("count()")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 4

    # Ordered by timestamp desc: topic publish, HTTP PATCH, SELECT, POST. Every
    # expected value is derived from the inserted span objects, so the corrupt
    # variant (colliding attributes) must not change any projected column.
    for row, span in zip(rows, [topic_span, patch_span, select_span, post_span], strict=True):
        data = dict(row["data"])
        assert data.pop("timestamp") is not None
        assert data == {
            "duration_nano": int(span.duration_nano),
            "http_method": span.http_method,
            "name": span.name,
            "response_status_code": span.response_status_code,
            "service.name": span.service_name,
            "span_id": span.span_id,
            "trace_id": span.trace_id,
        }

    # 2. Root spans only.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                limit=10,
                filter_expression="isRoot = 'true'",
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                select_fields=[TelemetryFieldKey("resource.service.name")],
                aggregations=[Aggregation("count()")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 2
    assert rows[0]["data"]["service.name"] == topic_span.service_name
    assert rows[1]["data"]["service.name"] == post_span.service_name


@pytest.mark.parametrize(
    "select_fields,expected_keys,events_links",
    [
        pytest.param([], ALL_SELECT_FIELDS, "full", id="empty_returns_all_fields"),
        pytest.param(
            [TelemetryFieldKey("service.name")],
            ["timestamp", "trace_id", "span_id", "service.name"],
            "skip",
            id="projected_subset",
        ),
    ],
)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_select_fields(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    select_fields: list[TelemetryFieldKey],
    expected_keys: list[str],
    events_links: str,
) -> None:
    """
    Events arrive parsed, and links carry only traceId and spanId: refType is
    dropped at the consume layer.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    parent_trace_id = TraceIdGenerator.trace_id()
    parent_span_id = TraceIdGenerator.span_id()
    child_span_id = TraceIdGenerator.span_id()
    linked_trace_id = TraceIdGenerator.trace_id()
    linked_span_id = TraceIdGenerator.span_id()

    event_one = TracesEvent(
        name="request_received",
        timestamp=now - timedelta(seconds=3, microseconds=500_000),
        attribute_map={"http.method": "GET", "http.route": "/api/chat"},
    )
    event_two = TracesEvent(
        name="cache_lookup",
        timestamp=now - timedelta(seconds=3, microseconds=400_000),
        attribute_map={"cache.hit": "true", "cache.key": "user:123:prompt"},
    )
    user_link = TracesLink(
        trace_id=linked_trace_id,
        span_id=linked_span_id,
        ref_type=TracesRefType.REF_TYPE_FOLLOWS_FROM,
    )

    traces = [
        Traces(
            timestamp=now - timedelta(seconds=4),
            duration=timedelta(seconds=3),
            trace_id=parent_trace_id,
            span_id=parent_span_id,
            parent_span_id="",
            name="root span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "events-links-service", **extra_resources},
            attributes={"http.request.method": "GET", **extra_attrs},
        ),
        Traces(
            timestamp=now - timedelta(seconds=3),
            duration=timedelta(seconds=1),
            trace_id=parent_trace_id,
            span_id=child_span_id,
            parent_span_id=parent_span_id,
            name="child span",
            kind=TracesKind.SPAN_KIND_INTERNAL,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "events-links-service", **extra_resources},
            attributes={"http.request.method": "GET", **extra_attrs},
            events=[event_one, event_two],
            links=[user_link],
        ),
    ]

    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int((now + timedelta(seconds=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                limit=10,
                filter_expression="resource.service.name = 'events-links-service'",
                select_fields=select_fields,
                order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
            ).to_dict()
        ],
    )
    assert response.status_code == HTTPStatus.OK

    rows = get_rows(response)
    assert len(rows) == 2
    for row in rows:
        assert set(row["data"].keys()) == set(expected_keys)

    # Empty-selectFields case: events/links arrive parsed into structured objects.
    # Every row's events/links should match the fixture's stored parsed shape
    # (the fixture's `.events`/`.links` mirror the API response shape directly).
    # Projected-selectFields case: nothing to verify beyond the key set.
    if events_links == "full":
        for row, trace in zip(rows, traces, strict=True):
            assert row["data"]["events"] == trace.events
            assert row["data"]["links"] == trace.links
            # Jaeger-era `refType` is dropped at the consume layer.
            for link in row["data"]["links"]:
                assert "refType" not in link


@pytest.mark.parametrize(
    "select_field,key,expected,expected_type",
    [
        pytest.param(TelemetryFieldKey("span.string_attr"), "string_attr", lambda s: s.attribute_string["string_attr"], str, id="string_attr"),
        pytest.param(TelemetryFieldKey("span.number_attr"), "number_attr", lambda s: s.attributes_number["number_attr"], float, id="number_attr"),
        pytest.param(TelemetryFieldKey("span.bool_attr"), "bool_attr", lambda s: s.attributes_bool["bool_attr"], bool, id="bool_attr"),
        pytest.param(TelemetryFieldKey("db_name"), "db_name", lambda s: s.db_name, str, id="calculated_db_name"),
        pytest.param(TelemetryFieldKey("duration_nano"), "duration_nano", lambda s: int(s.duration_nano), int, id="intrinsic_duration_nano"),
        pytest.param(TelemetryFieldKey("durationNano"), "durationNano", lambda s: int(s.duration_nano), int, id="deprecated_alias_durationNano"),
        pytest.param(TelemetryFieldKey("does_not_exist"), "does_not_exist", lambda s: None, type(None), id="nonexistent_attr_bare"),
    ],
)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_select_field_types(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    select_field: TelemetryFieldKey,
    key: str,
    expected: Callable[[Traces], Any],
    expected_type: type,
) -> None:
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    span = Traces(
        timestamp=now - timedelta(seconds=1),
        duration=timedelta(seconds=3),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="typed-span",
        kind=TracesKind.SPAN_KIND_CLIENT,
        resources={"service.name": "typed-service", **extra_resources},
        attributes={"string_attr": "hello", "number_attr": 42.5, "bool_attr": True, "db.name": "orders_db", "db.operation": "SELECT", **extra_attrs},
    )
    insert_traces([span])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[BuilderQuery(signal="traces", name="A", select_fields=[select_field]).to_dict()],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 1
    data = rows[0]["data"]
    assert key in data
    expected_value = expected(span)
    if expected_value is None:
        assert data[key] is None
    else:
        assert data[key] == expected_value
        assert isinstance(data[key], expected_type)


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_select_field_dedup(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    span = Traces(
        timestamp=now - timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="dedup-span",
        resources={"service.name": "dedup-service", **extra_resources},
        attributes={"dup_attr": "value", **extra_attrs},
    )
    insert_traces([span])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[BuilderQuery(signal="traces", name="A", select_fields=[TelemetryFieldKey("span.dup_attr"), TelemetryFieldKey("span.dup_attr")]).to_dict()],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 1
    keys = list(rows[0]["data"].keys())
    assert keys.count("dup_attr") == 1
    assert rows[0]["data"]["dup_attr"] == span.attribute_string["dup_attr"]


@pytest.mark.parametrize(
    "select_field,projected_key,expected",
    [
        pytest.param(TelemetryFieldKey("db_name"), "db_name", lambda s: s.db_name, id="db_name_bare_calculated"),
        pytest.param(TelemetryFieldKey("span.db_name"), "db_name", lambda s: s.db_name, id="db_name_span_calculated"),
        pytest.param(TelemetryFieldKey("attribute.db_name"), "db_name", lambda s: s.attribute_string["db_name"], id="db_name_attribute"),
        pytest.param(TelemetryFieldKey("http_method"), "http_method", lambda s: s.http_method, id="http_method_bare_calculated"),
        pytest.param(TelemetryFieldKey("span.http_method"), "http_method", lambda s: s.http_method, id="http_method_span_calculated"),
        pytest.param(TelemetryFieldKey("attribute.http_method"), "http_method", lambda s: s.attribute_string["http_method"], id="http_method_attribute"),
    ],
)
def test_traces_list_select_calculated_field_collision(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    select_field: TelemetryFieldKey,
    projected_key: str,
    expected: Callable[[Traces], Any],
) -> None:
    """
    A bare name or the `span.` context returns the derived column and shadows the
    same-named attribute; the `attribute.` prefix reaches the attribute.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    span = Traces(
        timestamp=now - timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="calc-collision",
        kind=TracesKind.SPAN_KIND_CLIENT,
        resources={"service.name": "calc-collision-service"},
        attributes={"db.name": "realdb", "db_name": "attrval", "http.request.method": "GET", "http_method": "attrmethod"},
    )
    insert_traces([span])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[BuilderQuery(signal="traces", name="A", select_fields=[select_field]).to_dict()],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 1
    assert rows[0]["data"][projected_key] == expected(span)


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_response_shape_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()

    def span(marker: str, *, kind: TracesKind, status_code: TracesStatusCode = TracesStatusCode.STATUS_CODE_UNSET, status_message: str = "", flags: int = 0, attributes: dict[str, Any], scope: dict[str, Any] | None = None) -> Traces:
        return Traces(
            timestamp=now - timedelta(seconds=1),
            duration=timedelta(seconds=1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            name=f"shape-{marker}",
            kind=kind,
            status_code=status_code,
            status_message=status_message,
            flags=flags,
            resources={"service.name": "shape-service", **extra_resources},
            attributes={"marker": marker, **attributes, **extra_attrs},
            scope=scope or {},
        )

    spans = [
        span("error", kind=TracesKind.SPAN_KIND_SERVER, status_code=TracesStatusCode.STATUS_CODE_ERROR, status_message="boom", attributes={"str_a": "x", "num_a": 7.5, "bool_a": True}, scope={"name": "io.signoz.shape", "version": "0.1.0", "attributes": {"lib.lang": "go"}}),
        span("client", kind=TracesKind.SPAN_KIND_CLIENT, attributes={"http.url": "https://api.example.com/v1/orders", "http.request.method": "GET"}),
        span("db", kind=TracesKind.SPAN_KIND_CLIENT, attributes={"db.name": "orders_db", "db.operation": "SELECT"}),
        span("host", kind=TracesKind.SPAN_KIND_PRODUCER, attributes={"server.address": "payments.internal:8080"}),
        span("remote_yes", kind=TracesKind.SPAN_KIND_INTERNAL, flags=0x300, attributes={}),
        span("remote_no", kind=TracesKind.SPAN_KIND_CONSUMER, flags=0x100, attributes={}),
        span("remote_unknown", kind=TracesKind.SPAN_KIND_UNSPECIFIED, flags=0, attributes={}),
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    # Each span's full empty-selectFields row is derived from the span object:
    # intrinsic + calculated columns come from the fixture's own OTel-mirroring
    # computation, and the merged `attributes` map is exactly the union of the
    # typed attribute dicts. This holds identically for clean and corrupt spans,
    # since the corrupt values live only inside the `attributes` map.
    for span_obj in spans:
        marker = span_obj.attribute_string["marker"]
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[BuilderQuery(signal="traces", name="A", filter_expression=f"marker = '{marker}'").to_dict()],
        )
        assert response.status_code == HTTPStatus.OK, f"marker={marker}: {response.text}"
        rows = get_rows(response)
        assert len(rows) == 1
        data = rows[0]["data"]
        assert data == {
            "timestamp": format_timestamp(span_obj.timestamp),
            "trace_id": span_obj.trace_id,
            "span_id": span_obj.span_id,
            "trace_state": span_obj.trace_state,
            "parent_span_id": span_obj.parent_span_id,
            "flags": int(span_obj.flags),
            "name": span_obj.name,
            "kind": int(span_obj.kind),
            "kind_string": span_obj.kind_string,
            "duration_nano": int(span_obj.duration_nano),
            "status_code": int(span_obj.status_code),
            "status_message": span_obj.status_message,
            "status_code_string": span_obj.status_code_string,
            "events": span_obj.events,
            "links": span_obj.links,
            "response_status_code": span_obj.response_status_code,
            "external_http_url": span_obj.external_http_url,
            "http_url": span_obj.http_url,
            "external_http_method": span_obj.external_http_method,
            "http_method": span_obj.http_method,
            "http_host": span_obj.http_host,
            "db_name": span_obj.db_name,
            "db_operation": span_obj.db_operation,
            "has_error": span_obj.has_error,
            "is_remote": span_obj.is_remote,
            "attributes": {**span_obj.attribute_string, **span_obj.attributes_number, **span_obj.attributes_bool},
            "resource": span_obj.resources_string,
            "scope": {k: v for k, v in span_obj.scope_json.items() if v},
        }
        # `==` treats True/1 and 7.5/7.5 as equal regardless of type, so pin the
        # string/number/bool type preservation for the error span explicitly.
        if marker == "error":
            assert isinstance(data["attributes"]["str_a"], str)
            assert isinstance(data["attributes"]["num_a"], float)
            assert isinstance(data["attributes"]["bool_a"], bool)


# ============================================================================
# Ordering
# ============================================================================


@pytest.mark.parametrize("direction", ["asc", "desc"])
@pytest.mark.parametrize(
    "order_key,sort_value",
    [
        pytest.param(TelemetryFieldKey("timestamp"), lambda m: -m["ts_ago"], id="timestamp"),
        pytest.param(TelemetryFieldKey("duration_nano"), lambda m: m["duration"], id="duration_nano_intrinsic"),
        pytest.param(TelemetryFieldKey("name"), lambda m: m["name"], id="name_intrinsic"),
        pytest.param(TelemetryFieldKey("span.kind:number"), lambda m: m["kind"].value, id="kind_intrinsic"),
        pytest.param(TelemetryFieldKey("response_status_code"), lambda m: m["status"], id="response_status_code_calculated"),
        pytest.param(TelemetryFieldKey("resource.service.name"), lambda m: m["service"], id="resource_attribute"),
        pytest.param(TelemetryFieldKey("span.priority:number"), lambda m: m["priority"], id="number_span_attribute"),
    ],
)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_ordering(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    order_key: TelemetryFieldKey,
    sort_value: Callable[[dict[str, Any]], Any],
    direction: str,
) -> None:
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    metas: list[dict[str, Any]] = [
        {"marker": "A", "ts_ago": 4, "duration": 2, "name": "span-d", "kind": TracesKind.SPAN_KIND_CONSUMER, "status": "203", "service": "svc-c", "priority": 30},
        {"marker": "B", "ts_ago": 3, "duration": 4, "name": "span-c", "kind": TracesKind.SPAN_KIND_SERVER, "status": "201", "service": "svc-a", "priority": 10},
        {"marker": "C", "ts_ago": 2, "duration": 1, "name": "span-b", "kind": TracesKind.SPAN_KIND_PRODUCER, "status": "204", "service": "svc-d", "priority": 40},
        {"marker": "D", "ts_ago": 1, "duration": 3, "name": "span-a", "kind": TracesKind.SPAN_KIND_CLIENT, "status": "202", "service": "svc-b", "priority": 20},
    ]
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=m["ts_ago"]),
                duration=timedelta(seconds=m["duration"]),
                trace_id=trace_id,
                span_id=TraceIdGenerator.span_id(),
                name=m["name"],
                kind=m["kind"],
                resources={"service.name": m["service"], **extra_resources},
                attributes={"marker": m["marker"], "priority": m["priority"], "http.response.status_code": m["status"], **extra_attrs},
            )
            for m in metas
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    expected = [m["marker"] for m in sorted(metas, key=sort_value, reverse=(direction == "desc"))]

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                select_fields=[TelemetryFieldKey("span.marker")],
                order=[OrderBy(order_key, direction)],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert [row["data"]["marker"] for row in rows] == expected


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_order_multi_key_tiebreak(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    shared_ts = now - timedelta(seconds=5)
    spans = [
        Traces(
            timestamp=shared_ts,
            duration=timedelta(seconds=seconds),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            name=f"tie-{seconds}",
            resources={"service.name": "tiebreak-service", **extra_resources},
            attributes=dict(extra_attrs),
        )
        for seconds in (1, 2, 3)
    ]
    insert_traces(spans)
    by_duration_secs = {1: spans[0].span_id, 2: spans[1].span_id, 3: spans[2].span_id}

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    def query(duration_direction: str) -> list[str]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[
                BuilderQuery(
                    signal="traces",
                    name="A",
                    order=[OrderBy(TelemetryFieldKey("timestamp"), "desc"), OrderBy(TelemetryFieldKey("duration_nano"), duration_direction)],
                ).to_dict()
            ],
        )
        assert response.status_code == HTTPStatus.OK
        return [row["data"]["span_id"] for row in get_rows(response)]

    assert query("desc") == [by_duration_secs[3], by_duration_secs[2], by_duration_secs[1]]
    assert query("asc") == [by_duration_secs[1], by_duration_secs[2], by_duration_secs[3]]


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_no_default_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    The builder adds no default ORDER BY, so only membership is pinned.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            name=f"unordered-{i}",
            resources={"service.name": "no-order-service", **extra_resources},
            attributes=dict(extra_attrs),
        )
        for i in range(4)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[BuilderQuery(signal="traces", name="A", filter_expression="resource.service.name = 'no-order-service'").to_dict()],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert {row["data"]["span_id"] for row in rows} == {span.span_id for span in spans}


# ============================================================================
# Pagination
# ============================================================================


@pytest.mark.parametrize(
    "limit,offset",
    [
        pytest.param(2, 0, id="first_page"),
        pytest.param(2, 2, id="second_page"),
        pytest.param(2, 4, id="last_partial_page"),
        pytest.param(10, 0, id="limit_exceeds_count"),
        pytest.param(None, 0, id="default_limit_omitted"),
        pytest.param(2, 10, id="offset_past_end"),
    ],
)
@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_pagination(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
    limit: int | None,
    offset: int,
) -> None:
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=10 - i),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            name=f"span-{i}",
            resources={"service.name": "pagination-service", **extra_resources},
            attributes=dict(extra_attrs),
        )
        for i in range(5)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    # timestamp desc => newest span (i=4) first
    ordered_span_ids = [span.span_id for span in reversed(spans)]
    effective_limit = 100 if limit is None else limit
    expected_ids = ordered_span_ids[offset : offset + effective_limit]

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                limit=limit,
                offset=offset,
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert [row["data"]["span_id"] for row in rows] == expected_ids


# ============================================================================
# Time window
# ============================================================================


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_time_boundaries(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    The spans are second-aligned, so the ms to ns conversion lands exactly on the
    window edges.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    start_dt = datetime.now(tz=UTC).replace(microsecond=0) - timedelta(seconds=30)
    end_dt = start_dt + timedelta(seconds=10)
    mid_dt = start_dt + timedelta(seconds=5)

    trace_id = TraceIdGenerator.trace_id()
    resources = {"service.name": "boundary-service", **extra_resources}
    start_span = Traces(timestamp=start_dt, trace_id=trace_id, span_id=TraceIdGenerator.span_id(), name="at-start", resources=resources, attributes=dict(extra_attrs))
    mid_span = Traces(timestamp=mid_dt, trace_id=trace_id, span_id=TraceIdGenerator.span_id(), name="in-middle", resources=resources, attributes=dict(extra_attrs))
    end_span = Traces(timestamp=end_dt, trace_id=trace_id, span_id=TraceIdGenerator.span_id(), name="at-end", resources=resources, attributes=dict(extra_attrs))
    insert_traces([start_span, mid_span, end_span])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int(start_dt.timestamp() * 1000),
        end_ms=int(end_dt.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[BuilderQuery(signal="traces", name="A").to_dict()],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    returned = {row["data"]["span_id"] for row in rows}
    assert start_span.span_id in returned
    assert mid_span.span_id in returned
    assert end_span.span_id not in returned


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_empty_result(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="lonely-span",
                resources={"service.name": "empty-service", **extra_resources},
                attributes=dict(extra_attrs),
            )
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    # Filter matches nothing.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[BuilderQuery(signal="traces", name="A", filter_expression="resource.service.name = 'does-not-exist'").to_dict()],
    )
    assert response.status_code == HTTPStatus.OK
    assert get_rows(response) == []

    # Time window excludes the span.
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(hours=2)).timestamp() * 1000),
        end_ms=int((now - timedelta(hours=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[BuilderQuery(signal="traces", name="A").to_dict()],
    )
    assert response.status_code == HTTPStatus.OK
    assert get_rows(response) == []


# ============================================================================
# Span scope
# ============================================================================


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_span_scope(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    insert_top_level_operations: Callable[[list[tuple[str, str]]], None],
    noise: str,
) -> None:
    """
    isEntryPoint reads top_level_operations, so the entry-point span is seeded there.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    root_span_id = TraceIdGenerator.span_id()
    resources = {"service.name": "scope-svc", **extra_resources}

    root_span = Traces(
        timestamp=now - timedelta(seconds=3),
        trace_id=trace_id,
        span_id=root_span_id,
        parent_span_id="",
        name="op-root",
        kind=TracesKind.SPAN_KIND_SERVER,
        resources=resources,
        attributes=dict(extra_attrs),
    )
    entry_span = Traces(
        timestamp=now - timedelta(seconds=2),
        trace_id=trace_id,
        span_id=TraceIdGenerator.span_id(),
        parent_span_id=root_span_id,
        name="op-entry",
        kind=TracesKind.SPAN_KIND_SERVER,
        resources=resources,
        attributes=dict(extra_attrs),
    )
    internal_span = Traces(
        timestamp=now - timedelta(seconds=1),
        trace_id=trace_id,
        span_id=TraceIdGenerator.span_id(),
        parent_span_id=root_span_id,
        name="op-internal",
        kind=TracesKind.SPAN_KIND_INTERNAL,
        resources=resources,
        attributes=dict(extra_attrs),
    )
    insert_traces([root_span, entry_span, internal_span])
    insert_top_level_operations([("op-entry", "scope-svc")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    def query_scope(expression: str) -> list[str]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[BuilderQuery(signal="traces", name="A", filter_expression=expression).to_dict()],
        )
        assert response.status_code == HTTPStatus.OK, response.text
        return [row["data"]["span_id"] for row in get_rows(response)]

    assert query_scope("isRoot = 'true'") == [root_span.span_id]
    assert query_scope("isEntryPoint = 'true'") == [entry_span.span_id]


# ============================================================================
# Field-key resolution over corrupt metadata
# ============================================================================


@pytest.mark.parametrize(
    "payload,status_code,expected",
    [
        # Case 1: order by timestamp; empty selectFields returns the full
        # response shape (all intrinsic + calculated columns plus the merged
        # `attributes` and `resource` maps, every value derived from the inserted
        # span object). x[3] (topic-service) is latest.
        pytest.param(
            BuilderQuery(signal="traces", name="A", order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")], limit=1),
            HTTPStatus.OK,
            lambda x: {
                "timestamp": format_timestamp(x[3].timestamp),
                "trace_id": x[3].trace_id,
                "span_id": x[3].span_id,
                "trace_state": x[3].trace_state,
                "parent_span_id": x[3].parent_span_id,
                "flags": int(x[3].flags),
                "name": x[3].name,
                "kind": int(x[3].kind),
                "kind_string": x[3].kind_string,
                "duration_nano": int(x[3].duration_nano),
                "status_code": int(x[3].status_code),
                "status_message": x[3].status_message,
                "status_code_string": x[3].status_code_string,
                "events": x[3].events,
                "links": x[3].links,
                "response_status_code": x[3].response_status_code,
                "external_http_url": x[3].external_http_url,
                "http_url": x[3].http_url,
                "external_http_method": x[3].external_http_method,
                "http_method": x[3].http_method,
                "http_host": x[3].http_host,
                "db_name": x[3].db_name,
                "db_operation": x[3].db_operation,
                "has_error": x[3].has_error,
                "is_remote": x[3].is_remote,
                "attributes": {**x[3].attribute_string, **x[3].attributes_number, **x[3].attributes_bool},
                "resource": x[3].resources_string,
                "scope": {k: v for k, v in x[3].scope_json.items() if v},
            },
            id="order_timestamp_full_shape",
        ),
        # Case 2: order by attribute.timestamp. The key resolves to the intrinsic
        # span.timestamp column, so the latest span (x[3]) is returned with the
        # same full response shape as Case 1.
        pytest.param(
            BuilderQuery(signal="traces", name="A", order=[OrderBy(TelemetryFieldKey("attribute.timestamp"), "desc")], limit=1),
            HTTPStatus.OK,
            lambda x: {
                "timestamp": format_timestamp(x[3].timestamp),
                "trace_id": x[3].trace_id,
                "span_id": x[3].span_id,
                "trace_state": x[3].trace_state,
                "parent_span_id": x[3].parent_span_id,
                "flags": int(x[3].flags),
                "name": x[3].name,
                "kind": int(x[3].kind),
                "kind_string": x[3].kind_string,
                "duration_nano": int(x[3].duration_nano),
                "status_code": int(x[3].status_code),
                "status_message": x[3].status_message,
                "status_code_string": x[3].status_code_string,
                "events": x[3].events,
                "links": x[3].links,
                "response_status_code": x[3].response_status_code,
                "external_http_url": x[3].external_http_url,
                "http_url": x[3].http_url,
                "external_http_method": x[3].external_http_method,
                "http_method": x[3].http_method,
                "http_host": x[3].http_host,
                "db_name": x[3].db_name,
                "db_operation": x[3].db_operation,
                "has_error": x[3].has_error,
                "is_remote": x[3].is_remote,
                "attributes": {**x[3].attribute_string, **x[3].attributes_number, **x[3].attributes_bool},
                "resource": x[3].resources_string,
                "scope": {k: v for k, v in x[3].scope_json.items() if v},
            },
            id="order_attribute_timestamp_full_shape",
        ),
        # Case 3: select timestamp with empty order by.
        pytest.param(
            BuilderQuery(signal="traces", name="A", select_fields=[TelemetryFieldKey("timestamp")], limit=1),
            HTTPStatus.OK,
            lambda x: {"span_id": x[2].span_id, "timestamp": format_timestamp(x[2].timestamp), "trace_id": x[2].trace_id},
            id="select_timestamp",
        ),
        # Case 4: select attribute.timestamp with empty order by. The key resolves
        # to the intrinsic timestamp column, projecting the default id columns.
        pytest.param(
            BuilderQuery(signal="traces", name="A", filter_expression="attribute.timestamp exists", select_fields=[TelemetryFieldKey("attribute.timestamp")], limit=1),
            HTTPStatus.OK,
            lambda x: {"span_id": x[0].span_id, "timestamp": format_timestamp(x[0].timestamp), "trace_id": x[0].trace_id},
            id="select_attribute_timestamp",
        ),
        # Case 5: select timestamp with timestamp order by.
        pytest.param(
            BuilderQuery(signal="traces", name="A", select_fields=[TelemetryFieldKey("timestamp")], limit=1, order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")]),
            HTTPStatus.OK,
            lambda x: {"span_id": x[0].span_id, "timestamp": format_timestamp(x[0].timestamp), "trace_id": x[0].trace_id},
            id="select_timestamp_order_timestamp",
        ),
        # Case 6: select duration_nano with duration order by (longest span x[1]).
        pytest.param(
            BuilderQuery(signal="traces", name="A", select_fields=[TelemetryFieldKey("duration_nano")], limit=1, order=[OrderBy(TelemetryFieldKey("duration_nano"), "desc")]),
            HTTPStatus.OK,
            lambda x: {"duration_nano": int(x[1].duration_nano), "span_id": x[1].span_id, "timestamp": format_timestamp(x[1].timestamp), "trace_id": x[1].trace_id},
            id="select_duration",
        ),
        # Case 7: select attribute.duration_nano with attribute.duration_nano order
        # by — the explicit `attribute.` prefix reaches the attribute value.
        pytest.param(
            BuilderQuery(signal="traces", name="A", select_fields=[TelemetryFieldKey("attribute.duration_nano")], filter_expression="attribute.duration_nano exists", limit=1, order=[OrderBy(TelemetryFieldKey("attribute.duration_nano"), "desc")]),
            HTTPStatus.OK,
            lambda x: {"duration_nano": "corrupt_data", "span_id": x[3].span_id, "timestamp": format_timestamp(x[3].timestamp), "trace_id": x[3].trace_id},
            id="select_attribute_duration",
        ),
        # Case 8: select attribute.duration_nano with intrinsic duration order by —
        # the longest span x[1] has no such attribute, so it falls back to the
        # intrinsic duration_nano value.
        pytest.param(
            BuilderQuery(signal="traces", name="A", select_fields=[TelemetryFieldKey("attribute.duration_nano")], limit=1, order=[OrderBy(TelemetryFieldKey("duration_nano"), "desc")]),
            HTTPStatus.OK,
            lambda x: {"duration_nano": int(x[1].duration_nano), "span_id": x[1].span_id, "timestamp": format_timestamp(x[1].timestamp), "trace_id": x[1].trace_id},
            id="select_attribute_duration_order_intrinsic",
        ),
        # Case 9: filter on the intrinsic scope.version. Only x[1] should match.
        pytest.param(
            BuilderQuery(signal="traces", name="A", select_fields=[TelemetryFieldKey("timestamp")], filter_expression="scope.version = '1.0.0'", limit=1),
            HTTPStatus.OK,
            lambda x: {"span_id": x[1].span_id, "timestamp": format_timestamp(x[1].timestamp), "trace_id": x[1].trace_id},
            id="filter_scope_version",
        ),
    ],
)
def test_traces_list_with_corrupt_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    payload: BuilderQuery,
    status_code: HTTPStatus,
    expected: Callable[[list[Traces]], dict[str, Any]],
) -> None:
    traces = generate_traces_with_corrupt_metadata()
    insert_traces(traces)
    # traces[i] occurred before traces[j] where i < j.

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[payload.to_dict()],
    )

    assert response.status_code == status_code

    if response.status_code == HTTPStatus.OK:
        assert get_rows(response)[0]["data"] == expected(traces)


@pytest.mark.parametrize(
    "filter_expression,expected_indices",
    [
        # Intrinsic scope.name / scope.version resolve to the JSON sub-columns.
        pytest.param("scope.name = 'io.signoz.payment'", [1], id="intrinsic_scope_name"),
        pytest.param("scope.version = '2.3.1'", [0], id="intrinsic_scope_version"),
        # A scope attribute resolves against the scope JSON column's attributes.
        pytest.param("scope.telemetry.sdk.language = 'python'", [1], id="scope_attribute"),
        # A scope attribute whose own name carries a `scope.` prefix. `scope.prefixed`
        # normalizes to {prefixed, scope} and must still resolve to the attribute.
        pytest.param("scope.prefixed = 'prefixed-val'", [0], id="scope_prefixed_attribute"),
        # `env.tier` is a span attribute on span 0 and a scope attribute on
        # span 1. Unprefixed -> no explicit context, so it is checked in every
        # applicable context (attribute OR scope) and both spans match.
        pytest.param("env.tier = 'gold'", [0, 1], id="bare_cross_context"),
        # The explicit `scope.` prefix forces scope context only, so span 0's
        # span attribute is ignored — only span 1 matches.
        pytest.param("scope.env.tier = 'gold'", [1], id="scope_prefixed_cross_context"),
        # `scope.name` names both homes it can resolve to: the declared scope.name field
        # (span 0) and a same-named `name` scope attribute (span 1), the same way any
        # other name colliding across contexts unions. `scope.attribute.name` addresses
        # the attribute alone.
        pytest.param("scope.name = 'io.signoz.checkout'", [0, 1], id="scope_name_unions_attribute"),
        # The `scope.name` spelling is also a real stored key: span 2 carries a span
        # attribute literally named `scope.name`, so it matches too.
        pytest.param("scope.name = 'attr-scope-name'", [2], id="scope_name_matches_stored_spelling"),
        # The explicit `scope.attribute.` prefix addresses the scope attribute alone, without
        # the declared path. Span 1 has a `name` scope attribute = 'io.signoz.checkout'.
        pytest.param("scope.attribute.name = 'io.signoz.checkout'", [1], id="scope_attribute_name"),
        # `version` as a scope attribute: no span carries one (span 1's 4.5.6 is the declared
        # scope.version, not a scope attribute), so this matches nothing.
        pytest.param("scope.attribute.version = '4.5.6'", [], id="scope_attribute_version_none"),
        # An unprefixed `name` is checked in every applicable context: the span `name`
        # column (span 2) and a `name` scope attribute (span 1). It does not reach the
        # declared scope.name field (span 0), which only the `scope.` prefix addresses.
        pytest.param("name = 'io.signoz.checkout'", [1, 2], id="bare_name_unions_scope_attribute"),
        # A value that no resolvable key holds (scope.name/scope.version field,
        # a `name`/`version` scope attribute, or a same-named attribute/resource)
        # returns nothing.
        pytest.param("scope.version = 'corrupt_data'", [], id="scope_version_no_match"),
        pytest.param("scope.name = 'corrupt_data'", [], id="scope_name_no_match"),
    ],
)
def test_traces_list_with_scope_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    filter_expression: str,
    expected_indices: list[int],
) -> None:
    """
    `scope.name` and `scope.version` resolve to the declared JSON sub-column and to
    a same-named scope attribute; `scope.attribute.` addresses the attribute alone.
    A bare `name` reaches the span name column and a `name` scope attribute, never
    the declared scope.name.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    span_ids = [TraceIdGenerator.span_id() for _ in range(3)]

    traces = [
        Traces(
            timestamp=now - timedelta(seconds=4),
            duration=timedelta(seconds=2),
            trace_id=trace_id,
            span_id=span_ids[0],
            parent_span_id="",
            name="GET /checkout",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "checkout"},
            attributes={"http.request.method": "GET", "env.tier": "gold"},
            scope={
                "name": "io.signoz.checkout",
                "version": "2.3.1",
                # a scope attribute whose own name carries a `scope.` prefix
                "attributes": {"telemetry.sdk.language": "go", "scope.prefixed": "prefixed-val"},
            },
        ),
        Traces(
            timestamp=now - timedelta(seconds=2),
            duration=timedelta(seconds=1),
            trace_id=trace_id,
            span_id=span_ids[1],
            parent_span_id="",
            name="POST /pay",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "payment"},
            attributes={"http.request.method": "POST"},
            # env.tier is a scope attribute here (cross-context with span 0);
            # `name` is a scope attribute colliding with span 0's scope.name.
            scope={
                "name": "io.signoz.payment",
                "version": "4.5.6",
                "attributes": {
                    "telemetry.sdk.language": "python",
                    "env.tier": "gold",
                    "name": "io.signoz.checkout",
                },
            },
        ),
        Traces(
            timestamp=now - timedelta(seconds=1),
            duration=timedelta(seconds=1),
            trace_id=trace_id,
            span_id=span_ids[2],
            parent_span_id="",
            # span name collides with span 0's scope.name value
            name="io.signoz.checkout",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": "probe"},
            # a span attribute named `scope.name`
            attributes={"scope.name": "attr-scope-name"},
            scope={"name": "span-gamma", "version": "9.9.9"},
        ),
    ]
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                select_fields=[TelemetryFieldKey("timestamp")],
                filter_expression=filter_expression,
                limit=10,
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    got_span_ids = {row["data"]["span_id"] for row in get_rows(response)}
    expected_span_ids = {traces[i].span_id for i in expected_indices}
    assert got_span_ids == expected_span_ids


@pytest.mark.parametrize("surface", ["filter", "select", "order"])
def test_traces_list_unknown_span_context_synthesizes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    surface: str,
) -> None:
    """
    An unknown key under the `span.` context synthesizes against the attribute maps
    instead of erroring: existence is a property of the data, not of the metadata.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    span = Traces(
        timestamp=now - timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        name="forgiving-ctx-span",
        resources={"service.name": "forgiving-ctx-service"},
    )
    insert_traces([span])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)
    key = "span.does_not_exist"
    svc = "resource.service.name = 'forgiving-ctx-service'"

    if surface == "filter":
        query = BuilderQuery(signal="traces", name="A", filter_expression=f"{svc} AND {key} = 'nope'")
    elif surface == "select":
        query = BuilderQuery(signal="traces", name="A", filter_expression=svc, select_fields=[TelemetryFieldKey(key)])
    else:  # order
        query = BuilderQuery(signal="traces", name="A", filter_expression=svc, order=[OrderBy(TelemetryFieldKey(key), "desc")])

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[query.to_dict()],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)

    if surface == "filter":
        assert rows == []
        messages = [w.get("message", "") for w in get_all_warnings(response.json())]
        assert any("does_not_exist" in m and "not found" in m for m in messages), messages
    elif surface == "select":
        assert {span.span_id} == {row["data"]["span_id"] for row in rows}
        for row in rows:
            assert row["data"]["does_not_exist"] is None
    else:  # order
        assert {span.span_id} == {row["data"]["span_id"] for row in rows}


@pytest.mark.parametrize("context", ["attribute", "resource"])
@pytest.mark.parametrize("surface", ["select", "order"])
def test_traces_list_unknown_other_context_synthesizes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    context: str,
    surface: str,
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            name=f"synth-{i}",
            resources={"service.name": "synth-service"},
        )
        for i in range(3)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)
    key = f"{context}.does_not_exist"
    svc = "resource.service.name = 'synth-service'"

    if surface == "filter":
        query = BuilderQuery(signal="traces", name="A", filter_expression=f"{svc} AND {key} = 'nope'")
    elif surface == "select":
        query = BuilderQuery(signal="traces", name="A", filter_expression=svc, select_fields=[TelemetryFieldKey(key)])
    else:  # order
        query = BuilderQuery(signal="traces", name="A", filter_expression=svc, order=[OrderBy(TelemetryFieldKey(key), "desc")])

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[query.to_dict()],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)

    if surface == "filter":
        assert rows == []
    elif surface == "select":
        assert {span.span_id for span in spans} == {row["data"]["span_id"] for row in rows}
        for row in rows:
            assert row["data"]["does_not_exist"] is None
    else:  # order
        assert {span.span_id for span in spans} == {row["data"]["span_id"] for row in rows}


def test_traces_list_order_unknown_key_synthesizes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            name=f"order-unknown-{i}",
            resources={"service.name": "order-unknown-service"},
        )
        for i in range(3)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=1)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal="traces",
                name="A",
                filter_expression="resource.service.name = 'order-unknown-service'",
                order=[OrderBy(TelemetryFieldKey("does_not_exist"), "desc")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert {row["data"]["span_id"] for row in rows} == {span.span_id for span in spans}
