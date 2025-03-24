package dao

import (
	"github.com/SigNoz/signoz/pkg/query-service/dao/sqlite"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

var db ModelDao

func InitDao(sqlStore sqlstore.SQLStore) error {
	var err error
	db, err = sqlite.InitDB(sqlStore)
	if err != nil {
		return err
	}

	return nil
}

// SetDB is used by ee for setting modelDAO
func SetDB(m ModelDao) {
	db = m
}

func DB() ModelDao {
	if db == nil {
		// Should never reach here
		panic("GetDB called before initialization")
	}
	return db
}
