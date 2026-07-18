from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/dashboards"

# A minimal dashboard stripped from SigNoz/dashboards (cicd-perses.json): its
# NumberPanel carries a real `threshold value: 0` and a builder query, which is
# exactly what the create -> GET round-trip must preserve. Everything not needed
# for the round-trip (visualization, formatting, filters, stepInterval, real
# metrics) is stripped; the queries are plain logs count().
#
# The dashboard packs every field whose zero value the round-trip has to keep:
#   - thresholds with value 0 (ComparisonThreshold on the NumberPanel and
#     ThresholdWithLabel on the TimeSeriesPanel), which the required-tag
#     validation used to reject on create.
#   - builder slices set to an explicit [] (groupBy/order/selectFields/functions)
#     that must echo back as [] rather than being dropped, and a bare builder
#     whose unset slices must stay absent (never null) on read.
#   - scalars disabled/legend that must always echo false/"".
DASHBOARD = {
    "schemaVersion": "v6",
    "name": "roundtrip-zero-values",
    "tags": [],
    "spec": {
        "display": {"name": "Roundtrip Zero Values"},
        "panels": {
            # NumberPanel: ComparisonThreshold value 0 + a builder query whose
            # zero-valued slices/scalars are all set explicitly.
            "number": {
                "kind": "Panel",
                "spec": {
                    "display": {"name": "number"},
                    "plugin": {
                        "kind": "signoz/NumberPanel",
                        "spec": {
                            "thresholds": [
                                {
                                    "value": 0,
                                    "operator": "above_or_equal",
                                    "color": "#c2780b",
                                    "format": "background",
                                }
                            ]
                        },
                    },
                    "queries": [
                        {
                            "kind": "scalar",
                            "spec": {
                                "plugin": {
                                    "kind": "signoz/BuilderQuery",
                                    "spec": {
                                        "name": "A",
                                        "signal": "logs",
                                        "aggregations": [{"expression": "count()"}],
                                        "disabled": False,
                                        "legend": "",
                                        "groupBy": [],
                                        "order": [],
                                        "selectFields": [],
                                        "functions": [],
                                    },
                                }
                            },
                        }
                    ],
                },
            },
            # TimeSeriesPanel: ThresholdWithLabel value 0 + a bare builder query
            # whose unset slices must be omitted (not null) on read-back.
            "timeseries": {
                "kind": "Panel",
                "spec": {
                    "display": {"name": "timeseries"},
                    "plugin": {
                        "kind": "signoz/TimeSeriesPanel",
                        "spec": {"thresholds": [{"value": 0, "color": "#c2780b"}]},
                    },
                    "queries": [
                        {
                            "kind": "time_series",
                            "spec": {
                                "plugin": {
                                    "kind": "signoz/BuilderQuery",
                                    "spec": {
                                        "name": "A",
                                        "signal": "logs",
                                        "aggregations": [{"expression": "count()"}],
                                    },
                                }
                            },
                        }
                    ],
                },
            },
            # PromQL query: legend/disabled must echo "" / false.
            "promql": {
                "kind": "Panel",
                "spec": {
                    "display": {"name": "promql"},
                    "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                    "queries": [
                        {
                            "kind": "time_series",
                            "spec": {
                                "plugin": {
                                    "kind": "signoz/PromQLQuery",
                                    "spec": {"name": "A", "query": "up", "disabled": False, "legend": ""},
                                }
                            },
                        }
                    ],
                },
            },
            # ClickHouse query: legend/disabled must echo "" / false.
            "clickhouse": {
                "kind": "Panel",
                "spec": {
                    "display": {"name": "clickhouse"},
                    "plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
                    "queries": [
                        {
                            "kind": "time_series",
                            "spec": {
                                "plugin": {
                                    "kind": "signoz/ClickHouseSQL",
                                    "spec": {"name": "A", "query": "SELECT 1", "disabled": False, "legend": ""},
                                }
                            },
                        }
                    ],
                },
            },
        },
    },
}


def test_dashboard_v2_roundtrip_preserves_zero_values(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    # Create also asserts Bug 1: a threshold with value 0 is no longer rejected.
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=DASHBOARD,
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    dashboard_id = response.json()["data"]["id"]

    try:
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{dashboard_id}"),
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        panels = response.json()["data"]["spec"]["panels"]

        def query_spec(panel_id: str) -> dict:
            return panels[panel_id]["spec"]["queries"][0]["spec"]["plugin"]["spec"]

        def threshold(panel_id: str) -> dict:
            return panels[panel_id]["spec"]["plugin"]["spec"]["thresholds"][0]

        number = query_spec("number")
        timeseries = query_spec("timeseries")
        promql = query_spec("promql")
        clickhouse = query_spec("clickhouse")

        # A value the create round-trips back verbatim: (description, actual, expected).
        roundtrip_cases = [
            ("comparison threshold value 0", threshold("number")["value"], 0),
            ("threshold-with-label value 0", threshold("timeseries")["value"], 0),
            ("builder disabled false", number["disabled"], False),
            ("builder legend empty", number["legend"], ""),
            ("builder empty groupBy", number["groupBy"], []),
            ("builder empty order", number["order"], []),
            ("builder empty selectFields", number["selectFields"], []),
            ("builder empty functions", number["functions"], []),
            ("bare builder disabled false", timeseries["disabled"], False),
            ("bare builder legend empty", timeseries["legend"], ""),
            ("promql disabled false", promql["disabled"], False),
            ("promql legend empty", promql["legend"], ""),
            ("clickhouse disabled false", clickhouse["disabled"], False),
            ("clickhouse legend empty", clickhouse["legend"], ""),
        ]
        for description, actual, expected in roundtrip_cases:
            assert actual == expected, description

        # An unset slice is omitted, never serialized as null: (description, spec, key).
        absent_cases = [
            ("bare builder omits groupBy", timeseries, "groupBy"),
            ("bare builder omits order", timeseries, "order"),
            ("bare builder omits selectFields", timeseries, "selectFields"),
            ("bare builder omits functions", timeseries, "functions"),
        ]
        for description, spec, key in absent_cases:
            assert key not in spec, description
    finally:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{dashboard_id}"),
            headers=headers,
            timeout=5,
        )
