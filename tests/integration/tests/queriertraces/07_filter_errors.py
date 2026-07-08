from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import make_query_request

# Traces filter validation: a truly-unknown key is rejected, and the body-JSON
# functions has()/hasToken() are not valid on the traces signal. All are pre-query
# validation errors (400) independent of ingested data.


@pytest.mark.parametrize(
    "expression",
    [
        # unknown key. NOTE: current HEAD rejects (400); the parked
        # convert-not-found-to-warning change will make this a 200 + warning.
        pytest.param('totally.unknown.key = "x"', id="key_not_found"),
        # has()/hasToken() support only the logs body JSON field.
        pytest.param('has(service.name, "x")', id="has_on_traces"),
        pytest.param('hasToken(name, "x")', id="hastoken_on_traces"),
    ],
)
def test_traces_filter_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
) -> None:
    now = datetime.now(tz=UTC)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="scalar",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "traces",
                    "filter": {"expression": expression},
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
