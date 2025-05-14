package db

import (
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/prometheus"
	basechr "github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
)

type ClickhouseReader struct {
	conn  clickhouse.Conn
	appdb sqlstore.SQLStore
	*basechr.ClickHouseReader
}

func NewDataConnector(
	sqlDB sqlstore.SQLStore,
	telemetryStore telemetrystore.TelemetryStore,
	prometheus prometheus.Prometheus,
	cluster string,
	fluxIntervalForTraceDetail time.Duration,
	cache cache.Cache,
) *ClickhouseReader {
	chReader := basechr.NewReader(sqlDB, telemetryStore, prometheus, cluster, fluxIntervalForTraceDetail, cache)
	return &ClickhouseReader{
		conn:             telemetryStore.ClickhouseDB(),
		appdb:            sqlDB,
		ClickHouseReader: chReader,
	}
}

func (r *ClickhouseReader) GetSQLStore() sqlstore.SQLStore {
	return r.appdb
}
