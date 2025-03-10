package dao

import (
	"go.signoz.io/signoz/ee/query-service/dao/sqlite"
	"go.signoz.io/signoz/pkg/sqlstore"
)

func InitDao(sqlStore sqlstore.SQLStore) (ModelDao, error) {
	return sqlite.InitDB(sqlStore)
}
