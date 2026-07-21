from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics

# Metrics key resolution differs from logs/traces: every label lives in the `labels`
# JSON, so attribute./resource./scope. and a bare key all resolve to
# JSONExtractString(labels, '<key>') — there is no per-context storage and no
# attribute-map synthesize fallback. These tests pin that model down.
METRIC = "test.metric.keyres"


def test_metrics_group_by_context_collapse(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """Grouping by `region` as attribute / resource / scope / unspecified all resolve to
    JSONExtractString(labels,'region') and produce identical buckets — label context is a no-op."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(
        [
            Metrics(
                metric_name=METRIC,
                labels={"region": region},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=value,
            )
            for region, value in [("us", 30.0), ("eu", 10.0)]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    results: dict[str, dict] = {}
    for ctx in ("attribute", "resource", "scope", ""):
        response = querier.make_scalar_query_request(
            signoz,
            token,
            now,
            [
                querier.build_scalar_query(
                    name="A",
                    signal="metrics",
                    aggregations=[querier.build_metrics_aggregation(METRIC, "latest", "sum", "unspecified")],
                    group_by=[querier.build_group_by_field("region", "string", ctx)],
                )
            ],
        )
        assert response.status_code == HTTPStatus.OK, f"ctx={ctx!r}: {response.text}"
        results[ctx] = {row[0]: row[-1] for row in querier.get_scalar_table_data(response.json())}

    assert results[""] == {"us": 30.0, "eu": 10.0}, results[""]
    assert all(r == results[""] for r in results.values()), results


def test_metrics_filter_label_context(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """Metrics has no per-context storage: every label lives in the `labels` JSON, so a label
    *filter* collapses every context to JSONExtractString(labels,'region') just like group-by does.
    bare `region`, `attribute.region`, and `resource.region` are all equivalent and select `us`."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(
        [
            Metrics(
                metric_name=METRIC,
                labels={"region": region},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=value,
            )
            for region, value in [("us", 30.0), ("eu", 10.0)]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # bare and attribute. both resolve to the attribute-registered label and select only `us`.
    for expr in ('region = "us"', 'attribute.region = "us"'):
        response = querier.make_scalar_query_request(
            signoz,
            token,
            now,
            [
                querier.build_scalar_query(
                    name="A",
                    signal="metrics",
                    aggregations=[querier.build_metrics_aggregation(METRIC, "latest", "sum", "unspecified")],
                    group_by=[querier.build_group_by_field("region", "string", "")],
                    filter_expression=expr,
                )
            ],
        )
        assert response.status_code == HTTPStatus.OK, f"{expr}: {response.text}"
        data = {row[0]: row[-1] for row in querier.get_scalar_table_data(response.json())}
        assert data == {"us": 30.0}, f"{expr}: {data}"

    # resource. is a context the label is not registered under; metrics collapses it to the
    # same labels lookup, so it resolves rather than erroring.
    response = querier.make_scalar_query_request(
        signoz,
        token,
        now,
        [
            querier.build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[querier.build_metrics_aggregation(METRIC, "latest", "sum", "unspecified")],
                filter_expression='resource.region = "us"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text


def test_metrics_group_by_unknown_label(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """Grouping by a label no metric carries resolves to JSONExtractString(labels,'<missing>')
    = '' for every series, so all series collapse into one bucket rather than the query failing."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(
        [
            Metrics(
                metric_name=METRIC,
                labels={"region": region},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=value,
            )
            for region, value in [("us", 30.0), ("eu", 10.0)]
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = querier.make_scalar_query_request(
        signoz,
        token,
        now,
        [
            querier.build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[querier.build_metrics_aggregation(METRIC, "latest", "sum", "unspecified")],
                group_by=[querier.build_group_by_field("does_not_exist_label", "string", "attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = querier.get_scalar_table_data(response.json())
    assert len(data) == 1, data
    assert data[0][-1] == 40.0, data  # 30 + 10 summed into the single (empty) bucket


def test_metrics_filter_unknown_label_matches_nothing(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """A filter on a label no metric carries resolves to JSONExtractString(labels,'<missing>')
    = '' and matches nothing: metrics returns 200 with an empty result and — unlike the
    logs/traces synthesize path — emits no key-not-found warning."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(
        [
            Metrics(
                metric_name=METRIC,
                labels={"region": "us"},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=30.0,
            )
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = querier.make_scalar_query_request(
        signoz,
        token,
        now,
        [
            querier.build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[querier.build_metrics_aggregation(METRIC, "latest", "sum", "unspecified")],
                filter_expression='does_not_exist_label = "x"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert querier.get_scalar_table_data(response.json()) == []
    assert querier.get_all_warnings(response.json()) == []


def test_metrics_full_text_filter_does_not_error(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """A bare/quoted term has no key=value form, so the visitor routes it through the metrics
    full-text search column, which is never present in the metadata keys. The condition builder
    must resolve it (not hard-error) so the query runs. Regression: a partial filter like `abc`
    used to 400 with `key <full-text-column> not found` (broke the Metrics Explorer summary)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(
        [
            Metrics(
                metric_name=METRIC,
                labels={"region": "us"},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=30.0,
            )
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # bare word and quoted term are both full-text searches; neither may 400.
    for expr in ("abc", '"abc"'):
        response = querier.make_scalar_query_request(
            signoz,
            token,
            now,
            [
                querier.build_scalar_query(
                    name="A",
                    signal="metrics",
                    aggregations=[querier.build_metrics_aggregation(METRIC, "latest", "sum", "unspecified")],
                    filter_expression=expr,
                )
            ],
        )
        assert response.status_code == HTTPStatus.OK, f"{expr}: {response.text}"
        # the term matches no series, and metrics emits no key-not-found warning.
        assert querier.get_scalar_table_data(response.json()) == [], f"{expr}: {response.json()}"
        assert querier.get_all_warnings(response.json()) == [], f"{expr}: {querier.get_all_warnings(response.json())}"
