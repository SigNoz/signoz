package migrate

import (
	"database/sql"

	"github.com/jmoiron/sqlx"
)

type DataMigration struct {
	ID        int    `db:"id"`
	Version   string `db:"version"`
	CreatedAt string `db:"created_at"`
	Succeeded bool   `db:"succeeded"`
}

func initSchema(conn *sqlx.DB) error {
	tableSchema := `
		CREATE TABLE IF NOT EXISTS data_migrations (
			id SERIAL PRIMARY KEY,
			version VARCHAR(255) NOT NULL UNIQUE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			succeeded BOOLEAN NOT NULL DEFAULT FALSE
		);
	`
	_, err := conn.Exec(tableSchema)
	if err != nil {
		return err
	}
	return nil
}

func getMigrationVersion(conn *sqlx.DB, version string) (*DataMigration, error) {
	var migration DataMigration
	err := conn.Get(&migration, "SELECT * FROM data_migrations WHERE version = $1", version)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &migration, nil
}

func Migrate(conn *sqlx.DB) error {
	if err := initSchema(conn); err != nil {
		return err
	}

	return nil
}
