package sqlite

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	basedao "go.signoz.io/query-service/dao"
	basedsql "go.signoz.io/query-service/dao/sqlite"
)

type modelDao struct {
	*basedsql.ModelDaoSqlite
}

// InitDB creates and extends base model DB repository
func InitDB(dataSourceName string) (*modelDao, error) {
	dao, err := basedsql.InitDB(dataSourceName)
	if err != nil {
		return nil, err
	}
	// set package variable so dependent base methods (e.g. AuthCache)  will work
	basedao.SetDB(dao)
	m := &modelDao{
		dao,
	}

	table_schema := `
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS org_domains(
		id TEXT PRIMARY KEY,
		org_id TEXT NOT NULL,
		name VARCHAR(50) NOT NULL UNIQUE,
		created_at INTEGER NOT NULL,
		updated_at INTEGER,
		data TEXT  NOT NULL,
		FOREIGN KEY(org_id) REFERENCES organizations(id)
	);`

	_, err = m.DB().Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating tables: %v", err.Error())
	}

	return m, nil
}

func (m *modelDao) DB() *sqlx.DB {
	return m.ModelDaoSqlite.DB()
}
