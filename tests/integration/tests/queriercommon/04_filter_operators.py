from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import get_column_data_from_response, make_query_request

# Filter-operator coverage that 01_filter_expression.py (NOT semantics) and
# 06_json_body.py (CONTAINS) leave out: ILIKE / NOT LIKE / NOT CONTAINS, the
# `key:number` data-type-suffix disambiguator on an ambiguous key, and a
# truly-unknown key (rejected as a bad request on this HEAD).
#
# Data model mirrors 01_filter_expression.py::test_not_filter_expression:
#   alpha-log: resources region="us-east"; attributes status_code=200 (number)
#   beta-log:  resources status_code="500" (string); attributes region=1 (number)
# so region/status_code each appear as both a resource and an attribute across the
# two logs — the intentional overlap that context prefix + :type disambiguate.


@pytest.mark.parametrize(
    "expression,expected_bodies",
    [
        pytest.param('resource.region ILIKE "%US-EAST%"', {"alpha-log"}, id="ilike_resource"),
        pytest.param('body ILIKE "%ALPHA%"', {"alpha-log"}, id="ilike_body"),
        pytest.param('body NOT CONTAINS "alpha"', {"beta-log"}, id="not_contains_body"),
        pytest.param('NOT body LIKE "%alpha%"', {"beta-log"}, id="not_like_body"),
        pytest.param("attribute.status_code:number = 200", {"alpha-log"}, id="datatype_suffix_number"),
        pytest.param('resource.status_code:string = "500"', {"beta-log"}, id="datatype_suffix_string"),
    ],
)
def test_logs_filter_operators_and_datatype_suffix(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected_bodies: set[str],
) -> None:
    """ILIKE / NOT LIKE / NOT CONTAINS and the key:number|string suffix resolve correctly."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="alpha-log",
                resources={"region": "us-east", "env": "production", "hostname": "host-alpha"},
                attributes={"status_code": 200, "latency_ms": 350, "error_count": 3},
            ),
            Logs(
                timestamp=now - timedelta(seconds=3),
                body="beta-log",
                resources={"status_code": "500", "latency_ms": "2500", "error_count": "10"},
                attributes={"region": 1, "env": 2, "hostname": 3},
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "logs",
                    "disabled": False,
                    "limit": 100,
                    "offset": 0,
                    "filter": {"expression": expression},
                    "order": [
                        {"key": {"name": "timestamp"}, "direction": "desc"},
                        {"key": {"name": "id"}, "direction": "desc"},
                    ],
                    "having": {"expression": ""},
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert set(get_column_data_from_response(response.json(), "body")) == expected_bodies


def test_logs_filter_key_not_found(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A filter on a key that exists in no context is rejected (400).

    NOTE: reflects current HEAD behavior. The parked `convert-not-found-to-warning`
    change will turn this into a 200 with a warning — update this assertion when it lands.
    """
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                body="alpha-log",
                resources={"region": "us-east"},
                attributes={"status_code": 200},
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "logs",
                    "disabled": False,
                    "limit": 100,
                    "offset": 0,
                    "filter": {"expression": 'totally.unknown.key = "x"'},
                    "order": [{"key": {"name": "timestamp"}, "direction": "desc"}],
                    "having": {"expression": ""},
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
