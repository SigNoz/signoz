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

	table_schema := `CREATE TABLE IF NOT EXISTS pipelines(
		id TEXT PRIMARY KEY,
		order_id INTEGER,
		enabled BOOLEAN,
		created_by TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		name VARCHAR(400) NOT NULL,
		alias VARCHAR(20) NOT NULL,
		description TEXT,
		filter TEXT NOT NULL,
		config_json TEXT
	);
	`
	_, err = db.Exec(table_schema)
	if err != nil {
		return errors.Wrap(err, "Error in creating pipelines table")
	}
	return nil
}
