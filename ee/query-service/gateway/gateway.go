package gateway

import (
	"context"

	basemodel "go.signoz.io/signoz/pkg/query-service/model"
)

type Gateway interface {
	// Creates a tenant based on name
	CreateTenant(context.Context, string) basemodel.BaseApiError
	// Returns key id and value for a tenant based on name and key expiry
	CreateKey(context.Context, string, int64) (string, string, basemodel.BaseApiError)
	// Deletes a key for a tenant based on name and id
	DeleteKey(context.Context, string, string) basemodel.BaseApiError
}
