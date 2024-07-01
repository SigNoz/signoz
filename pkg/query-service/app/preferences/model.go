package preferences

import (
	"fmt"

	"github.com/jmoiron/sqlx"
)

var db *sqlx.DB

func InitDB(datasourceName string) error {
	var err error

	db, err = sqlx.Open("sqlite3", datasourceName)

	if err != nil {
		return err
	}

	// create the preference entity
	table_schema := `CREATE TABLE IF NOT EXISTS preference(
		id TEXT PRIMARY KEY NOT NULL,
		name TEXT,
		default_value TEXT,
		depends_on TEXT,
		user INTEGER DEFAULT 0,
		org INTEGER DEFAULT 0
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating preference table: %s", err.Error())
	}

	// create the preference group entity
	table_schema = `CREATE TABLE IF NOT EXISTS preference_group(
		id TEXT PRIMARY KEY NOT NULL,
		name TEXT,
		parent_group TEXT
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating preference group table: %s", err.Error())
	}

	// create the relational table between preference and preference group
	table_schema = `
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS preference_to_group (
    	preference_id TEXT NOT NULL,
    	preference_group_id TEXT NOT NULL,
    	PRIMARY KEY (preference_id, preference_group_id),
    	FOREIGN KEY (preference_id)
        	REFERENCES preference(id)
        	ON UPDATE CASCADE
        	ON DELETE CASCADE,
    	FOREIGN KEY (preference_group_id)
        	REFERENCES preference_group(id)
        	ON UPDATE CASCADE
        	ON DELETE CASCADE
);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating preference_to_group table: %s", err.Error())
	}

	// create the user preference table
	table_schema = `
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS user_preference(
		preference_key TEXT NOT NULL,
		preference_value TEXT,
		user_id TEXT NOT NULL,
		PRIMARY KEY (preference_key,user_id),
		FOREIGN KEY (preference_key)
			REFERENCES preference(id)
			ON UPDATE CASCADE 
			ON DELETE CASCADE,
		FOREIGN KEY (user_id)
			REFERENCES users(id)
			ON UPDATE CASCADE
			ON DELETE CASCADE
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating user_preference table: %s", err.Error())
	}

	// create the org preference table
	table_schema = `
	PRAGMA foreign_keys = ON;
	CREATE TABLE IF NOT EXISTS org_preference(
		preference_key TEXT NOT NULL,
		preference_value TEXT,
		org_id TEXT NOT NULL,
		PRIMARY KEY (preference_key,org_id),
		FOREIGN KEY (preference_key)
			REFERENCES preference(id)
			ON UPDATE CASCADE 
			ON DELETE CASCADE,
		FOREIGN KEY (org_id)
			REFERENCES organizations(id)
			ON UPDATE CASCADE
			ON DELETE CASCADE
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return fmt.Errorf("error in creating org_preference table: %s", err.Error())
	}

	// if there is no error then return nil
	return nil
}
