package dao

import (
	"fmt"

	"go.signoz.io/signoz/ee/query-service/dao/sqlite"
)

var db ModelDao

func InitDao(engine, path string) (ModelDao, error) {

	switch engine {
	case "sqlite":
		db, err:= sqlite.InitDB(path)
		return db, err
	default:
		return nil, fmt.Errorf("qsdb type: %s is not supported in query service", engine)
	}

}

func DB() ModelDao {
	if db == nil {
		// Should never reach here
		panic("GetDB called before initialization")
	}
	return db
}