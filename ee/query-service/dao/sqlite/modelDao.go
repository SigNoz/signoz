package sqlite

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	basedao "go.signoz.io/signoz/pkg/query-service/dao"
	basedsql "go.signoz.io/signoz/pkg/query-service/dao/sqlite"
	baseint "go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.uber.org/zap"
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

func columnExists(db *sqlx.DB, tableName, columnName string) bool {
	query := fmt.Sprintf("PRAGMA table_info(%s);", tableName)
	rows, err := db.Query(query)
	if err != nil {
		zap.L().Error("Failed to query table info", zap.Error(err))
		return false
	}
	defer rows.Close()

	var (
		cid        int
		name       string
		ctype      string
		notnull    int
		dflt_value *string
		pk         int
	)
	for rows.Next() {
		err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt_value, &pk)
		if err != nil {
			zap.L().Error("Failed to scan table info", zap.Error(err))
			return false
		}
		if name == columnName {
			return true
		}
	}
	err = rows.Err()
	if err != nil {
		zap.L().Error("Failed to scan table info", zap.Error(err))
		return false
	}
	return false
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
		role TEXT NOT NULL,
		user_id TEXT NOT NULL,
		token TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		expires_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		last_used INTEGER NOT NULL,
		revoked BOOLEAN NOT NULL,
		updated_by_user_id TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);
	`

	_, err = m.DB().Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating tables: %v", err.Error())
	}

	if !columnExists(m.DB(), "personal_access_tokens", "role") {
		_, err = m.DB().Exec("ALTER TABLE personal_access_tokens ADD COLUMN role TEXT NOT NULL DEFAULT 'ADMIN';")
		if err != nil {
			return nil, fmt.Errorf("error in adding column: %v", err.Error())
		}
	}
	if !columnExists(m.DB(), "personal_access_tokens", "updated_at") {
		_, err = m.DB().Exec("ALTER TABLE personal_access_tokens ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;")
		if err != nil {
			return nil, fmt.Errorf("error in adding column: %v", err.Error())
		}
	}
	if !columnExists(m.DB(), "personal_access_tokens", "last_used") {
		_, err = m.DB().Exec("ALTER TABLE personal_access_tokens ADD COLUMN last_used INTEGER NOT NULL DEFAULT 0;")
		if err != nil {
			return nil, fmt.Errorf("error in adding column: %v", err.Error())
		}
	}
	if !columnExists(m.DB(), "personal_access_tokens", "revoked") {
		_, err = m.DB().Exec("ALTER TABLE personal_access_tokens ADD COLUMN revoked BOOLEAN NOT NULL DEFAULT FALSE;")
		if err != nil {
			return nil, fmt.Errorf("error in adding column: %v", err.Error())
		}
	}
	if !columnExists(m.DB(), "personal_access_tokens", "updated_by_user_id") {
		_, err = m.DB().Exec("ALTER TABLE personal_access_tokens ADD COLUMN updated_by_user_id TEXT NOT NULL DEFAULT '';")
		if err != nil {
			return nil, fmt.Errorf("error in adding column: %v", err.Error())
		}
	}
	return m, nil
}

func (m *modelDao) DB() *sqlx.DB {
	return m.ModelDaoSqlite.DB()
}
