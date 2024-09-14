package db

import (
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/jmoiron/sqlx"

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
	promConfigPath string,
	lm interfaces.FeatureLookup,
	maxIdleConns int,
	maxOpenConns int,
	dialTimeout time.Duration,
	cluster string,
	useLogsNewSchema bool,
) *ClickhouseReader {
	ch := basechr.NewReader(localDB, promConfigPath, lm, maxIdleConns, maxOpenConns, dialTimeout, cluster, useLogsNewSchema)
	return &ClickhouseReader{
		conn:             ch.GetConn(),
		appdb:            localDB,
		ClickHouseReader: ch,
	}
}

func (r *ClickhouseReader) Start(readerReady chan bool) {
	r.ClickHouseReader.Start(readerReady)
}
