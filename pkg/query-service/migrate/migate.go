package migrate

import (
	"database/sql"

	"github.com/jmoiron/sqlx"
	alertstov4 "go.signoz.io/signoz/pkg/query-service/migrate/0_45_alerts_to_v4"
	"go.uber.org/zap"
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

func Migrate(dsn string) error {
	conn, err := sqlx.Connect("sqlite3", dsn)
	if err != nil {
		return err
	}
	if err := initSchema(conn); err != nil {
		return err
	}

	if m, err := getMigrationVersion(conn, "0.45_alerts_to_v4"); err == nil && m == nil {
		if err := alertstov4.Migrate(conn); err != nil {
			zap.L().Error("failed to migrate 0.45_alerts_to_v4", zap.Error(err))
		} else {
			_, err := conn.Exec("INSERT INTO data_migrations (version, succeeded) VALUES ('0.45_alerts_to_v4', true)")
			if err != nil {
				return err
			}
		}
	}

	return nil
}
