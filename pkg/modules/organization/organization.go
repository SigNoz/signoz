package organization

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/modules/organization/internal"
	"github.com/SigNoz/signoz/pkg/sqlstore"
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

func NewAPI(db sqlstore.SQLStore) API {
	return internal.NewAPI(internal.NewModule(internal.NewStore(db)))
}

func NewModule(db sqlstore.SQLStore) Module {
	return internal.NewModule(internal.NewStore(db))
}
