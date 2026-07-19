from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_traces_scalar_query,
    index_series_by_label,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode, trace_noise

# min()/max() aggregation expressions over duration_nano, grouped by service.name
# (the time_series counterpart of the scalar min/max in 02_aggregation.py). Under
# the shared clean/corrupt factor a same-named string attribute duration_nano must
# not divert the aggregation off the numeric intrinsic column.


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_aggregate_min_max(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    Setup:
    http-service: 3 spans (3s / 0.5s / 1s); topic-service: 1 span (4s).

    Tests:
    max(duration_nano) / min(duration_nano) grouped by service.name return each
    service's duration extremes, derived from the inserted spans.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    specs = [
        ("http-service", 3, "POST /x", TracesKind.SPAN_KIND_SERVER),
        ("http-service", 0.5, "SELECT", TracesKind.SPAN_KIND_CLIENT),
        ("http-service", 1, "PATCH", TracesKind.SPAN_KIND_CLIENT),
        ("topic-service", 4, "topic publish", TracesKind.SPAN_KIND_PRODUCER),
    ]
    spans = [
        Traces(
            timestamp=now - timedelta(seconds=i + 1),
            duration=timedelta(seconds=dur_s),
            trace_id=TraceIdGenerator.trace_id(),
            span_id=TraceIdGenerator.span_id(),
            name=name,
            kind=kind,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": service, **extra_resources},
            attributes=dict(extra_attrs),
        )
        for i, (service, dur_s, name, kind) in enumerate(specs)
    ]
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int((now + timedelta(seconds=5)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                aggregations=[
                    build_aggregation("max(duration_nano)", "maxDuration"),
                    build_aggregation("min(duration_nano)", "minDuration"),
                ],
                group_by=[build_group_by_field("service.name", "string", "resource")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    aggregations = response.json()["data"]["data"]["results"][0]["aggregations"]
    max_by_svc = index_series_by_label(aggregations[0]["series"], "service.name")
    min_by_svc = index_series_by_label(aggregations[1]["series"], "service.name")

    durations_by_service: dict[str, list[int]] = {}
    for span, (service, *_rest) in zip(spans, specs, strict=True):
        durations_by_service.setdefault(service, []).append(int(span.duration_nano))

    for service, durations in durations_by_service.items():
        assert max_by_svc[service]["values"][0]["value"] == max(durations)
        assert min_by_svc[service]["values"][0]["value"] == min(durations)
