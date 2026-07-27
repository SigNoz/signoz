package implrulestatehistory

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/contextlinks"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeRuleStore struct {
	data string
	err  error
}

func (f *fakeRuleStore) CreateRule(context.Context, *ruletypes.StorableRule, func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	return valuer.UUID{}, errors.NewInternalf(errors.CodeInternal, "not implemented")
}

func (f *fakeRuleStore) EditRule(context.Context, *ruletypes.StorableRule, func(context.Context) error) error {
	return errors.NewInternalf(errors.CodeInternal, "not implemented")
}

func (f *fakeRuleStore) DeleteRule(context.Context, valuer.UUID, valuer.UUID, func(context.Context) error) error {
	return errors.NewInternalf(errors.CodeInternal, "not implemented")
}

func (f *fakeRuleStore) GetStoredRules(context.Context, string) ([]*ruletypes.StorableRule, error) {
	return nil, errors.NewInternalf(errors.CodeInternal, "not implemented")
}

func (f *fakeRuleStore) GetStoredRule(context.Context, valuer.UUID, valuer.UUID) (*ruletypes.StorableRule, error) {
	if f.err != nil {
		return nil, f.err
	}
	return &ruletypes.StorableRule{Data: f.data}, nil
}

func (f *fakeRuleStore) GetStoredRulesByMetricName(context.Context, string, string) ([]ruletypes.RuleAlert, error) {
	return nil, errors.NewInternalf(errors.CodeInternal, "not implemented")
}

func ruleJSON(alertType, signal, extraSpec string) string {
	aggregation := `{"expression": "count()"}`
	if signal == "metrics" {
		aggregation = `{"metricName": "test_metric", "spaceAggregation": "p50"}`
	}
	return `{
		"alert": "Test", "version": "v5",
		"alertType": "` + alertType + `",
		"evalWindow": "10m",
		"condition": {
			"compositeQuery": {"queryType": "builder", "queries": [
				{"type": "builder_query", "spec": {"name": "A", "signal": "` + signal + `", "stepInterval": "5m", "aggregations": [` + aggregation + `]` + extraSpec + `}}
			]},
			"target": 10.0, "matchType": "1", "op": "1"
		}
	}`
}

func TestRelatedLinkBuilderForRule(t *testing.T) {
	orgID := valuer.GenerateUUID()
	ruleID := valuer.GenerateUUID().StringValue()

	t.Run("logs rule", func(t *testing.T) {
		m := &module{ruleStore: &fakeRuleStore{
			data: ruleJSON("LOGS_BASED_ALERT", "logs", `, "filter": {"expression": "severity_text = 'ERROR'"}, "groupBy": [{"name": "service.name"}]`),
		}}

		builder := m.relatedLinkBuilderForRule(context.Background(), orgID, ruleID)
		require.NotNil(t, builder)
		assert.Equal(t, ruletypes.AlertTypeLogs, builder.alertType)
		require.NotNil(t, builder.evaluation)
		start, end := builder.evaluation.NextWindowFor(time.Unix(1785094740, 0))
		assert.Equal(t, 10*time.Minute, end.Sub(start))
		assert.Equal(t, "severity_text = 'ERROR'", builder.filterExpr)
		require.Len(t, builder.groupBy, 1)
		assert.Equal(t, "service.name", builder.groupBy[0].Name)
	})

	t.Run("v2alpha1 rule with evaluation envelope only", func(t *testing.T) {
		m := &module{ruleStore: &fakeRuleStore{
			data: `{
				"alert": "Test", "version": "v5", "schemaVersion": "v2alpha1",
				"alertType": "LOGS_BASED_ALERT",
				"evaluation": {"kind": "rolling", "spec": {"evalWindow": "30m", "frequency": "1m"}},
				"condition": {
					"compositeQuery": {"queryType": "builder", "queries": [
						{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "stepInterval": "5m", "aggregations": [{"expression": "count()"}]}}
					]},
					"target": 10.0, "matchType": "1", "op": "1"
				}
			}`,
		}}

		builder := m.relatedLinkBuilderForRule(context.Background(), orgID, ruleID)
		require.NotNil(t, builder)
		start, end := builder.evaluation.NextWindowFor(time.Unix(1785094740, 0))
		assert.Equal(t, 30*time.Minute, end.Sub(start))
	})

	t.Run("traces rule", func(t *testing.T) {
		m := &module{ruleStore: &fakeRuleStore{data: ruleJSON("TRACES_BASED_ALERT", "traces", "")}}

		builder := m.relatedLinkBuilderForRule(context.Background(), orgID, ruleID)
		require.NotNil(t, builder)
		assert.Equal(t, ruletypes.AlertTypeTraces, builder.alertType)
	})

	t.Run("metric rule has no related links", func(t *testing.T) {
		m := &module{ruleStore: &fakeRuleStore{data: ruleJSON("METRIC_BASED_ALERT", "metrics", "")}}
		assert.Nil(t, m.relatedLinkBuilderForRule(context.Background(), orgID, ruleID))
	})

	t.Run("rule store error", func(t *testing.T) {
		m := &module{ruleStore: &fakeRuleStore{err: errors.NewNotFoundf(errors.CodeNotFound, "rule not found")}}
		assert.Nil(t, m.relatedLinkBuilderForRule(context.Background(), orgID, ruleID))
	})

	t.Run("invalid rule id", func(t *testing.T) {
		m := &module{ruleStore: &fakeRuleStore{data: ruleJSON("LOGS_BASED_ALERT", "logs", "")}}
		assert.Nil(t, m.relatedLinkBuilderForRule(context.Background(), orgID, "not-a-uuid"))
	})
}

