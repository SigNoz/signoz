package dao

import (
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/dao/sqlite"
)

var db ModelDao

func InitDao(inputDB *sqlx.DB) error {
	var err error
	db, err = sqlite.InitDB(inputDB)
	if err != nil {
		return errors.Wrap(err, "failed to initialize DB")
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
