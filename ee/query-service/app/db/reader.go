package db

import (
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

func NewDataConnector(localDB *sqlx.DB, promConfigPath string, lm interfaces.FeatureLookup) *ClickhouseReader {
	ch := basechr.NewReader(localDB, promConfigPath, lm)
	return &ClickhouseReader{
		conn:             ch.GetConn(),
		appdb:            localDB,
		ClickHouseReader: ch,
	}
}

func (r *ClickhouseReader) Start(readerReady chan bool) {
	r.ClickHouseReader.Start(readerReady)
}
