package db

import (
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/jmoiron/sqlx"

	"go.signoz.io/signoz/pkg/cache"
	basechr "go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
)

type ClickhouseReader struct {
	conn  clickhouse.Conn
	appdb *sqlx.DB
	*basechr.ClickHouseReader
}

func NewDataConnector(
	localDB *sqlx.DB,
	ch clickhouse.Conn,
	promConfigPath string,
	lm interfaces.FeatureLookup,
	cluster string,
	useLogsNewSchema bool,
	useTraceNewSchema bool,
	fluxIntervalForTraceDetail time.Duration,
	cache cache.Cache,
) *ClickhouseReader {
	chReader := basechr.NewReader(localDB, ch, promConfigPath, lm, cluster, useLogsNewSchema, useTraceNewSchema, fluxIntervalForTraceDetail, cache)
	return &ClickhouseReader{
		conn:             ch,
		appdb:            localDB,
		ClickHouseReader: chReader,
	}
}

func (r *ClickhouseReader) Start(readerReady chan bool) {
	r.ClickHouseReader.Start(readerReady)
}
