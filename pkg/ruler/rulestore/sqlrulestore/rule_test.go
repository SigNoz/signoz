package sqlrulestore_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/ruler/rulestore/rulestoretest"
	basetypes "github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var testTime = time.Date(2026, 7, 17, 0, 0, 0, 0, time.UTC)

func newTestRule(orgID string, id valuer.UUID) *ruletypes.StorableRule {
	return &ruletypes.StorableRule{
		Identifiable:  basetypes.Identifiable{ID: id},
		TimeAuditable: basetypes.TimeAuditable{CreatedAt: testTime, UpdatedAt: testTime},
		UserAuditable: basetypes.UserAuditable{CreatedBy: "test-user", UpdatedBy: "test-user"},
		OrgID:         orgID,
		Data:          `{"alert":"test","alertType":"metric","ruleType":"threshold","condition":null}`,
	}
}

// metricAlertRuleData returns a JSON PostableRule payload containing a
// metric-builder query that references the given metric name. Used as the
// Data column for GetStoredRulesByMetricName test fixtures.
func metricAlertRuleData(t *testing.T, alertName, metricName string) string {
	t.Helper()

	pr := ruletypes.PostableRule{
		AlertName: alertName,
		AlertType: ruletypes.AlertTypeMetric,
		RuleType:  ruletypes.RuleTypeThreshold,
		RuleCondition: &ruletypes.RuleCondition{
			CompositeQuery: &ruletypes.AlertCompositeQuery{
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
						Name:         "A",
						StepInterval: qbtypes.Step{Duration: 60 * time.Second},
						Signal:       telemetrytypes.SignalMetrics,
						Aggregations: []qbtypes.MetricAggregation{{
							MetricName:       metricName,
							Temporality:      metrictypes.Cumulative,
							TimeAggregation:  metrictypes.TimeAggregationRate,
							SpaceAggregation: metrictypes.SpaceAggregationSum,
						}},
					},
				}},
				PanelType: ruletypes.PanelTypeGraph,
				QueryType: ruletypes.QueryTypeBuilder,
			},
		},
	}

	encoded, err := json.Marshal(pr)
	require.NoError(t, err)
	return string(encoded)
}

func TestCreateRule_HappyPath(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgID := "org-create-1"
	ruleID := valuer.GenerateUUID()
	rule := newTestRule(orgID, ruleID)

	store.ExpectCreateRule(rule)

	called := false
	gotID, err := store.CreateRule(ctx, rule, func(_ context.Context, _ valuer.UUID) error {
		called = true
		return nil
	})

	require.NoError(t, err)
	require.Equal(t, ruleID, gotID)
	require.True(t, called, "CreateRule must invoke the post-insert callback")
	require.NoError(t, store.AssertExpectations())
}

func TestEditRule_HappyPath(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgID := "org-edit-1"
	ruleID := valuer.GenerateUUID()
	rule := newTestRule(orgID, ruleID)

	store.ExpectEditRule(rule)

	called := false
	err := store.EditRule(ctx, rule, func(_ context.Context) error {
		called = true
		return nil
	})

	require.NoError(t, err)
	require.True(t, called, "EditRule must invoke the post-update callback")
	require.NoError(t, store.AssertExpectations())
}

