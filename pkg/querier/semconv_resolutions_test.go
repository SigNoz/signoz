package querier

import (
	"encoding/json"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSemconvResolutionsReportsOldTraceAttribute(t *testing.T) {
	req := &qbtypes.QueryRangeRequest{
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{
			Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{Expression: "deployment.environment = 'prod'"},
			},
		}}},
	}

	assert.Equal(t, []qbtypes.SemconvResolution{{
		Requested: "deployment.environment",
		Current:   "deployment.environment.name",
		Members:   []string{"deployment.environment.name", "deployment.environment"},
		Kind:      "attribute",
	}}, semconvResolutionsForRequest(req), "old trace attribute should be reported as a family resolution")
}

func TestSemconvResolutionsReportsContextQualifiedOldAttribute(t *testing.T) {
	var req qbtypes.QueryRangeRequest
	err := json.Unmarshal([]byte(`{
		"start": 1,
		"end": 2,
		"requestType": "raw",
		"compositeQuery": {
			"queries": [{
				"type": "builder_query",
				"spec": {
					"signal": "traces",
					"name": "A",
					"filter": {"expression": "resource.deployment.environment EXISTS"}
				}
			}]
		}
	}`), &req)
	require.NoError(t, err)

	assert.Equal(t, []qbtypes.SemconvResolution{{
		Requested: "deployment.environment",
		Current:   "deployment.environment.name",
		Members:   []string{"deployment.environment.name", "deployment.environment"},
		Kind:      "attribute",
	}}, semconvResolutionsForRequest(&req), "qualified old trace attribute should be reported after request decoding")
}

func TestSemconvResolutionsReportsCurrentLogAttribute(t *testing.T) {
	req := &qbtypes.QueryRangeRequest{
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{
			Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				SelectFields: []telemetrytypes.TelemetryFieldKey{{
					Name: "deployment.environment.name",
				}},
			},
		}}},
	}

	assert.Equal(t, []qbtypes.SemconvResolution{{
		Requested: "deployment.environment.name",
		Current:   "deployment.environment.name",
		Members:   []string{"deployment.environment.name", "deployment.environment"},
		Kind:      "attribute",
	}}, semconvResolutionsForRequest(req), "current log attribute should identify its complete family")
}

func TestSemconvResolutionsReportsSpanMetricResourceLabel(t *testing.T) {
	req := &qbtypes.QueryRangeRequest{
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{
			Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Signal:       telemetrytypes.SignalMetrics,
				Aggregations: []qbtypes.MetricAggregation{{MetricName: "signoz_calls_total"}},
				Filter:       &qbtypes.Filter{Expression: "resource_deployment.environment = 'prod'"},
			},
		}}},
	}

	assert.Equal(t, []qbtypes.SemconvResolution{{
		Requested: "resource_deployment.environment",
		Current:   "deployment.environment.name",
		Members:   []string{"deployment.environment.name", "deployment.environment"},
		Kind:      "attribute",
	}}, semconvResolutionsForRequest(req), "a span-metrics resource label is reported under its stored spelling")
}

func TestSemconvResolutionsIgnoresRawSQL(t *testing.T) {
	req := &qbtypes.QueryRangeRequest{
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{
			Spec: qbtypes.ClickHouseQuery{Query: "SELECT attributes_string['deployment.environment']"},
		}}},
	}

	assert.Empty(t, semconvResolutionsForRequest(req), "raw SQL is not rewritten and should not report a resolution")
}

func TestSemconvResolutionsRequiresNameBoundary(t *testing.T) {
	req := &qbtypes.QueryRangeRequest{
		CompositeQuery: qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{{
			Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
				Filter: &qbtypes.Filter{Expression: "custom.deployment.environment = 'prod'"},
			},
		}}},
	}

	assert.Empty(t, semconvResolutionsForRequest(req), "a family name embedded in a larger custom key must not match")
}
