package db

import (
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/SigNoz/signoz/pkg/cache"
	basechr "github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type ClickhouseReader struct {
	conn  clickhouse.Conn
	appdb sqlstore.SQLStore
	*basechr.ClickHouseReader
}

func NewDataConnector(
	sqlDB sqlstore.SQLStore,
	ch clickhouse.Conn,
	promConfigPath string,
	lm interfaces.FeatureLookup,
	cluster string,
	useLogsNewSchema bool,
	useTraceNewSchema bool,
	fluxIntervalForTraceDetail time.Duration,
	cache cache.Cache,
) *ClickhouseReader {
	chReader := basechr.NewReader(sqlDB, ch, promConfigPath, lm, cluster, useLogsNewSchema, useTraceNewSchema, fluxIntervalForTraceDetail, cache)
	return &ClickhouseReader{
		conn:             ch,
		appdb:            sqlDB,
		ClickHouseReader: chReader,
	}
}

func (r *ClickhouseReader) Start(readerReady chan bool) {
	r.ClickHouseReader.Start(readerReady)
}
