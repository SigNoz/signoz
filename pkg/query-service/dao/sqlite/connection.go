package sqlite

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/telemetry"
)

type ModelDaoSqlite struct {
	db *sqlx.DB
}

// InitDB sets up setting up the connection pool global variable.
func InitDB(dataSourceName string) (*ModelDaoSqlite, error) {
	var err error

	db, err := sqlx.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)

	table_schema := `CREATE TABLE IF NOT EXISTS user_preferences (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT NOT NULL,
		isAnonymous INTEGER NOT NULL DEFAULT 0 CHECK(isAnonymous IN (0,1)),
		hasOptedUpdates INTEGER NOT NULL DEFAULT 1 CHECK(hasOptedUpdates IN (0,1))
	);`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating user_preferences table: %s", err.Error())
	}

	mds := &ModelDaoSqlite{db: db}

	err = mds.initializeUserPreferences()
	if err != nil {
		return nil, err
	}
	return mds, nil

}
func (mds *ModelDaoSqlite) initializeUserPreferences() error {

	// set anonymous setting as default in case of any failures to fetch UserPreference in below section
	telemetry.GetInstance().SetTelemetryAnonymous(constants.DEFAULT_TELEMETRY_ANONYMOUS)

	ctx := context.Background()
	userPreference, apiError := mds.FetchUserPreference(ctx)

	if apiError != nil {
		return apiError.Err
	}
	if userPreference == nil {
		userPreference, apiError = mds.CreateDefaultUserPreference(ctx)
	}
	if apiError != nil {
		return apiError.Err
	}

	// set telemetry fields from userPreferences
	telemetry.GetInstance().SetTelemetryAnonymous(userPreference.GetIsAnonymous())
	telemetry.GetInstance().SetDistinctId(userPreference.GetUUID())

	return nil
}
