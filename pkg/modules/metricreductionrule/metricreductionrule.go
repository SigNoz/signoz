package metricreductionrule

import (
	"context"
	"net/http"

	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module interface {
	List(ctx context.Context, orgID valuer.UUID, params *metricreductionruletypes.ListReductionRulesParams) (*metricreductionruletypes.GettableReductionRules, error)
	Create(ctx context.Context, orgID valuer.UUID, userEmail string, req *metricreductionruletypes.PostableReductionRule) (*metricreductionruletypes.GettableReductionRule, error)
	GetByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*metricreductionruletypes.GettableReductionRule, error)
	UpdateByID(ctx context.Context, orgID valuer.UUID, userEmail string, id valuer.UUID, req *metricreductionruletypes.UpdatableReductionRule) (*metricreductionruletypes.GettableReductionRule, error)
	DeleteByID(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error
	Preview(ctx context.Context, orgID valuer.UUID, req *metricreductionruletypes.PostableReductionRulePreview) (*metricreductionruletypes.GettableReductionRulePreview, error)
	Stats(ctx context.Context, orgID valuer.UUID) (*metricreductionruletypes.GettableReductionRuleStats, error)
	Timeseries(ctx context.Context, orgID valuer.UUID) (*querybuildertypesv5.QueryRangeResponse, error)
}

type Handler interface {
	List(rw http.ResponseWriter, r *http.Request)
	Create(rw http.ResponseWriter, r *http.Request)
	GetByID(rw http.ResponseWriter, r *http.Request)
	UpdateByID(rw http.ResponseWriter, r *http.Request)
	DeleteByID(rw http.ResponseWriter, r *http.Request)
	Preview(rw http.ResponseWriter, r *http.Request)
	Stats(rw http.ResponseWriter, r *http.Request)
	Timeseries(rw http.ResponseWriter, r *http.Request)
}
