package aio11ypricingrule

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/aio11ypricingruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	List(ctx context.Context, orgID valuer.UUID, offset, limit int) ([]*aio11ypricingruletypes.PricingRule, int, error)
	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*aio11ypricingruletypes.PricingRule, error)
	Create(ctx context.Context, orgID valuer.UUID, createdBy string, req *aio11ypricingruletypes.PostablePricingRule) (*aio11ypricingruletypes.PricingRule, error)
	Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, req *aio11ypricingruletypes.UpdatablePricingRule) (*aio11ypricingruletypes.PricingRule, error)
	Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error
}

// Handler defines the HTTP handler interface for pricing rule endpoints.
type Handler interface {
	List(rw http.ResponseWriter, r *http.Request)
	Get(rw http.ResponseWriter, r *http.Request)
	Create(rw http.ResponseWriter, r *http.Request)
	Update(rw http.ResponseWriter, r *http.Request)
	Delete(rw http.ResponseWriter, r *http.Request)
}
