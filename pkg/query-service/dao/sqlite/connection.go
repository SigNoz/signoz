package sqlite

import (
	"context"

	"github.com/SigNoz/signoz/pkg/query-service/constants"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/pkg/errors"
	"github.com/uptrace/bun"
)

type ModelDaoSqlite struct {
	bundb *bun.DB
}

// InitDB sets up setting up the connection pool global variable.
func InitDB(sqlStore sqlstore.SQLStore) (*ModelDaoSqlite, error) {
	mds := &ModelDaoSqlite{bundb: sqlStore.BunDB()}

	ctx := context.Background()
	if err := mds.initializeOrgPreferences(ctx); err != nil {
		return nil, err
	}

	telemetry.GetInstance().SetUserCountCallback(mds.GetUserCount)
	telemetry.GetInstance().SetGetUsersCallback(mds.GetUsers)

	return mds, nil
}

// DB returns database connection
func (mds *ModelDaoSqlite) DB() *bun.DB {
	return mds.bundb
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

	var org types.Organization
	if len(orgs) == 1 {
		org = orgs[0]
	}

	// set telemetry fields from userPreferences
	telemetry.GetInstance().SetDistinctId(org.ID.StringValue())

	users, _ := mds.GetUsers(ctx)
	countUsers := len(users)
	if countUsers > 0 {
		telemetry.GetInstance().SetCompanyDomain(users[countUsers-1].Email)
		telemetry.GetInstance().SetUserEmail(users[countUsers-1].Email)
	}

	return nil
}
