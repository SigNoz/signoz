from clickhouse_driver.dbapi.cursor import Cursor

from fixtures import types


def test_telemetry_databases(signoz: types.SigNoz) -> None:
    cursor = signoz.telemetrystore.conn.cursor()
    assert isinstance(cursor, Cursor)

    cursor.execute("SHOW DATABASES")
    records = cursor.fetchall()

    assert any("signoz_metrics" in record for record in records)
    assert any("signoz_logs" in record for record in records)
    assert any("signoz_traces" in record for record in records)
    assert any("signoz_metadata" in record for record in records)
    assert any("signoz_analytics" in record for record in records)
