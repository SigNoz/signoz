package telemetrystoretest

import (
	"context"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

// conn wraps rows the way the clickhouse provider does, so mocked JSON columns report the scan
// type they do in production.
type conn struct {
	clickhouse.Conn
}

func (c conn) Query(ctx context.Context, query string, args ...any) (driver.Rows, error) {
	rows, err := c.Conn.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return telemetrystore.WrapRows(rows), nil
}
