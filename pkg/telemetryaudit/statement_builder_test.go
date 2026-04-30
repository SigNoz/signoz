package telemetryaudit

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/stretchr/testify/require"
)

func auditFieldKeyMap() map[string][]*telemetrytypes.TelemetryFieldKey {
	key := func(name string, ctx telemetrytypes.FieldContext, dt telemetrytypes.FieldDataType, materialized bool) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  ctx,
			FieldDataType: dt,
			Materialized:  materialized,
		}
	}

	attr := telemetrytypes.FieldContextAttribute
	res := telemetrytypes.FieldContextResource
	str := telemetrytypes.FieldDataTypeString
	i64 := telemetrytypes.FieldDataTypeInt64

	return map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name":                 {key("service.name", res, str, false)},
		"signoz.audit.action":          {key("signoz.audit.action", attr, str, true)},
		"signoz.audit.outcome":         {key("signoz.audit.outcome", attr, str, true)},
		"signoz.audit.principal.email": {key("signoz.audit.principal.email", attr, str, true)},
		"signoz.audit.principal.id":    {key("signoz.audit.principal.id", attr, str, true)},
		"signoz.audit.principal.type":  {key("signoz.audit.principal.type", attr, str, true)},
		"signoz.audit.resource.kind":   {key("signoz.audit.resource.kind", res, str, false)},
		"signoz.audit.resource.id":     {key("signoz.audit.resource.id", res, str, false)},
		"signoz.audit.action_category": {key("signoz.audit.action_category", attr, str, false)},
		"signoz.audit.error.type":      {key("signoz.audit.error.type", attr, str, false)},
		"signoz.audit.error.code":      {key("signoz.audit.error.code", attr, str, false)},
		"http.request.method":          {key("http.request.method", attr, str, false)},
		"http.response.status_code":    {key("http.response.status_code", attr, i64, false)},
	}
}

func newTestAuditStatementBuilder(t *testing.T) *auditQueryStatementBuilder {
	t.Helper()
	fl := flaggertest.New(t)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = auditFieldKeyMap()

	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)
	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil, fl)

	return NewAuditQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		aggExprRewriter,
		DefaultFullTextColumn,
		nil,
		fl,
	)
}

