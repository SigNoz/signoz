package metricreductionrule_test

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/modules/metricreductionrule"
	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/stretchr/testify/assert"
)

func TestDropRuleRejectsBuiltInProtectedLabel(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{
		MatchType: metricreductionruletypes.MatchTypeDrop,
		Labels:    []string{"le"},
	}

	err := metricreductionrule.ValidateUpdatableReductionRule(req)

	assert.Error(t, err, "histogram boundary label must remain protected")
}

func TestDropRuleRejectsCurrentEnvironmentLabel(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{
		MatchType: metricreductionruletypes.MatchTypeDrop,
		Labels:    []string{"deployment.environment.name"},
	}

	err := metricreductionrule.ValidateUpdatableReductionRule(req)

	assert.Error(t, err, "current deployment environment label must remain protected")
}

func TestDropRuleRejectsHistoricalEnvironmentLabel(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{
		MatchType: metricreductionruletypes.MatchTypeDrop,
		Labels:    []string{"deployment.environment"},
	}

	err := metricreductionrule.ValidateUpdatableReductionRule(req)

	assert.Error(t, err, "historical deployment environment label must remain protected")
}

func TestKeepRuleAllowsProtectedLabel(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{
		MatchType: metricreductionruletypes.MatchTypeKeep,
		Labels:    []string{"le"},
	}

	err := metricreductionrule.ValidateUpdatableReductionRule(req)

	assert.NoError(t, err, "a keep rule may retain a protected label")
}

func TestDropRuleAllowsUnprotectedLabel(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{
		MatchType: metricreductionruletypes.MatchTypeDrop,
		Labels:    []string{"host.name"},
	}

	err := metricreductionrule.ValidateUpdatableReductionRule(req)

	assert.NoError(t, err, "an ordinary label may be dropped")
}
