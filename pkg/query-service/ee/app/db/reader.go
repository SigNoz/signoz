package db

import (
	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/jmoiron/sqlx"

	baseAppCh "go.signoz.io/query-service/app/clickhouseReader"
)

type databaseReader struct {
	EventDB clickhouse.Conn
	RelDB   *sqlx.DB
	*baseAppCh.ClickHouseReader
}

func NewDBReader(localDB *sqlx.DB) *databaseReader {
	baseReader := baseAppCh.NewReader(localDB)
	return &databaseReader{
		EventDB:          baseReader.GetDB(),
		RelDB:            baseReader.GetRelationalDB(),
		ClickHouseReader: baseReader,
	}
}

func (d *databaseReader) Start() {
	d.ClickHouseReader.Start()
}
