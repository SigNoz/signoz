from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import RequestType, build_aggregation, build_traces_scalar_query, get_preview_statements, make_preview_query_request
from fixtures.traces import ATTRIBUTE_JSON_ROLLOUT_TIME, Traces

PROMOTED_PATHS = "/api/v1/promoted_paths"


def test_traces_filters_use_skip_indexes(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
    request: pytest.FixtureRequest,
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(PROMOTED_PATHS),
        json=[
            {"signal": "traces", "context": "attribute", "path": "index.number_probe", "indexes": [{"fieldDataType": "number", "type": "bloom_filter(0.01)", "granularity": 64}]},
            {"signal": "traces", "context": "attribute", "path": "index.string_probe", "indexes": [{"fieldDataType": "string", "type": "bloom_filter(0.01)", "granularity": 64}]},
        ],
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    cluster = signoz.telemetrystore.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    for index_name in ("attributes.index.number_probe_float64_bloom_filter", "attributes.index.string_probe_string_bloom_filter"):
        request.addfinalizer(lambda index_name=index_name: signoz.telemetrystore.conn.query(f"ALTER TABLE signoz_traces.signoz_index_v3 ON CLUSTER '{cluster}' DROP INDEX IF EXISTS `{index_name}`"))

    resp = requests.post(
        signoz.self.host_configs["8080"].get(PROMOTED_PATHS),
        json=[{"signal": "traces", "context": "attribute", "path": "index.bool_probe", "indexes": [{"fieldDataType": "bool", "type": "bloom_filter(0.01)", "granularity": 64}]}],
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.BAD_REQUEST, resp.text

    now = datetime.now(tz=UTC)
    insert_traces([Traces(timestamp=now - timedelta(seconds=10), attributes={"index.number_probe": 200, "index.string_probe": "probe"})])

    for filter_expression, index_name in [
        ("index.number_probe = 200", "attributes.index.number_probe_float64_bloom_filter"),
        ("index.string_probe = 'probe'", "attributes.index.string_probe_string_bloom_filter"),
        ("name = 'probe'", "idx_name"),
        ("duration_nano > 100", "idx_duration"),
        ("kind = 2", "idx_kind"),
        ("kind_string = 'Server'", "idx_kind_string"),
        ("status_code_string = 'Ok'", "idx_status_code_string"),
        ("response_status_code = '200'", "idx_response_statusCode"),
        ("http_method = 'GET'", "idx_http_method"),
        ("http_url = 'probe'", "idx_http_url"),
        ("http_host = 'probe'", "idx_http_host"),
        ("trace_id = '0af7651916cd43dd8448eb211c80319c'", "idx_trace_id"),
        ("span_id = 'b7ad6b7169203331'", "idx_span_id"),
    ]:
        statements = get_preview_statements(
            make_preview_query_request(
                signoz,
                token,
                start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
                end_ms=int(now.timestamp() * 1000),
                request_type=RequestType.SCALAR,
                # count() over primary-key filters is answered by the exact count projection, which reads no index
                queries=[build_traces_scalar_query(aggregations=[build_aggregation("sum(duration_nano)")], filter_expression=filter_expression)],
            ),
            "A",
        )
        used = {step["name"] for statement in statements for read in (statement["granules"] or {}).get("reads", []) for step in read["steps"]}
        assert index_name in used, f"{filter_expression}: {used}"
