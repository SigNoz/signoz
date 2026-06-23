package implmetricreductionrule

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/metricreductionrule"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct{}

func NewModule() metricreductionrule.Module {
	return &module{}
}

func errUnsupported() error {
	return errors.Newf(errors.TypeUnsupported, metricreductionruletypes.ErrCodeMetricReductionRuleUnsupported,
		"metric volume control is an enterprise feature")
}

func (m *module) List(_ context.Context, _ valuer.UUID, _ *metricreductionruletypes.ListReductionRulesParams) (*metricreductionruletypes.GettableReductionRules, error) {
	return nil, errUnsupported()
}

func (m *module) Get(_ context.Context, _ valuer.UUID, _ string) (*metricreductionruletypes.GettableReductionRule, error) {
	return nil, errUnsupported()
}

func (m *module) Upsert(_ context.Context, _ valuer.UUID, _ string, _ *metricreductionruletypes.PostableReductionRule) (*metricreductionruletypes.GettableReductionRule, error) {
	return nil, errUnsupported()
}

func (m *module) Delete(_ context.Context, _ valuer.UUID, _ string) error {
	return errUnsupported()
}

func (m *module) Preview(_ context.Context, _ valuer.UUID, _ *metricreductionruletypes.PostableReductionRulePreview) (*metricreductionruletypes.GettableReductionRulePreview, error) {
	return nil, errUnsupported()
}