func TestRelatedLinkBuilderQueryWindow(t *testing.T) {
	t.Run("rolling window", func(t *testing.T) {
		builder := &relatedLinkBuilder{evaluation: ruletypes.RollingWindow{EvalWindow: valuer.MustParseTextDuration("10m")}}

		unixMilli := time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC).UnixMilli()
		start, end := builder.queryWindow(unixMilli)

		assert.Equal(t, time.Unix(unixMilli/1000, 0), end)
		assert.Equal(t, end.Add(-13*time.Minute), start)
	})

	t.Run("cumulative window", func(t *testing.T) {
		minute := 0
		builder := &relatedLinkBuilder{evaluation: ruletypes.CumulativeWindow{
			Schedule: ruletypes.CumulativeSchedule{Type: ruletypes.ScheduleTypeHourly, Minute: &minute},
			Timezone: "UTC",
		}}

		unixMilli := time.Date(2026, 7, 20, 12, 7, 30, 0, time.UTC).UnixMilli()
		start, end := builder.queryWindow(unixMilli)

		assert.Equal(t, time.Date(2026, 7, 20, 12, 7, 30, 0, time.UTC), end.UTC())
		assert.Equal(t, time.Date(2026, 7, 20, 11, 57, 0, 0, time.UTC), start.UTC())
	})
}

func TestRelatedLinkBuilderLinks(t *testing.T) {
	start := time.Date(2026, 7, 20, 11, 47, 0, 0, time.UTC)
	end := time.Date(2026, 7, 20, 12, 0, 0, 0, time.UTC)
	labels := rulestatehistorytypes.LabelsString(`{"service.name": "frontend"}`)

	t.Run("logs rule", func(t *testing.T) {
		builder := &relatedLinkBuilder{alertType: ruletypes.AlertTypeLogs, filterExpr: "severity_text = 'ERROR'"}

		logsLink, tracesLink := builder.links(labels, start, end)
		assert.Empty(t, tracesLink)
		whereClause := contextlinks.PrepareFilterExpression(map[string]string{"service.name": "frontend"}, "severity_text = 'ERROR'", nil)
		assert.Equal(t, contextlinks.PrepareParamsForLogsV5(start, end, whereClause).Encode(), logsLink)
	})

	t.Run("traces rule", func(t *testing.T) {
		builder := &relatedLinkBuilder{alertType: ruletypes.AlertTypeTraces}

		logsLink, tracesLink := builder.links(labels, start, end)
		assert.Empty(t, logsLink)
		whereClause := contextlinks.PrepareFilterExpression(map[string]string{"service.name": "frontend"}, "", nil)
		assert.Equal(t, contextlinks.PrepareParamsForTracesV5(start, end, whereClause).Encode(), tracesLink)
	})

	t.Run("malformed labels", func(t *testing.T) {
		builder := &relatedLinkBuilder{alertType: ruletypes.AlertTypeLogs}

		logsLink, tracesLink := builder.links(rulestatehistorytypes.LabelsString("not-json"), start, end)
		assert.Empty(t, logsLink)
		assert.Empty(t, tracesLink)
	})
}
