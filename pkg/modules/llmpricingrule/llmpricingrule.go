package llmpricingrule

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/query-service/agentConf"
	"github.com/SigNoz/signoz/pkg/types/llmpricingruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	// Since this module interacts with OpAMP, it must implement the AgentFeature interface.
	agentConf.AgentFeature

	List(ctx context.Context, orgID valuer.UUID, offset, limit int) ([]*llmpricingruletypes.LLMPricingRule, int, error)
	Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*llmpricingruletypes.LLMPricingRule, error)
	CreateOrUpdate(ctx context.Context, orgID valuer.UUID, userEmail string, rules []*llmpricingruletypes.UpdatableLLMPricingRule) (err error)
	Delete(ctx context.Context, orgID, id valuer.UUID) error
}

// Handler defines the HTTP handler interface for pricing rule endpoints.
type Handler interface {
	List(rw http.ResponseWriter, r *http.Request)
	Get(rw http.ResponseWriter, r *http.Request)
	CreateOrUpdate(rw http.ResponseWriter, r *http.Request)
	Delete(rw http.ResponseWriter, r *http.Request)
}
