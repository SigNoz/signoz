import pytest

from fixtures import types

@pytest.fixture(name="remove_metrics_ttl_and_storage_settings", scope="function")
def remove_metrics_ttl_and_storage_settings(
    signoz: types.SigNoz,
) -> None:
    """
    Remove any custom TTL settings on traces tables to revert to default retention.
    Also resets storage policy to default by recreating tables if needed.
    """
    tables = [
        "samples_v4",
        "samples_v4_agg_5m",
        "samples_v4_agg_30m",
        "time_series_v4",
        "time_series_v4_6hrs",
        "time_series_v4_1day",
        "time_series_v4_1week",
    ]

    for table in tables:
        try:
            signoz.telemetrystore.conn.query(
                f"ALTER TABLE signoz_metrics.{table} ON CLUSTER '{signoz.telemetrystore.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' REMOVE TTL"
            )
            signoz.telemetrystore.conn.query(
                f"ALTER TABLE signoz_metrics.{table} ON CLUSTER '{signoz.telemetrystore.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER']}' RESET SETTING storage_policy;"
            )
        except Exception as e:
            print(f"ttl and storage policy reset failed for {table}: {e}")