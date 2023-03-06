package sqlite

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	basedao "go.signoz.io/signoz/pkg/query-service/dao"
	basedsql "go.signoz.io/signoz/pkg/query-service/dao/sqlite"
	baseint "go.signoz.io/signoz/pkg/query-service/interfaces"
)

type modelDao struct {
	*basedsql.ModelDaoSqlite
	flags baseint.FeatureLookup
}

// SetFlagProvider sets the feature lookup provider
func (m *modelDao) SetFlagProvider(flags baseint.FeatureLookup) {
	m.flags = flags
}

// CheckFeature confirms if a feature is available
func (m *modelDao) checkFeature(key string) error {
	if m.flags == nil {
		return fmt.Errorf("flag provider not set")
	}

	return m.flags.CheckFeature(key)
}

// InitDB creates and extends base model DB repository
func InitDB(dataSourceName string) (*modelDao, error) {
	dao, err := basedsql.InitDB(dataSourceName)
	if err != nil {
		return nil, err
	}
	// set package variable so dependent base methods (e.g. AuthCache)  will work
	basedao.SetDB(dao)
	m := &modelDao{ModelDaoSqlite: dao}

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
	);
	CREATE TABLE IF NOT EXISTS personal_access_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		token TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		expires_at INTEGER NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`

	_, err = m.DB().Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating tables: %v", err.Error())
	}

	return m, nil
}

func (m *modelDao) DB() *sqlx.DB {
	return m.ModelDaoSqlite.DB()
}
