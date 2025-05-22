package telemetry

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
)

type TelemetryUser struct {
	types.User
	Organization string
}

func GetUsers(ctx context.Context, sqlstore sqlstore.SQLStore) ([]TelemetryUser, error) {
	return GetUsersWithOpts(ctx, 0, sqlstore)
}

func GetUserCount(ctx context.Context, sqlstore sqlstore.SQLStore) (int, error) {
	users, err := GetUsersWithOpts(ctx, 0, sqlstore)
	if err != nil {
		return 0, err
	}
	return len(users), nil
}

// GetUsersWithOpts fetches users and supports additional search options
func GetUsersWithOpts(ctx context.Context, limit int, sqlstore sqlstore.SQLStore) ([]TelemetryUser, error) {
	var displayName string
	err := sqlstore.BunDB().NewSelect().
		Model(&types.Organization{}).
		Column("display_name").
		Scan(ctx, &displayName)
	if err != nil {
		return nil, sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "cannot find organization")
	}

	users := []types.User{}

	query := sqlstore.
		BunDB().
		NewSelect().
		Model(&users)
	if limit > 0 {
		query.Limit(limit)
	}

	err = query.Scan(ctx)
	if err != nil {
		return nil, sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "failed to get users")
	}

	telemetryUsers := []TelemetryUser{}
	for _, user := range users {
		telemetryUsers = append(telemetryUsers, TelemetryUser{
			User:         user,
			Organization: displayName,
		})
	}

	return telemetryUsers, nil
}
