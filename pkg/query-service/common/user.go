package common

import (
	"context"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/types"
)

func GetUserFromContext(ctx context.Context) *types.GettableUser {
	user, ok := ctx.Value(constants.ContextUserKey).(*types.GettableUser)
	if !ok {
		return nil
	}
	return user
}
