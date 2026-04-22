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
	Create(ctx context.Context, orgID valuer.UUID, createdBy string, rule *aio11ypricingruletypes.PricingRule) error
	Update(ctx context.Context, orgID, id valuer.UUID, updatedBy string, rule *aio11ypricingruletypes.PricingRule) error
	Delete(ctx context.Context, orgID, id valuer.UUID) error
	Sync(ctx context.Context, orgID valuer.UUID, rules []aio11ypricingruletypes.PricingRule) error
}

// Handler defines the HTTP handler interface for pricing rule endpoints.
type Handler interface {
	List(rw http.ResponseWriter, r *http.Request)
	Get(rw http.ResponseWriter, r *http.Request)
	Create(rw http.ResponseWriter, r *http.Request)
	Update(rw http.ResponseWriter, r *http.Request)
	Delete(rw http.ResponseWriter, r *http.Request)
	Sync(rw http.ResponseWriter, r *http.Request)
}
