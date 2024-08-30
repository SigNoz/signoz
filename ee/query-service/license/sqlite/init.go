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

	table_schema := `CREATE TABLE IF NOT EXISTS licenses(
		key TEXT PRIMARY KEY,
		createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		planDetails TEXT,
		activationId TEXT,
		validationMessage TEXT,
		lastValidated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	
	CREATE TABLE IF NOT EXISTS sites(
		uuid TEXT PRIMARY KEY,
		alias VARCHAR(180) DEFAULT 'PROD',
		url VARCHAR(300),
		createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating licenses table: %s", err.Error())
	}

	table_schema = `CREATE TABLE IF NOT EXISTS feature_status (
		name TEXT PRIMARY KEY,
		active bool,
		usage INTEGER DEFAULT 0,
		usage_limit INTEGER DEFAULT 0,
		route TEXT
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating feature_status table: %s", err.Error())
	}

	return nil
}
