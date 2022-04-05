package sqlite

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/telemetry"
	"golang.org/x/crypto/bcrypt"
)

type ModelDaoSqlite struct {
	db *sqlx.DB
}

// InitDB sets up setting up the connection pool global variable.
func InitDB(dataSourceName string) (*ModelDaoSqlite, error) {
	var err error

	db, err := sqlx.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, errors.Wrap(err, "failed to Open sqlite3 DB")
	}
	db.SetMaxOpenConns(10)

	table_schema := `
		CREATE TABLE IF NOT EXISTS user_preferences (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			uuid TEXT NOT NULL,
			isAnonymous INTEGER NOT NULL DEFAULT 0 CHECK(isAnonymous IN (0,1)),
			hasOptedUpdates INTEGER NOT NULL DEFAULT 1 CHECK(hasOptedUpdates IN (0,1))
		);
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			uuid TEXT NOT NULL,
			email TEXT NOT NULL,
			password TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS groups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS group_users (
			id INTEGER PRIMARY KEY,
			userId INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS group_rules (
			id INTEGER PRIMARY KEY,
			ruleId INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS rules (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			api TEXT NOT NULL,
			permission INTEGER NOT NULL
		);
	`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating user_preferences table: ", err.Error())
	}

	mds := &ModelDaoSqlite{db: db}

	if err := mds.initializeUserPreferences(); err != nil {
		return nil, err
	}
	if err := mds.initializeRootUser(); err != nil {
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

func (mds *ModelDaoSqlite) initializeRootUser() error {

	ctx := context.Background()
	user, err := mds.FetchUser(ctx, constants.RootUserEmail)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to query for root user")
	}

	if user == nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(constants.RootUserPassword),
			bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		cErr := mds.CreateNewUser(context.Background(), &model.UserParams{
			Email:    constants.RootUserEmail,
			Password: string(hash),
		})
		if cErr != nil {
			return cErr.Err
		}
	}
	return nil
}

func (mds *ModelDaoSqlite) initializeRBAC() error {

	ctx := context.Background()
	user, err := mds.FetchUser(ctx, constants.RootUserEmail)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to query for root user")
	}

	if user == nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(constants.RootUserPassword),
			bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		cErr := mds.CreateNewUser(context.Background(), &model.UserParams{
			Email:    constants.RootUserEmail,
			Password: string(hash),
		})
		if cErr != nil {
			return cErr.Err
		}
	}
	return nil
}
