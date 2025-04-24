package organization

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	Create(context.Context, *types.Organization) error
	Get(context.Context, valuer.UUID) (*types.Organization, error)
	GetAll(context.Context) ([]*types.Organization, error)
	Update(context.Context, *types.Organization) error
}

type API interface {
	Get(http.ResponseWriter, *http.Request)
	GetAll(http.ResponseWriter, *http.Request)
	Update(http.ResponseWriter, *http.Request)
}
