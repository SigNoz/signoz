package sqlite

import (
	"fmt"

	"github.com/jmoiron/sqlx"
)

func InitDB(db *sqlx.DB) error {
	var err error
	if db == nil {
		return fmt.Errorf("invalid db connection")
	}

	table_schema := `CREATE TABLE IF NOT EXISTS usage(
		id UUID PRIMARY KEY,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		activation_id UUID, 
		snapshot TEXT,
		synced BOOLEAN DEFAULT 'false',
		synced_at TIMESTAMP,
		failed_sync_request_count INTEGER DEFAULT 0
	);
	`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating usage table: %v", err.Error())
	}
	return nil
}
