package sqlite

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
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

		CREATE TABLE IF NOT EXISTS invites (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			token TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			role TEXT NOT NULL,
			org_id TEXT NOT NULL,
			FOREIGN KEY(org_id) REFERENCES organizations(id)
		);
		CREATE TABLE IF NOT EXISTS organizations (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK(is_anonymous IN (0,1)),
			has_opted_updates INTEGER NOT NULL DEFAULT 1 CHECK(has_opted_updates IN (0,1))
		);
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			profile_picture_url TEXT,
			group_id TEXT NOT NULL,
			org_id TEXT NOT NULL,
			FOREIGN KEY(group_id) REFERENCES groups(id),
			FOREIGN KEY(org_id) REFERENCES organizations(id)
		);
		CREATE TABLE IF NOT EXISTS groups (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		CREATE TABLE IF NOT EXISTS reset_password_request (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL,
			token TEXT NOT NULL,
			FOREIGN KEY(user_id) REFERENCES users(id)
		);
		CREATE TABLE IF NOT EXISTS user_flags (
			user_id TEXT PRIMARY KEY,
			flags TEXT,
			FOREIGN KEY(user_id) REFERENCES users(id)
		);
		CREATE TABLE IF NOT EXISTS apdex_settings (
			service_name TEXT PRIMARY KEY,
			threshold FLOAT NOT NULL,
			exclude_status_codes TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS ingestion_keys (
			key_id TEXT PRIMARY KEY,
			name TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			ingestion_key TEXT NOT NULL,
			ingestion_url TEXT NOT NULL,
			data_region TEXT NOT NULL
		);
	`

	_, err = db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("error in creating tables: %v", err.Error())
	}

	mds := &ModelDaoSqlite{db: db}

	ctx := context.Background()
	if err := mds.initializeOrgPreferences(ctx); err != nil {
		return nil, err
	}
	if err := mds.initializeRBAC(ctx); err != nil {
		return nil, err
	}

	telemetry.GetInstance().SetUserCountCallback(mds.GetUserCount)
	telemetry.GetInstance().SetUserRoleCallback(mds.GetUserRole)
	telemetry.GetInstance().SetGetUsersCallback(mds.GetUsers)

	return mds, nil
}

// DB returns database connection
func (mds *ModelDaoSqlite) DB() *sqlx.DB {
	return mds.db
}

// initializeOrgPreferences initializes in-memory telemetry settings. It is planned to have
// multiple orgs in the system. In case of multiple orgs, there will be separate instance
// of in-memory telemetry for each of the org, having their own settings. As of now, we only
// have one org so this method relies on the settings of this org to initialize the telemetry etc.
// TODO(Ahsan): Make it multi-tenant when we move to a system with multiple orgs.
func (mds *ModelDaoSqlite) initializeOrgPreferences(ctx context.Context) error {

	// set anonymous setting as default in case of any failures to fetch UserPreference in below section
	telemetry.GetInstance().SetTelemetryAnonymous(constants.DEFAULT_TELEMETRY_ANONYMOUS)

	orgs, apiError := mds.GetOrgs(ctx)
	if apiError != nil {
		return apiError.Err
	}

	if len(orgs) > 1 {
		return errors.Errorf("Found %d organizations, expected one or none.", len(orgs))
	}

	var org model.Organization
	if len(orgs) == 1 {
		org = orgs[0]
	}

	// set telemetry fields from userPreferences
	telemetry.GetInstance().SetDistinctId(org.Id)

	users, _ := mds.GetUsers(ctx)
	countUsers := len(users)
	if countUsers > 0 {
		telemetry.GetInstance().SetCompanyDomain(users[countUsers-1].Email)
		telemetry.GetInstance().SetUserEmail(users[countUsers-1].Email)
	}

	return nil
}

// initializeRBAC creates the ADMIN, EDITOR and VIEWER groups if they are not present.
func (mds *ModelDaoSqlite) initializeRBAC(ctx context.Context) error {
	f := func(groupName string) error {
		_, err := mds.createGroupIfNotPresent(ctx, groupName)
		return errors.Wrap(err, "Failed to create group")
	}

	if err := f(constants.AdminGroup); err != nil {
		return err
	}
	if err := f(constants.EditorGroup); err != nil {
		return err
	}
	if err := f(constants.ViewerGroup); err != nil {
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

	zap.L().Debug("group is not found, creating it", zap.String("group_name", name))
	group, cErr := mds.CreateGroup(ctx, &model.Group{Name: name})
	if cErr != nil {
		return nil, cErr.Err
	}
	return group, nil
}
