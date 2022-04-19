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
		CREATE TABLE IF NOT EXISTS invites (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			token TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			role TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			org_name TEXT,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			profile_picture_url TEXT
		);
		CREATE TABLE IF NOT EXISTS groups (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		CREATE TABLE IF NOT EXISTS group_users (
			user_id TEXT NOT NULL PRIMARY KEY ON CONFLICT REPLACE,
			group_id TEXT NOT NULL,
			FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		CREATE TABLE IF NOT EXISTS group_rules (
			group_id TEXT NOT NULL,
			rule_id TEXT NOT NULL,
			FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
			FOREIGN KEY(rule_id) REFERENCES rbac_rules(id) ON DELETE CASCADE,
			PRIMARY KEY (group_id, rule_id)
		);
		CREATE TABLE IF NOT EXISTS rbac_rules (
			id TEXT PRIMARY KEY,
			api_class TEXT NOT NULL,
			permission INTEGER NOT NULL,
			UNIQUE(api_class, permission) ON CONFLICT REPLACE
		);
	`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating tables: %v", err.Error())
	}

	mds := &ModelDaoSqlite{db: db}

	ctx := context.Background()
	if err := mds.initializeUserPreferences(ctx); err != nil {
		return nil, err
	}
	if err := mds.initializeRBAC(ctx); err != nil {
		return nil, err
	}

	return mds, nil
}

func (mds *ModelDaoSqlite) initializeUserPreferences(ctx context.Context) error {

	// set anonymous setting as default in case of any failures to fetch UserPreference in below section
	telemetry.GetInstance().SetTelemetryAnonymous(constants.DEFAULT_TELEMETRY_ANONYMOUS)

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

// initializeRBAC create the ADMIN, EDITOR and VIEWER groups if they are not present. It also
// created the rules required for the groups and assign the rules to the corresponding groups.
func (mds *ModelDaoSqlite) initializeRBAC(ctx context.Context) error {
	f := func(groupName, apiClass string, permission int) error {
		group, err := mds.createGroupIfNotPresent(ctx, groupName)
		if err != nil {
			return errors.Wrap(err, "Failed to create group")
		}
		rule, apiErr := mds.CreateRule(ctx, &model.RBACRule{
			ApiClass:   apiClass,
			Permission: permission,
		})
		if apiErr != nil {
			return errors.Wrap(apiErr.Err, "Failed to create rule")
		}
		if apiErr = mds.AddRuleToGroup(ctx, &model.GroupRule{
			GroupId: group.Id,
			RuleId:  rule.Id,
		}); apiErr != nil {
			return errors.Wrap(apiErr.Err, "Failed to add rule to group")
		}
		return nil
	}

	if err := f(constants.AdminGroup, constants.AdminAPI,
		constants.WritePermission); err != nil {
		return err
	}
	if err := f(constants.EditorGroup, constants.NonAdminAPI,
		constants.WritePermission); err != nil {
		return err
	}
	if err := f(constants.ViewerGroup, constants.NonAdminAPI,
		constants.ReadPermission); err != nil {
		return err
	}

	return nil
}

func (mds *ModelDaoSqlite) createGroupIfNotPresent(ctx context.Context,
	name string) (*model.Group, error) {

	group, err := mds.GetGroupByName(ctx, name)
	if err != nil {
		return nil, errors.Wrap(err.Err, "Failed to query for root group")
	}
	if group != nil {
		return group, nil
	}

	zap.S().Debugf("%s is not found, creating it", name)
	group, cErr := mds.CreateGroup(ctx, &model.Group{Name: name})
	if cErr != nil {
		return nil, cErr.Err
	}
	return group, nil
}
