package sqlite

import (
	"fmt"

	"github.com/pkg/errors"

	"github.com/jmoiron/sqlx"
)

func InitDB(db *sqlx.DB) error {
	var err error
	if db == nil {
		return fmt.Errorf("invalid db connection")
	}

	table_schema := `CREATE TABLE IF NOT EXISTS ingestion_rules(
		id TEXT PRIMARY KEY,
		created_by TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		updated_by TEXT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		source VARCHAR(100),
		priority INTEGER,
		rule_type VARCHAR(100),
		rule_subtype VARCHAR(100),
		name VARCHAR(400) NOT NULL,
		config_json TEXT,
		error_message TEXT
	);
	`

	_, err = db.Exec(table_schema)
	if err != nil {
		return errors.Wrap(err, "Error in creating ingestion rules table")
	}
	return nil
}
