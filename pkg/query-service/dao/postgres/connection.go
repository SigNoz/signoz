package postgres

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/config"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/model"
	"go.signoz.io/query-service/telemetry"
	"go.uber.org/zap"
)

type modelDao struct {
	db *sqlx.DB
}

// InitConn initializes postgres db connection
func InitConn(pgconf *config.PGConfig) (*sqlx.DB, error) {

	psqlInfo := fmt.Sprintf("dbname=%s user=%s host=%s port=%d ", pgconf.DBname, pgconf.User, pgconf.Host, pgconf.Port)
	if pgconf.Password != "" {
		psqlInfo = fmt.Sprintf("%s password=%s", psqlInfo, pgconf.Password)
	}

	if pgconf.SSLmode != "" {
		psqlInfo = fmt.Sprintf("%s sslmode=%s", psqlInfo, pgconf.SSLmode)
	} else {
		psqlInfo = fmt.Sprintf("%s sslmode=disable", psqlInfo)
	}

	db, err := sqlx.Open("postgres", psqlInfo)
	if err != nil {
		return nil, err
	}
	return db, nil
}

// InitDB sets up data model (creates tables if necessary) and
// the connection pool global variable.
func InitDB(db *sqlx.DB) (*modelDao, error) {

	table_schema := `

		CREATE TABLE IF NOT EXISTS organizations (
			id UUID PRIMARY KEY,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			is_anonymous bool DEFAULT false NOT NULL,
			has_opted_updates bool DEFAULT false NOT NULL
		);

		CREATE TABLE IF NOT EXISTS invites (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			token TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			role TEXT NOT NULL,
			org_id UUID NOT NULL,
			FOREIGN KEY(org_id) REFERENCES organizations(id)
		);

		CREATE TABLE IF NOT EXISTS groups (
			id UUID PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			profile_picture_url TEXT,
			group_id UUID NOT NULL,
			org_id UUID NOT NULL,
			FOREIGN KEY(group_id) REFERENCES groups(id),
			FOREIGN KEY(org_id) REFERENCES organizations(id)
		);
	
		CREATE TABLE IF NOT EXISTS reset_password_request (
			id SERIAL PRIMARY KEY ,
			user_id UUID NOT NULL,
			token TEXT NOT NULL,
			FOREIGN KEY(user_id) REFERENCES users(id)
		);
	`

	_, err := db.Exec(table_schema)
	if err != nil {
		return nil, fmt.Errorf("Error in creating tables: %v", err.Error())
	}

	mds := &modelDao{db: db}

	ctx := context.Background()
	if err := mds.initializeOrgPreferences(ctx); err != nil {
		return nil, err
	}
	if err := mds.initializeRBAC(ctx); err != nil {
		return nil, err
	}

	return mds, nil
}

// initializeOrgPreferences initializes in-memory telemetry settings. It is planned to have
// multiple orgs in the system. In case of multiple orgs, there will be separate instance
// of in-memory telemetry for each of the org, having their own settings. As of now, we only
// have one org so this method relies on the settings of this org to initialize the telemetry etc.
// TODO(Ahsan): Make it multi-tenant when we move to a system with multiple orgs.
func (mds *modelDao) initializeOrgPreferences(ctx context.Context) error {

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

	return nil
}

// initializeRBAC creates the ADMIN, EDITOR and VIEWER groups if they are not present.
func (mds *modelDao) initializeRBAC(ctx context.Context) error {
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

func (mds *modelDao) createGroupIfNotPresent(ctx context.Context,
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
