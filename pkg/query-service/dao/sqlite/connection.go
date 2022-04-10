package sqlite

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/telemetry"
	"go.uber.org/zap"
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
		PRAGMA foreign_keys = ON;

		CREATE TABLE IF NOT EXISTS user_preferences (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			uuid TEXT NOT NULL,
			isAnonymous INTEGER NOT NULL DEFAULT 0 CHECK(isAnonymous IN (0,1)),
			hasOptedUpdates INTEGER NOT NULL DEFAULT 1 CHECK(hasOptedUpdates IN (0,1))
		);
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			org_name TEXT,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS groups (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		CREATE TABLE IF NOT EXISTS group_users (
			group_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			FOREIGN KEY(group_id) REFERENCES groups(id),
			FOREIGN KEY(user_id) REFERENCES users(id),
			PRIMARY KEY (group_id, user_id)
		);
		CREATE TABLE IF NOT EXISTS group_rules (
			group_id TEXT NOT NULL,
			rule_id TEXT NOT NULL,
			FOREIGN KEY(group_id) REFERENCES groups(id),
			FOREIGN KEY(rule_id) REFERENCES rbac_rules(id),
			PRIMARY KEY (group_id, rule_id)
		);
		CREATE TABLE IF NOT EXISTS rbac_rules (
			id TEXT PRIMARY KEY,
			api_class TEXT NOT NULL,
			permission INTEGER NOT NULL
		);
	`

	fmt.Println("setting schema...")
	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating tables: %v", err.Error())
	}

	mds := &ModelDaoSqlite{db: db}

	if err := mds.initializeUserPreferences(); err != nil {
		return nil, err
	}
	if err := mds.initializeRBAC(); err != nil {
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

func (mds *ModelDaoSqlite) initializeRBAC() error {
	ctx := context.Background()
	user, err := mds.GetUserByEmail(ctx, constants.RootUserEmail)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to query for root user")
	}

	var cErr *model.ApiError

	// Create root user if it is not present.
	if user == nil {
		zap.S().Debugf("Root user is not found, creating one")
		hash, err := bcrypt.GenerateFromPassword([]byte(constants.RootUserPassword),
			bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user, cErr = mds.CreateUser(ctx, &model.User{
			Email:    constants.RootUserEmail,
			Password: string(hash),
		})
		if cErr != nil {
			return cErr.Err
		}
		zap.S().Infof("Initialized admin user, email: %s, password: %s\n",
			constants.RootUserEmail, constants.RootUserPassword)
	}
	zap.S().Debugf("Root user: %+v", user)

	// Create guardian group if it is not present.
	group, err := mds.GetGroupByName(ctx, constants.RootGroup)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to query for root group")
	}

	if group == nil {
		zap.S().Debugf("Guardian group is not found, creating one")
		group, cErr = mds.CreateGroup(ctx, &model.Group{Name: constants.RootGroup})
		if cErr != nil {
			return cErr.Err
		}
	}

	users, err := mds.GetGroupUsers(ctx, group.Id)
	if err != nil {
		return errors.Wrap(err.Err, "Failed to query for root group users")
	}
	zap.S().Debugf("Guardian group users: %+v", users)

	// If user is already added in the guardian group, we can return.
	for _, u := range users {
		if u.UserId == user.Id {
			return nil
		}
	}

	err = mds.AddUserToGroup(ctx, &model.GroupUser{GroupId: group.Id, UserId: user.Id})
	if err != nil {
		return errors.Wrap(err.Err, "Failed add root user to guardian group")
	}

	return nil
}
