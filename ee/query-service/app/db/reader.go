package db

import (
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/SigNoz/signoz/pkg/cache"
	"github.com/SigNoz/signoz/pkg/prometheus"
	basechr "github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
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
	lm interfaces.FeatureLookup,
	cluster string,
	useLogsNewSchema bool,
	useTraceNewSchema bool,
	fluxIntervalForTraceDetail time.Duration,
	cache cache.Cache,
) *ClickhouseReader {
	chReader := basechr.NewReader(sqlDB, telemetryStore, prometheus, lm, cluster, useLogsNewSchema, useTraceNewSchema, fluxIntervalForTraceDetail, cache)
	return &ClickhouseReader{
		conn:             telemetryStore.ClickhouseDB(),
		appdb:            sqlDB,
		ClickHouseReader: chReader,
	}
}
