from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import RequestType, build_aggregation, build_traces_scalar_query, get_preview_statements, make_preview_query_request
from fixtures.traces import ATTRIBUTE_JSON_ROLLOUT_TIME, Traces

PROMOTED_PATHS = "/api/v1/promoted_paths"


def test_traces_number_index_prunes_granules(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(PROMOTED_PATHS),
        json=[{"signal": "traces", "context": "attribute", "path": "index.number_probe", "indexes": [{"fieldDataType": "number", "type": "bloom_filter(0.01)", "granularity": 64}]}],
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    [(index_name,)] = signoz.telemetrystore.conn.query("SELECT name FROM system.data_skipping_indices WHERE database = 'signoz_traces' AND table = 'signoz_index_v3' AND expr LIKE 'toFloat64OrNull(%index.number_probe%'").result_rows

    # a window no other test writes to, so every granule read was written after the index existed
    window = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(days=1)
    insert_traces([Traces(timestamp=window, attributes={"index.number_probe": 200}) for _ in range(3)])

    for filter_expression, prunes in [("index.number_probe = 404", True), ("index.number_probe = 200", False)]:
        preview = make_preview_query_request(
            signoz,
            token,
            start_ms=int((window - timedelta(minutes=1)).timestamp() * 1000),
            end_ms=int((window + timedelta(minutes=1)).timestamp() * 1000),
            request_type=RequestType.SCALAR,
            queries=[build_traces_scalar_query(aggregations=[build_aggregation("count()")], filter_expression=filter_expression)],
        )
        statements = get_preview_statements(preview, "A")
        assert all(statement["granules"] for statement in statements), preview.json()["data"]["compositeQuery"]["A"]["warnings"]
        steps = [step for statement in statements for read in statement["granules"]["reads"] for step in read["steps"] if step["name"] == index_name]
        assert steps, f"{index_name} not used for {filter_expression}: {statements}"
        assert sum(step["initialGranules"] for step in steps) > 0, filter_expression
        assert (sum(step["selectedGranules"] for step in steps) == 0) == prunes, steps
