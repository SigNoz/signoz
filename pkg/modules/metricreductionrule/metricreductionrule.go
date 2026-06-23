package metricreductionrule

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	List(ctx context.Context, orgID valuer.UUID, params *metricreductionruletypes.ListReductionRulesParams) (*metricreductionruletypes.GettableReductionRules, error)
	Get(ctx context.Context, orgID valuer.UUID, metricName string) (*metricreductionruletypes.GettableReductionRule, error)
	Upsert(ctx context.Context, orgID valuer.UUID, userEmail string, req *metricreductionruletypes.PostableReductionRule) (*metricreductionruletypes.GettableReductionRule, error)
	Delete(ctx context.Context, orgID valuer.UUID, metricName string) error
	Preview(ctx context.Context, orgID valuer.UUID, req *metricreductionruletypes.PostableReductionRulePreview) (*metricreductionruletypes.GettableReductionRulePreview, error)
}

type Handler interface {
	List(rw http.ResponseWriter, r *http.Request)
	Get(rw http.ResponseWriter, r *http.Request)
	Upsert(rw http.ResponseWriter, r *http.Request)
	Delete(rw http.ResponseWriter, r *http.Request)
	Preview(rw http.ResponseWriter, r *http.Request)
}
