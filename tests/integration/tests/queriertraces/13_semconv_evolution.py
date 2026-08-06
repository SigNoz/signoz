"""Phase 1 end-to-end checks for semantic-convention name evolution."""

from collections.abc import Callable
from datetime import datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.semconv import SEMCONV_PHASE1_CURRENT as CURRENT
from fixtures.semconv import SEMCONV_PHASE1_OLD as OLD
from fixtures.semconv import SEMCONV_PHASE1_PREFIX as PREFIX

PRODUCTION_SPANS = {
    f"{PREFIX}-old",
    f"{PREFIX}-current",
    f"{PREFIX}-both",
    f"{PREFIX}-conflict",
}
STAGING_SPANS = {f"{PREFIX}-staging"}
MISSING_SPANS = {f"{PREFIX}-missing"}


def test_semconv_phase1_mixed_sdk_generations(  # pylint: disable=too-many-statements
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    semconv_phase1_data: datetime,
) -> None:
    now = semconv_phase1_data
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=2)).timestamp() * 1000)
    end_ms = int((now + timedelta(minutes=1)).timestamp() * 1000)

    # A builder response records the exact spelling that was resolved. Raw SQL
    # and PromQL deliberately do not use this resolver.
    resolution_response = querier.make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=querier.RequestType.RAW,
        queries=[
            querier.BuilderQuery(
                signal="traces",
                name="A",
                limit=1,
                filter_expression=f"resource.{OLD} EXISTS",
            ).to_dict()
        ],
    )
    assert resolution_response.status_code == HTTPStatus.OK, resolution_response.text
    assert {
        "requested": OLD,
        "current": CURRENT,
        "members": [CURRENT, OLD],
        "kind": "attribute",
    } in resolution_response.json()["data"]["meta"]["semconvResolutions"]

    # Resource and span-attribute paths share the same matrix. Run every
    # operator with both the saved-query (old) and current request spellings.
    for context in ("resource", "attribute"):
        for requested in (CURRENT, OLD):
            field = f"{context}.{requested}"
            query_cases = {
                "production": (f"{field} = 'production'", PRODUCTION_SPANS),
                "staging": (f"{field} = 'staging'", STAGING_SPANS),
                # Negative operators intentionally include rows where no family
                # member exists; explicit EXISTS is the opt-in presence filter.
                "negative": (f"{field} != 'production'", STAGING_SPANS | MISSING_SPANS),
                "exists": (f"{field} EXISTS", PRODUCTION_SPANS | STAGING_SPANS),
                "not_exists": (f"{field} NOT EXISTS", MISSING_SPANS),
            }
            matrix_response = querier.make_query_request(
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
                        order=[querier.OrderBy(querier.TelemetryFieldKey("timestamp"), "asc")],
                    ).to_dict()
                    for name, (expression, _) in query_cases.items()
                ],
            )
            assert matrix_response.status_code == HTTPStatus.OK, matrix_response.text
            matrix_results = matrix_response.json()["data"]["data"]["results"]
            for name, (_, expected_names) in query_cases.items():
                result = querier.find_named_result(matrix_results, name)
                assert result is not None, name
                assert {row["data"]["name"] for row in (result.get("rows") or [])} == expected_names

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
                        group_by=[querier.TelemetryFieldKey(requested, "string", context)],
                        order=[querier.OrderBy(querier.TelemetryFieldKey(requested, "string", context), "asc")],
                    ).to_dict()
                ],
            )
            assert grouped_response.status_code == HTTPStatus.OK, grouped_response.text
            grouped_results = grouped_response.json()["data"]["data"]["results"]
            assert len(grouped_results) == 1
            assert grouped_results[0]["columns"][0]["name"] == requested, "response identity must match the request spelling"
            assert grouped_results[0]["data"] == [["production", 4], ["staging", 1]]

        for requested in (CURRENT, OLD):
            values_response = requests.get(
                signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
                timeout=5,
                headers={"authorization": f"Bearer {token}"},
                params={
                    "signal": "traces",
                    "name": requested,
                    "fieldContext": context,
                    "fieldDataType": "string",
                },
            )
            assert values_response.status_code == HTTPStatus.OK, values_response.text
            assert set(values_response.json()["data"]["values"].get("stringValues") or []) == {"production", "staging"}

    keys_response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "traces", "searchText": OLD},
    )
    assert keys_response.status_code == HTTPStatus.OK, keys_response.text
    keys = keys_response.json()["data"]["keys"]
    assert CURRENT in keys
    assert OLD in keys

    start_ns = str(int((now - timedelta(minutes=2)).timestamp() * 1_000_000_000))
    end_ns = str(int((now + timedelta(minutes=1)).timestamp() * 1_000_000_000))
    for requested in (CURRENT, OLD):
        services_response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/services"),
            timeout=30,
            headers={"authorization": f"Bearer {token}"},
            json={
                "start": start_ns,
                "end": end_ns,
                "tags": [
                    {
                        "Key": requested,
                        "Operator": "In",
                        "StringValues": ["production"],
                        "TagType": "ResourceAttribute",
                    }
                ],
            },
        )
        assert services_response.status_code == HTTPStatus.OK, services_response.text
        services = {item["serviceName"] for item in services_response.json()["data"]}
        assert services == PRODUCTION_SPANS

        map_response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/dependency_graph"),
            timeout=30,
            headers={"authorization": f"Bearer {token}"},
            json={
                "start": start_ns,
                "end": end_ns,
                "tags": [
                    {
                        "key": requested,
                        "operator": "In",
                        "stringValues": ["production"],
                        "tagType": "ResourceAttribute",
                    }
                ],
            },
        )
        assert map_response.status_code == HTTPStatus.OK, map_response.text
        assert {edge["parent"] for edge in map_response.json()} == {f"{PREFIX}-map-production"}

    report_response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/semconv-migration"),
        timeout=30,
        headers={"authorization": f"Bearer {token}"},
        params={
            "startUnixMilli": int((now - timedelta(minutes=2)).timestamp() * 1000),
            "endUnixMilli": int((now + timedelta(minutes=1)).timestamp() * 1000),
        },
    )
    assert report_response.status_code == HTTPStatus.OK, report_response.text
    entry = next(item for item in report_response.json()["data"]["entries"] if item["current"] == CURRENT and item["old"] == OLD and item["signal"] == "traces")
    assert set(entry["services"]) == {f"{PREFIX}-old", f"{PREFIX}-staging"}
