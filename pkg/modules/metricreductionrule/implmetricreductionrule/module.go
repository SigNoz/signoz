package implmetricreductionrule

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/metricreductionrule"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct{}

func NewModule() metricreductionrule.Module {
	return &module{}
}

var errUnsupported = errors.New(errors.TypeUnsupported, metricreductionruletypes.ErrCodeMetricReductionRuleUnsupported,
	"metric volume control is an enterprise feature")

func (m *module) List(_ context.Context, _ valuer.UUID, _ *metricreductionruletypes.ListReductionRulesParams) (*metricreductionruletypes.GettableReductionRules, error) {
	return nil, errUnsupported
}

func (m *module) Create(_ context.Context, _ valuer.UUID, _ string, _ *metricreductionruletypes.PostableReductionRule) (*metricreductionruletypes.GettableReductionRule, error) {
	return nil, errUnsupported
}

func (m *module) GetByID(_ context.Context, _ valuer.UUID, _ valuer.UUID) (*metricreductionruletypes.GettableReductionRule, error) {
	return nil, errUnsupported
}

func (m *module) UpdateByID(_ context.Context, _ valuer.UUID, _ string, _ valuer.UUID, _ *metricreductionruletypes.UpdatableReductionRule) (*metricreductionruletypes.GettableReductionRule, error) {
	return nil, errUnsupported
}

func (m *module) DeleteByID(_ context.Context, _ valuer.UUID, _ valuer.UUID) error {
	return errUnsupported
}

func (m *module) Preview(_ context.Context, _ valuer.UUID, _ *metricreductionruletypes.PostableReductionRulePreview) (*metricreductionruletypes.GettableReductionRulePreview, error) {
	return nil, errUnsupported
}

func (m *module) Stats(_ context.Context, _ valuer.UUID) (*metricreductionruletypes.GettableReductionRuleStats, error) {
	return nil, errUnsupported
}

func (m *module) Timeseries(_ context.Context, _ valuer.UUID) (*querybuildertypesv5.QueryRangeResponse, error) {
	return nil, errUnsupported
}
