package metricreductionruletypes_test

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/metricreductionruletypes"
	"github.com/stretchr/testify/assert"
)

func TestNilUpdatableReductionRuleReturnsError(t *testing.T) {
	err := (*metricreductionruletypes.UpdatableReductionRule)(nil).Validate()

	assert.Error(t, err, "nil update request should be rejected")
}

func TestUpdatableReductionRuleRejectsInvalidMatchType(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{Labels: []string{"host"}}

	err := req.Validate()

	assert.Error(t, err, "unknown match type should be rejected")
}

func TestUpdatableReductionRuleRejectsEmptyLabels(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{MatchType: metricreductionruletypes.MatchTypeDrop}

	err := req.Validate()

	assert.Error(t, err, "empty label list should be rejected")
}

func TestUpdatableReductionRuleAcceptsKeepRule(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{
		MatchType: metricreductionruletypes.MatchTypeKeep,
		Labels:    []string{"le"},
	}

	err := req.Validate()

	assert.NoError(t, err, "structurally valid keep rule should be accepted")
}

func TestUpdatableReductionRuleAcceptsDropRule(t *testing.T) {
	req := &metricreductionruletypes.UpdatableReductionRule{
		MatchType: metricreductionruletypes.MatchTypeDrop,
		Labels:    []string{"host"},
	}

	err := req.Validate()

	assert.NoError(t, err, "structurally valid drop rule should be accepted")
}

func TestNilPostableReductionRuleReturnsError(t *testing.T) {
	err := (*metricreductionruletypes.PostableReductionRule)(nil).Validate()

	assert.Error(t, err, "nil create request should be rejected")
}

func TestPostableReductionRuleRequiresMetricName(t *testing.T) {
	req := &metricreductionruletypes.PostableReductionRule{
		UpdatableReductionRule: metricreductionruletypes.UpdatableReductionRule{
			MatchType: metricreductionruletypes.MatchTypeKeep,
			Labels:    []string{"host"},
		},
	}

	err := req.Validate()

	assert.Error(t, err, "metric name should be required")
}

func TestPostableReductionRuleAcceptsValidRequest(t *testing.T) {
	req := &metricreductionruletypes.PostableReductionRule{
		MetricName: "m",
		UpdatableReductionRule: metricreductionruletypes.UpdatableReductionRule{
			MatchType: metricreductionruletypes.MatchTypeKeep,
			Labels:    []string{"host"},
		},
	}

	err := req.Validate()

	assert.NoError(t, err, "complete create request should be accepted")
}