func TestDeleteRule_HappyPath(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgID := valuer.GenerateUUID()
	ruleID := valuer.GenerateUUID()

	store.ExpectDeleteRule(ruleID)

	called := false
	err := store.DeleteRule(ctx, orgID, ruleID, func(_ context.Context) error {
		called = true
		return nil
	})

	require.NoError(t, err)
	require.True(t, called, "DeleteRule must invoke the post-delete callback")
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRule_NotFound(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgID := valuer.GenerateUUID()
	ruleID := valuer.GenerateUUID()

	store.Mock().ExpectQuery(`SELECT (.+) FROM "rule".+WHERE \(org_id = '.+'\) AND \(id = '` + ruleID.StringValue() + `'\)`).
		WillReturnError(errors.New("sql: no rows in result set"))

	_, err := store.GetStoredRule(ctx, orgID, ruleID)

	require.Error(t, err, "GetStoredRule must wrap a missing row into a not-found error")
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRules_Empty(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgIDStr := "org-empty"
	store.ExpectGetStoredRules(orgIDStr, nil)

	rules, err := store.GetStoredRules(ctx, orgIDStr)

	require.NoError(t, err)
	require.Empty(t, rules)
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRules_Populated(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgIDStr := "org-populated-1"
	want := []*ruletypes.StorableRule{
		newTestRule(orgIDStr, valuer.GenerateUUID()),
		newTestRule(orgIDStr, valuer.GenerateUUID()),
	}

	store.ExpectGetStoredRules(orgIDStr, want)

	got, err := store.GetStoredRules(ctx, orgIDStr)

	require.NoError(t, err)
	require.Len(t, got, 2)
	require.Equal(t, want[0].ID, got[0].ID)
	require.Equal(t, want[1].ID, got[1].ID)
	require.NoError(t, store.AssertExpectations())
}

// TestGetStoredRules_MultiOrgIsolation is the regression coverage for the
// "first org instead of rule org" bug (#11351): a rule stored under org A
// must not surface when querying GetStoredRules for org B.
func TestGetStoredRules_MultiOrgIsolation(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgA := "org-A"
	orgB := "org-B"

	rulesInA := []*ruletypes.StorableRule{newTestRule(orgA, valuer.GenerateUUID())}
	store.ExpectGetStoredRules(orgA, rulesInA)
	store.ExpectGetStoredRules(orgB, nil)

	gotA, err := store.GetStoredRules(ctx, orgA)
	require.NoError(t, err)
	require.Len(t, gotA, 1, "org A should see its own rule")

	gotB, err := store.GetStoredRules(ctx, orgB)
	require.NoError(t, err)
	require.Empty(t, gotB, "org B must not see org A's rules")

	require.NoError(t, store.AssertExpectations())
}

// TestGetStoredRulesByMetricName_EmptyMetricName covers the short-circuit
// path: an empty metric name returns an empty slice without hitting the DB.
func TestGetStoredRulesByMetricName_EmptyMetricName(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	alerts, err := store.GetStoredRulesByMetricName(ctx, "org-metric-1", "")

	require.NoError(t, err)
	require.Empty(t, alerts)
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRulesByMetricName_NoMatchingRules(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgIDStr := "org-metric-2"
	store.ExpectGetStoredRules(orgIDStr, nil)

	alerts, err := store.GetStoredRulesByMetricName(ctx, orgIDStr, "any-metric")

	require.NoError(t, err)
	require.Empty(t, alerts)
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRulesByMetricName_MatchesByMetricName(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	orgIDStr := "org-metric-3"
	alertID := valuer.GenerateUUID()

	matchingRule := newTestRule(orgIDStr, alertID)
	matchingRule.Data = metricAlertRuleData(t, "cpu-saturation", "cpu_usage")
	otherRule := newTestRule(orgIDStr, valuer.GenerateUUID())
	otherRule.Data = metricAlertRuleData(t, "mem-saturation", "memory_usage")

	store.ExpectGetStoredRules(orgIDStr, []*ruletypes.StorableRule{matchingRule, otherRule})

	alerts, err := store.GetStoredRulesByMetricName(ctx, orgIDStr, "cpu_usage")

	require.NoError(t, err)
	require.Len(t, alerts, 1, "only the cpu_usage rule should surface")
	require.Equal(t, "cpu-saturation", alerts[0].AlertName)
	require.Equal(t, alertID.StringValue(), alerts[0].AlertID)
	require.NoError(t, store.AssertExpectations())
}

func TestGetStoredRulesByMetricName_OrgScoped(t *testing.T) {
	ctx := context.Background()
	store := rulestoretest.NewMockSQLRuleStore()

	// org-A has a rule on "cpu_usage"; org-B has none. The second call
	// against org-B must not surface org-A's rule.
	orgA := "org-A-metric"
	alertAID := valuer.GenerateUUID()
	ruleA := newTestRule(orgA, alertAID)
	ruleA.Data = metricAlertRuleData(t, "cpu-A", "cpu_usage")

	store.ExpectGetStoredRules(orgA, []*ruletypes.StorableRule{ruleA})
	store.ExpectGetStoredRules("org-B-metric", nil)

	alertsA, err := store.GetStoredRulesByMetricName(ctx, orgA, "cpu_usage")
	require.NoError(t, err)
	require.Len(t, alertsA, 1)
	require.Equal(t, alertAID.StringValue(), alertsA[0].AlertID)

	alertsB, err := store.GetStoredRulesByMetricName(ctx, "org-B-metric", "cpu_usage")
	require.NoError(t, err)
	require.Empty(t, alertsB, "org B must not see org A's rule")

	require.NoError(t, store.AssertExpectations())
}