func TestStatementBuilder(t *testing.T) {
	statementBuilder := newTestAuditStatementBuilder(t)
	ctx := context.Background()

	testCases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		// List: all actions by a specific user (materialized principal.id filter)
		{
			name:        "ListByPrincipalID",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{
					Expression: "signoz.audit.principal.id = '019a-1234-abcd-5678'",
				},
				Limit: 100,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, event_name, attributes_string, attributes_number, attributes_bool, resource, scope_string FROM signoz_audit.distributed_logs WHERE (`attribute_string_signoz$$audit$$principal$$id` = ? AND `attribute_string_signoz$$audit$$principal$$id_exists` = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"019a-1234-abcd-5678", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
			},
		},
		// List: all failed actions (materialized outcome filter)
		{
			name:        "ListByOutcomeFailure",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{
					Expression: "signoz.audit.outcome = 'failure'",
				},
				Limit: 100,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, event_name, attributes_string, attributes_number, attributes_bool, resource, scope_string FROM signoz_audit.distributed_logs WHERE (`attribute_string_signoz$$audit$$outcome` = ? AND `attribute_string_signoz$$audit$$outcome_exists` = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"failure", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
			},
		},
		// List: change history of a specific dashboard (two materialized column AND)
		{
			name:        "ListByResourceKindAndID",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{
					Expression: "signoz.audit.resource.kind = 'dashboard' AND signoz.audit.resource.id = '019b-5678-efgh-9012'",
				},
				Limit: 100,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_audit.distributed_logs_resource WHERE ((simpleJSONExtractString(labels, 'signoz.audit.resource.kind') = ? AND labels LIKE ? AND labels LIKE ?) AND (simpleJSONExtractString(labels, 'signoz.audit.resource.id') = ? AND labels LIKE ? AND labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, event_name, attributes_string, attributes_number, attributes_bool, resource, scope_string FROM signoz_audit.distributed_logs WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"dashboard", "%signoz.audit.resource.kind%", "%signoz.audit.resource.kind\":\"dashboard%", "019b-5678-efgh-9012", "%signoz.audit.resource.id%", "%signoz.audit.resource.id\":\"019b-5678-efgh-9012%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
			},
		},
		// List: all dashboard deletions (compliance — resource.kind + action AND)
		{
			name:        "ListByResourceKindAndAction",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{
					Expression: "signoz.audit.resource.kind = 'dashboard' AND signoz.audit.action = 'delete'",
				},
				Limit: 100,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_audit.distributed_logs_resource WHERE (simpleJSONExtractString(labels, 'signoz.audit.resource.kind') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, event_name, attributes_string, attributes_number, attributes_bool, resource, scope_string FROM signoz_audit.distributed_logs WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (`attribute_string_signoz$$audit$$action` = ? AND `attribute_string_signoz$$audit$$action_exists` = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"dashboard", "%signoz.audit.resource.kind%", "%signoz.audit.resource.kind\":\"dashboard%", uint64(1747945619), uint64(1747983448), "delete", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
			},
		},
		// List: all actions by service accounts (materialized principal.type)
		{
			name:        "ListByPrincipalType",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{
					Expression: "signoz.audit.principal.type = 'service_account'",
				},
				Limit: 100,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, event_name, attributes_string, attributes_number, attributes_bool, resource, scope_string FROM signoz_audit.distributed_logs WHERE (`attribute_string_signoz$$audit$$principal$$type` = ? AND `attribute_string_signoz$$audit$$principal$$type_exists` = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"service_account", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
			},
		},
		// Scalar: alert — count forbidden errors (outcome + action AND)
		{
			name:        "ScalarCountByOutcomeAndAction",
			requestType: qbtypes.RequestTypeScalar,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				Source:       telemetrytypes.SourceAudit,
				StepInterval: qbtypes.Step{Duration: 60 * time.Second},
				Filter: &qbtypes.Filter{
					Expression: "signoz.audit.outcome = 'failure' AND signoz.audit.action = 'update'",
				},
				Aggregations: []qbtypes.LogAggregation{
					{Expression: "count()"},
				},
			},
			expected: qbtypes.Statement{
				Query: "SELECT count() AS __result_0 FROM signoz_audit.distributed_logs WHERE ((`attribute_string_signoz$$audit$$outcome` = ? AND `attribute_string_signoz$$audit$$outcome_exists` = ?) AND (`attribute_string_signoz$$audit$$action` = ? AND `attribute_string_signoz$$audit$$action_exists` = ?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC",
				Args:  []any{"failure", true, "update", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
		// TimeSeries: failures grouped by principal email with top-N limit
		{
			name:        "TimeSeriesFailuresGroupedByPrincipal",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				Source:       telemetrytypes.SourceAudit,
				StepInterval: qbtypes.Step{Duration: 60 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{Expression: "count()"},
				},
				Filter: &qbtypes.Filter{
					Expression: "signoz.audit.outcome = 'failure'",
				},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "signoz.audit.principal.email"}},
				},
				Limit: 5,
			},
			expected: qbtypes.Statement{
				Query: "WITH __limit_cte AS (SELECT toString(multiIf(`attribute_string_signoz$$audit$$principal$$email_exists` = ?, `attribute_string_signoz$$audit$$principal$$email`, NULL)) AS `signoz.audit.principal.email`, count() AS __result_0 FROM signoz_audit.distributed_logs WHERE (`attribute_string_signoz$$audit$$outcome` = ? AND `attribute_string_signoz$$audit$$outcome_exists` = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `signoz.audit.principal.email` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, toString(multiIf(`attribute_string_signoz$$audit$$principal$$email_exists` = ?, `attribute_string_signoz$$audit$$principal$$email`, NULL)) AS `signoz.audit.principal.email`, count() AS __result_0 FROM signoz_audit.distributed_logs WHERE (`attribute_string_signoz$$audit$$outcome` = ? AND `attribute_string_signoz$$audit$$outcome_exists` = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`signoz.audit.principal.email`) GLOBAL IN (SELECT `signoz.audit.principal.email` FROM __limit_cte) GROUP BY ts, `signoz.audit.principal.email`",
				Args:  []any{true, "failure", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 5, true, "failure", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			q, err := statementBuilder.Build(ctx, 1747947419000, 1747983448000, testCase.requestType, testCase.query, nil)
			if testCase.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), testCase.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, testCase.expected.Query, q.Query)
				require.Equal(t, testCase.expected.Args, q.Args)
			}
		})
	}
}
