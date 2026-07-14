package alertmanagertemplate

import (
	"testing"

	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"
)

func TestAggregateKV(t *testing.T) {
	extractLabels := func(a *types.Alert) model.LabelSet { return a.Labels }

	testCases := []struct {
		name      string
		alerts    []*types.Alert
		extractFn func(*types.Alert) model.LabelSet
		expected  template.KV
	}{
		{
			name:      "empty alerts slice",
			alerts:    []*types.Alert{},
			extractFn: extractLabels,
			expected:  template.KV{},
		},
		{
			name: "single alert",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"env":     "production",
							"service": "backend",
						},
					},
				},
			},
			extractFn: extractLabels,
			expected: template.KV{
				"env":     "production",
				"service": "backend",
			},
		},
		{
			name: "varying values with duplicates deduped",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"env": "production", "service": "backend"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "production", "service": "api"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "production", "service": "frontend"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "production", "service": "api"}}},
			},
			extractFn: extractLabels,
			expected: template.KV{
				"env":     "production",
				"service": "backend, api, frontend",
			},
		},
		{
			name: "more than 5 unique values truncates to 5",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc1"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc2"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc3"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc4"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc5"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc6"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "svc7"}}},
			},
			extractFn: extractLabels,
			expected: template.KV{
				"service": "svc1, svc2, svc3, svc4, svc5",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := aggregateKV(tc.alerts, tc.extractFn)
			require.Equal(t, tc.expected, result)
		})
	}
}

func TestExtractCommonKV(t *testing.T) {
	extractLabels := func(a *types.Alert) model.LabelSet { return a.Labels }
	extractAnnotations := func(a *types.Alert) model.LabelSet { return a.Annotations }

	testCases := []struct {
		name      string
		alerts    []*types.Alert
		extractFn func(*types.Alert) model.LabelSet
		expected  template.KV
	}{
		{
			name:      "empty alerts slice",
			alerts:    []*types.Alert{},
			extractFn: extractLabels,
			expected:  template.KV{},
		},
		{
			name: "single alert returns all labels",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "service": "api"}}},
			},
			extractFn: extractLabels,
			expected:  template.KV{"env": "prod", "service": "api"},
		},
		{
			name: "multiple alerts with fully common labels",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "region": "us-east"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "region": "us-east"}}},
			},
			extractFn: extractLabels,
			expected:  template.KV{"env": "prod", "region": "us-east"},
		},
		{
			name: "multiple alerts with partially common labels",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "service": "api"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"env": "prod", "service": "worker"}}},
			},
			extractFn: extractLabels,
			expected:  template.KV{"env": "prod"},
		},
		{
			name: "multiple alerts with no common labels",
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"service": "api"}}},
				{Alert: model.Alert{Labels: model.LabelSet{"service": "worker"}}},
			},
			extractFn: extractLabels,
			expected:  template.KV{},
		},
		{
			name: "annotations extract common annotations",
			alerts: []*types.Alert{
				{Alert: model.Alert{Annotations: model.LabelSet{"summary": "high cpu", "runbook": "http://x"}}},
				{Alert: model.Alert{Annotations: model.LabelSet{"summary": "high cpu", "runbook": "http://y"}}},
			},
			extractFn: extractAnnotations,
			expected:  template.KV{"summary": "high cpu"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := extractCommonKV(tc.alerts, tc.extractFn)
			require.Equal(t, tc.expected, result)
		})
	}
}
