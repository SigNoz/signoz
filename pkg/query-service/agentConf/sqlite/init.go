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

	table_schema := `CREATE TABLE IF NOT EXISTS agent_config_versions(
		id TEXT PRIMARY KEY,
		created_by TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		updated_by TEXT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		version INTEGER DEFAULT 1,
		active int,
		is_valid int,
		disabled int,
		element_type VARCHAR(120) NOT NULL,
		deploy_status VARCHAR(80) NOT NULL DEFAULT 'DIRTY',
		deploy_sequence INTEGER,
		deploy_result TEXT,
		last_hash TEXT,
		last_config TEXT,
		UNIQUE(element_type, version)
	);


	CREATE UNIQUE INDEX IF NOT EXISTS agent_config_versions_u1 
	ON agent_config_versions(element_type, version);

	CREATE INDEX IF NOT EXISTS agent_config_versions_nu1 
	ON agent_config_versions(last_hash);
	

	CREATE TABLE IF NOT EXISTS agent_config_elements(
		id TEXT PRIMARY KEY,
		created_by TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		updated_by TEXT,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		element_id TEXT NOT NULL,
		element_type VARCHAR(120) NOT NULL,
		version_id TEXT NOT NULL
	);

	CREATE UNIQUE INDEX IF NOT EXISTS agent_config_elements_u1 
	ON agent_config_elements(version_id, element_id, element_type);

	`

	_, err = db.Exec(table_schema)
	if err != nil {
		return errors.Wrap(err, "Error in creating agent config tables")
	}
	return nil
}
