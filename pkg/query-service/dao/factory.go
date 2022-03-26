package dao

import (
	"fmt"

	"go.signoz.io/query-service/dao/interfaces"
	"go.signoz.io/query-service/dao/sqlite"
)

var db interfaces.ModelDao

func InitDao(engine, path string) error {
	var err error

	switch engine {
	case "sqlite":
		db, err = sqlite.InitDB(path)
		if err != nil {
			return err
		}
	default:
		return fmt.Errorf("RelationalDB type: %s is not supported in query service", engine)
	}
	return nil
}

func DB() interfaces.ModelDao {
	if db == nil {
		// Should never reach here
		panic("GetDB called before initialization")
	}
	return db
}
