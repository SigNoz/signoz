package telemetry

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
)

type TelemetryUser struct {
	types.User
	Organization string `json:"organization"`
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
	users := []TelemetryUser{}

	query := sqlstore.BunDB().NewSelect().
		Table("user").
		Column("user.id", "user.display_name", "user.email", "user.created_at", "user.org_id").
		ColumnExpr("o.display_name as organization").
		Join("JOIN organizations o ON o.id = user.org_id")

	if limit > 0 {
		query.Limit(limit)
	}
	err := query.Scan(ctx, &users)
	if err != nil {
		return nil, errors.WrapNotFoundf(err, errors.CodeNotFound, "failed to get users")
	}
	return users, nil
}
