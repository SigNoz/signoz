package llmpricingrule

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	List(ctx context.Context, orgID valuer.UUID, offset, limit int) ([]*llmpricingruletypes.PricingRule, int, error)
	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*llmpricingruletypes.PricingRule, error)
	Upsert(ctx context.Context, orgID valuer.UUID, userEmail string, rules []llmpricingruletypes.UpdatablePricingRule) (inserted, updated, preserved int, err error)
	Delete(ctx context.Context, orgID, id valuer.UUID) error
}

// Handler defines the HTTP handler interface for pricing rule endpoints.
type Handler interface {
	List(rw http.ResponseWriter, r *http.Request)
	Get(rw http.ResponseWriter, r *http.Request)
	Upsert(rw http.ResponseWriter, r *http.Request)
	Delete(rw http.ResponseWriter, r *http.Request)
}
