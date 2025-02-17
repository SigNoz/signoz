package dao

import (
	"github.com/jmoiron/sqlx"
	"github.com/uptrace/bun"
	"go.signoz.io/signoz/ee/query-service/dao/sqlite"
)

func InitDao(inputDB *sqlx.DB, bundb *bun.DB) (ModelDao, error) {
	return sqlite.InitDB(inputDB, bundb)
}
