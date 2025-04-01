package dao

import (
	"github.com/SigNoz/signoz/ee/query-service/dao/sqlite"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

func InitDao(sqlStore sqlstore.SQLStore) (ModelDao, error) {
	return sqlite.InitDB(sqlStore)
}
