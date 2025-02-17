package sqlstore

import (
	"database/sql"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/schema"
)

func NewBunDB(sqldb *sql.DB, dialect schema.Dialect, hooks []SQLStoreHook, opts ...bun.DBOption) *bun.DB {
	bunDB := bun.NewDB(sqldb, dialect, opts...)

	for _, hook := range hooks {
		bunDB.AddQueryHook(hook)
	}

	return bunDB
}
