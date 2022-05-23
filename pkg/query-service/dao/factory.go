package dao

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/config"
	"go.signoz.io/query-service/dao/postgres"
	"go.signoz.io/query-service/dao/sqlite"
)

var db ModelDao

// InitConn initializes database connection. Supports both sql*lite and postgres
func InitConn(dbconf *config.DBConfig) (*sqlx.DB, error) {
	var err error
	var conn *sqlx.DB
	switch dbconf.Engine {
	case config.SQLLITE:
		conn, err = sqlite.InitConn(dbconf.SQL.Path)
		if err != nil {
			return nil, errors.Wrap(err, "failed to initialize sql DB")
		}
	case config.PG:
		conn, err = postgres.InitConn(dbconf.PG)
		if err != nil {
			return nil, errors.Wrap(err, "failed to initialize postgres DB connection, please check the config params")
		}
	default:
		return nil, fmt.Errorf("RelationalDB type: %s is not supported in query service", dbconf.Engine)
	}
	return conn, nil
}

// InitDao initialize data model and db connection pool
// to be used by query servie. Supports sql*lite and postgres
func InitDao(engine config.DBEngine, conn *sqlx.DB) error {
	var err error

	switch engine {
	case config.SQLLITE:
		db, err = sqlite.InitDB(conn)
		if err != nil {
			return errors.Wrap(err, "failed to initialize sql DB")
		}
	case config.PG:
		db, err = postgres.InitDB(conn)
		if err != nil {
			return errors.Wrap(err, "failed to initialize postgres DB")
		}
	default:
		return fmt.Errorf("RelationalDB type: %s is not supported in query service", engine)
	}
	return nil
}

func DB() ModelDao {
	if db == nil {
		// Should never reach here
		panic("GetDB called before initialization")
	}
	return db
}
