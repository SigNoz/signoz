package dao

import (
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/ee/query-service/dao/sqlite"
)

func InitDao(inputDB *sqlx.DB) (ModelDao, error) {
	return sqlite.InitDB(inputDB)
}
