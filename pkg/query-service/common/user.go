package common

import (
	"context"

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
