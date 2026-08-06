"""Phase 4 matrix for every newly enabled attribute-name family."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

PREFIX = "semconv-phase4"


@dataclass(frozen=True)
class Family:
    current: str
    old: str
    match: str | int = "match"
    legacy: str | int = "legacy"
    other: str | int = "other"
    data_type: str = "string"


FAMILIES = (
    Family("db.namespace", "db.name"),
    Family("db.operation.name", "db.operation"),
    Family("db.query.text", "db.statement"),
    Family("rpc.system.name", "rpc.system"),
    Family("service.peer.name", "peer.service"),
    Family("messaging.destination.name", "messaging.destination"),
    Family("messaging.operation.type", "messaging.operation"),
    Family("messaging.consumer.group.name", "messaging.kafka.consumer.group"),
    Family("messaging.client.id", "messaging.client_id"),
    Family("container.runtime.name", "container.runtime"),
    Family("code.file.path", "code.filepath"),
    Family("code.function.name", "code.function"),
    Family(
        "code.line.number",
        "code.lineno",
        match=200,
        legacy=400,
        other=500,
        data_type="float64",
    ),
    Family("http.request.method", "http.method"),
    Family(
        "http.response.status_code",
        "http.status_code",
        match=200,
        legacy=400,
        other=500,
        data_type="float64",
    ),
    Family("url.full", "http.url"),
    Family("url.scheme", "http.scheme"),
    Family("user_agent.original", "http.user_agent"),
)

MATCH_SPANS = {f"{PREFIX}-{suffix}" for suffix in ("old", "current", "both", "conflict")}
OTHER_SPANS = {f"{PREFIX}-other"}
PRESENT_SPANS = MATCH_SPANS | OTHER_SPANS
MISSING_SPANS = {f"{PREFIX}-missing"}


def test_phase4_enabled_families_pass_current_old_conflict_matrix(  # pylint: disable=too-many-statements
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0) - timedelta(minutes=1)
    records = (
        (now - timedelta(seconds=6), "old", "old"),
        (now - timedelta(seconds=5), "current", "current"),
        (now - timedelta(seconds=4), "both", "both"),
        (now - timedelta(seconds=3), "conflict", "conflict"),
        (now - timedelta(seconds=2), "other", "other"),
        (now - timedelta(seconds=1), "missing", "missing"),
    )
    spans = []
    for timestamp, suffix, mode in records:
        attributes: dict[str, str | int] = {}
        for family in FAMILIES:
            if mode == "old":
                attributes[family.old] = family.match
            elif mode == "current":
                attributes[family.current] = family.match
            elif mode == "both":
                attributes[family.old] = family.match
                attributes[family.current] = family.match
            elif mode == "conflict":
                attributes[family.old] = family.legacy
                attributes[family.current] = family.match
            elif mode == "other":
                attributes[family.old] = family.other

        spans.append(
            Traces(
                timestamp=timestamp,
                duration=timedelta(milliseconds=10),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name=f"{PREFIX}-{suffix}",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": PREFIX},
                attributes=attributes,
            )
        )
    insert_traces(spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=2)).timestamp() * 1000)
    end_ms = int((now + timedelta(minutes=1)).timestamp() * 1000)

    for family in FAMILIES:
        match_literal = f"'{family.match}'" if family.data_type == "string" else str(family.match)
        for requested in (family.current, family.old):
            field = f"attribute.{requested}"
            query_cases = {
                "positive": (f"{field} = {match_literal}", MATCH_SPANS),
                # Negative operators include rows without any family member;
                # explicit EXISTS is the opt-in presence filter.
                "negative": (f"{field} != {match_literal}", OTHER_SPANS | MISSING_SPANS),
                "exists": (f"{field} EXISTS", PRESENT_SPANS),
                "not_exists": (f"{field} NOT EXISTS", MISSING_SPANS),
            }
            raw_response = querier.make_query_request(
                signoz,
                token,
                start_ms=start_ms,
                end_ms=end_ms,
                request_type=querier.RequestType.RAW,
                queries=[
                    querier.BuilderQuery(
                        signal="traces",
                        name=name,
                        limit=100,
                        filter_expression=expression,
                        select_fields=[querier.TelemetryFieldKey("span.name")],
                    ).to_dict()
                    for name, (expression, _) in query_cases.items()
                ],
            )
            assert raw_response.status_code == HTTPStatus.OK, raw_response.text
            raw_results = raw_response.json()["data"]["data"]["results"]
            for name, (_, expected_names) in query_cases.items():
                result = querier.find_named_result(raw_results, name)
                assert result is not None, name
                assert {row["data"]["name"] for row in (result.get("rows") or [])} == expected_names, family

            resolutions = raw_response.json()["data"]["meta"]["semconvResolutions"]
            resolution = next(item for item in resolutions if item["requested"] == requested)
            assert resolution["current"] == family.current
            assert family.old in resolution["members"]

            grouped_response = querier.make_query_request(
                signoz,
                token,
                start_ms=start_ms,
                end_ms=end_ms,
                request_type=querier.RequestType.SCALAR,
                queries=[
                    querier.BuilderQuery(
                        signal="traces",
                        name="A",
                        filter_expression=f"{field} EXISTS",
                        aggregations=[querier.Aggregation("count()")],
                        group_by=[querier.TelemetryFieldKey(requested, family.data_type, "attribute")],
                        order=[
                            querier.OrderBy(
                                querier.TelemetryFieldKey(requested, family.data_type, "attribute"),
                                "asc",
                            )
                        ],
                    ).to_dict()
                ],
            )
            assert grouped_response.status_code == HTTPStatus.OK, grouped_response.text
            grouped_result = querier.find_named_result(
                grouped_response.json()["data"]["data"]["results"],
                "A",
            )
            assert grouped_result is not None
            assert grouped_result["columns"][0]["name"] == requested
            assert grouped_result["data"] == [
                [str(family.match), 4],
                [str(family.other), 1],
            ]

            values_response = requests.get(
                signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
                timeout=5,
                headers={"authorization": f"Bearer {token}"},
                params={
                    "signal": "traces",
                    "name": requested,
                    "fieldContext": "attribute",
                    "fieldDataType": family.data_type,
                },
            )
            assert values_response.status_code == HTTPStatus.OK, values_response.text
            value_key = "stringValues" if family.data_type == "string" else "numberValues"
            assert set(values_response.json()["data"]["values"].get(value_key) or []) == {
                family.legacy,
                family.match,
                family.other,
            }

        # The keys endpoint remains literal: every observed spelling is
        # discoverable on its own search without synthetic family expansion.
        for suggested in (family.current, family.old):
            keys_response = requests.get(
                signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
                timeout=5,
                headers={"authorization": f"Bearer {token}"},
                params={"signal": "traces", "searchText": suggested},
            )
            assert keys_response.status_code == HTTPStatus.OK, keys_response.text
            assert suggested in keys_response.json()["data"]["keys"]
