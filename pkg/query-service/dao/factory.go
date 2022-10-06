package dao

import (
	"fmt"

	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/dao/sqlite"
)

var db ModelDao

func InitDao(engine, path string) error {
	var err error

	switch engine {
	case "sqlite":
		db, err = sqlite.InitDB(path)
		if err != nil {
			return errors.Wrap(err, "failed to initialize DB")
		}
	default:
		return fmt.Errorf("RelationalDB type: %s is not supported in query service", engine)
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
