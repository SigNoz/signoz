package db

import (
	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/jmoiron/sqlx"

	basechr "go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
)

type ClickhouseReader struct {
	conn  clickhouse.Conn
	appdb *sqlx.DB
	*basechr.ClickHouseReader
}

func NewDataConnector(localDB *sqlx.DB, promConfigPath string) *ClickhouseReader {
	ch := basechr.NewReader(localDB, promConfigPath)
	return &ClickhouseReader{
		conn:             ch.GetConn(),
		appdb:            localDB,
		ClickHouseReader: ch,
	}
}

func (r *ClickhouseReader) Start(readerReady chan bool) {
	r.ClickHouseReader.Start(readerReady)
}
