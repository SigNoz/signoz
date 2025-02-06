package common

import (
	"context"
	"fmt"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/model"
)

func GetUserFromContext(ctx context.Context) *model.UserPayload {
	user, ok := ctx.Value(constants.ContextUserKey).(*model.UserPayload)
	if !ok {
		return nil
	}
	return user
}

func TenantSqlPredicate(ctx context.Context) string {
	tenant := ctx.Value(constants.ContextTenantKey).(string)
	return fmt.Sprintf(` created_by IN (SELECT u.email FROM users u INNER JOIN organizations o ON u.org_id = o.id WHERE o.name = '%s')`,
		tenant)
}
