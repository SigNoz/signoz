"""Shared helpers for the third-party (external) API monitoring domain list.

A translator over v5 builder queries that answers with a UI-formatted scalar table, so the
response is read by column rather than by series.
"""

from typing import Any

import requests

from fixtures import types

DOMAIN_LIST_ENDPOINT = "/api/v1/third-party-apis/overview/list"

# The group-by key the translator always prepends; its column holds the domain name.
DOMAIN_COLUMN = "http_host"

REQUEST_TIMEOUT = 30


def make_third_party_apis_request(
    signoz: types.SigNoz,
    token: str,
    start_ms: int,
    end_ms: int,
    *,
    show_ip: bool = True,
    filter_expression: str | None = None,
    group_by: list[dict] | None = None,
    timeout: int = REQUEST_TIMEOUT,
) -> requests.Response:
    """POST a domain-list request."""
    payload: dict[str, Any] = {
        "start": start_ms,
        "end": end_ms,
        "show_ip": show_ip,
    }
    if filter_expression is not None:
        payload["filter"] = {"expression": filter_expression}
    if group_by is not None:
        payload["groupBy"] = group_by

    return requests.post(
        signoz.self.host_configs["8080"].get(DOMAIN_LIST_ENDPOINT),
        timeout=timeout,
        headers={"authorization": f"Bearer {token}"},
        json=payload,
    )


def scalar_result(response: requests.Response) -> dict:
    """The single scalar table from a third-party-apis response."""
    return response.json()["data"]["data"]["results"][0]


def index_columns_by_query(result: dict) -> dict[str, int]:
    """queryName -> column index, aggregation columns only; group columns are addressed by
    name (DOMAIN_COLUMN) since they share their query's name."""
    return {col["queryName"]: i for i, col in enumerate(result["columns"]) if col["columnType"] == "aggregation"}


def domain_column_index(result: dict) -> int:
    return next(i for i, col in enumerate(result["columns"]) if col["name"] == DOMAIN_COLUMN)


def rows_by_domain(result: dict) -> dict[str, list[Any]]:
    """domain name -> its row. Suites share a stack, so look up the domains you seeded."""
    index = domain_column_index(result)
    return {row[index]: row for row in result["data"]}
