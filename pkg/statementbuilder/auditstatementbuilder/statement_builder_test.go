package auditstatementbuilder

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/flagger/flaggertest"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/audittelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func auditFieldKeyMap() map[string][]*telemetrytypes.TelemetryFieldKey {
	key := func(name string, ctx telemetrytypes.FieldContext, dt telemetrytypes.FieldDataType) *telemetrytypes.TelemetryFieldKey {
		return &telemetrytypes.TelemetryFieldKey{
			Name:          name,
			Signal:        telemetrytypes.SignalLogs,
			FieldContext:  ctx,
			FieldDataType: dt,
		}
	}

	attr := telemetrytypes.FieldContextAttribute
	res := telemetrytypes.FieldContextResource
	str := telemetrytypes.FieldDataTypeString
	i64 := telemetrytypes.FieldDataTypeInt64

	return map[string][]*telemetrytypes.TelemetryFieldKey{
		"service.name":                 {key("service.name", res, str)},
		"signoz.audit.action":          {key("signoz.audit.action", attr, str)},
		"signoz.audit.outcome":         {key("signoz.audit.outcome", attr, str)},
		"signoz.audit.principal.email": {key("signoz.audit.principal.email", attr, str)},
		"signoz.audit.principal.id":    {key("signoz.audit.principal.id", attr, str)},
		"signoz.audit.principal.type":  {key("signoz.audit.principal.type", attr, str)},
		"signoz.audit.resource.kind":   {key("signoz.audit.resource.kind", res, str)},
		"signoz.audit.resource.id":     {key("signoz.audit.resource.id", res, str)},
		"signoz.audit.action_category": {key("signoz.audit.action_category", attr, str)},
		"signoz.audit.error.type":      {key("signoz.audit.error.type", attr, str)},
		"signoz.audit.error.code":      {key("signoz.audit.error.code", attr, str)},
		"http.request.method":          {key("http.request.method", attr, str)},
		"http.response.status_code":    {key("http.response.status_code", attr, i64)},
	}
}

func newTestAuditStatementBuilder(t *testing.T, keysMap map[string][]*telemetrytypes.TelemetryFieldKey) *auditQueryStatementBuilder {
	t.Helper()
	fl := flaggertest.New(t)
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.KeysMap = keysMap

	storage := audittelemetryschema.NewStorage()
	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, storage, fl, telemetrytypes.SignalLogs)

	return NewAuditQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		storage,
		aggExprRewriter,
		audittelemetryschema.DefaultFullTextColumn,
		fl,
	)
}

func TestStatementBuilder(t *testing.T) {
	statementBuilder := newTestAuditStatementBuilder(t, auditFieldKeyMap())
	ctx := context.Background()

	testCases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		// List: all actions by a specific user
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
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE (attributes.`signoz.audit.principal.id`::String = ? AND attributes.`signoz.audit.principal.id` IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"019a-1234-abcd-5678", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
			},
		},
		// List: all failed actions
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
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE (attributes.`signoz.audit.outcome`::String = ? AND attributes.`signoz.audit.outcome` IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"failure", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
			},
		},
		// List: change history of a specific dashboard (two resource keys AND)
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_audit.distributed_logs_resource WHERE ((simpleJSONExtractString(labels, 'signoz.audit.resource.kind') = ? AND labels LIKE ? AND labels LIKE ?) AND (simpleJSONExtractString(labels, 'signoz.audit.resource.id') = ? AND labels LIKE ? AND labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
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
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_audit.distributed_logs_resource WHERE (simpleJSONExtractString(labels, 'signoz.audit.resource.kind') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (attributes.`signoz.audit.action`::String = ? AND attributes.`signoz.audit.action` IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"dashboard", "%signoz.audit.resource.kind%", "%signoz.audit.resource.kind\":\"dashboard%", uint64(1747945619), uint64(1747983448), "delete", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
			},
		},
		// List: all actions by service accounts
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
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE (attributes.`signoz.audit.principal.type`::String = ? AND attributes.`signoz.audit.principal.type` IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"service_account", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 100},
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
				Query: "SELECT count() AS __result_0 FROM signoz_audit.distributed_logs WHERE ((attributes.`signoz.audit.outcome`::String = ? AND attributes.`signoz.audit.outcome` IS NOT NULL) AND (attributes.`signoz.audit.action`::String = ? AND attributes.`signoz.audit.action` IS NOT NULL)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY __result_0 DESC",
				Args:  []any{"failure", "update", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
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
				Query: "WITH __limit_cte AS (SELECT toString(multiIf(attributes.`signoz.audit.principal.email` IS NOT NULL, attributes.`signoz.audit.principal.email`::String, NULL)) AS `signoz.audit.principal.email`, count() AS __result_0 FROM signoz_audit.distributed_logs WHERE (attributes.`signoz.audit.outcome`::String = ? AND attributes.`signoz.audit.outcome` IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `signoz.audit.principal.email` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, toString(multiIf(attributes.`signoz.audit.principal.email` IS NOT NULL, attributes.`signoz.audit.principal.email`::String, NULL)) AS `signoz.audit.principal.email`, count() AS __result_0 FROM signoz_audit.distributed_logs WHERE (attributes.`signoz.audit.outcome`::String = ? AND attributes.`signoz.audit.outcome` IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`signoz.audit.principal.email`) GLOBAL IN (SELECT `signoz.audit.principal.email` FROM __limit_cte) GROUP BY ts, `signoz.audit.principal.email`",
				Args:  []any{"failure", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 5, "failure", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			q, err := statementBuilder.Build(ctx, valuer.UUID{}, 1747947419000, 1747983448000, testCase.requestType, testCase.query, nil)
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

// Audit has no keys tables yet, so every key outside the intrinsic fields
// resolves through the storage fallback.
func TestStatementBuilder_WithoutMetadata(t *testing.T) {
	statementBuilder := newTestAuditStatementBuilder(t, map[string][]*telemetrytypes.TelemetryFieldKey{})
	ctx := context.Background()

	testCases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
	}{
		{
			name:        "ListByAttribute",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{Expression: "signoz.audit.outcome = 'failure'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE (attributes.`signoz.audit.outcome`::String = ? AND attributes.`signoz.audit.outcome` IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"failure", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:        "ListByResourceAttribute",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{Expression: "resource.signoz.audit.resource.kind = 'dashboard'"},
				Limit:  20,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE (resource.attributes.`signoz.audit.resource.kind`::String = ? AND resource.attributes.`signoz.audit.resource.kind` IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"dashboard", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 20},
			},
		},
		{
			name:        "ListByScopeNameAndBody",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{Expression: "scope.name = 'signoz.audit' AND body CONTAINS 'deleted'"},
				Limit:  30,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE ((scope.name = ? AND scope.name <> '') AND LOWER(body.message) LIKE LOWER(?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"signoz.audit", "%deleted%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 30},
			},
		},
		{
			name:        "ListByFullText",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{Expression: "'dashboard.deleted'"},
				Limit:  40,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE match(body.message, ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"dashboard.deleted", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 40},
			},
		},
		{
			name:        "ListByNumericAttribute",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{Expression: "http.response.status_code >= 400"},
				Limit:  50,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE toFloat64OrNull(attributes.`http.response.status_code`::String) >= ? AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{float64(400), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 50},
			},
		},
		{
			name:        "ListByAttributeExists_OrderByTimestamp",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{Expression: "signoz.audit.error.code EXISTS"},
				Order: []qbtypes.OrderBy{
					{Key: qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "timestamp"}}, Direction: qbtypes.OrderDirectionDesc},
				},
				Limit: 60,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE attributes.`signoz.audit.error.code` IS NOT NULL AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? ORDER BY timestamp desc LIMIT ?",
				Args:  []any{"1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 60},
			},
		},
		{
			name:        "ListSelectFields",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "signoz.audit.principal.email", FieldContext: telemetrytypes.FieldContextAttribute},
					{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource},
					{Name: "body"},
				},
				Limit: 70,
			},
			expected: qbtypes.Statement{
				Query: "SELECT timestamp, id, multiIf(attributes.`signoz.audit.principal.email` IS NOT NULL, attributes.`signoz.audit.principal.email`::String, NULL) AS `signoz.audit.principal.email`, multiIf(resource.attributes.`service.name` IS NOT NULL, resource.attributes.`service.name`::String, NULL) AS `service.name`, body.message AS `body` FROM signoz_audit.distributed_logs WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 70},
			},
		},
		{
			name:        "ScalarCountGroupedByAttribute",
			requestType: qbtypes.RequestTypeScalar,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				Source:       telemetrytypes.SourceAudit,
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "signoz.audit.action"}},
				},
			},
			expected: qbtypes.Statement{
				Query: "SELECT toString(multiIf(attributes.`signoz.audit.action` IS NOT NULL, attributes.`signoz.audit.action`::String, NULL)) AS `signoz.audit.action`, count() AS __result_0 FROM signoz_audit.distributed_logs WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `signoz.audit.action` ORDER BY __result_0 DESC",
				Args:  []any{"1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			q, err := statementBuilder.Build(ctx, valuer.UUID{}, 1747947419000, 1747983448000, testCase.requestType, testCase.query, nil)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected.Query, q.Query)
			assert.Equal(t, testCase.expected.Args, q.Args)
		})
	}
}

func TestStatementBuilder_KnownResourceFields(t *testing.T) {
	keysMap := map[string][]*telemetrytypes.TelemetryFieldKey{}
	for name, field := range audittelemetryschema.ResourceFields {
		keysMap[name] = []*telemetrytypes.TelemetryFieldKey{&field}
	}
	statementBuilder := newTestAuditStatementBuilder(t, keysMap)
	ctx := context.Background()

	testCases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
	}{
		{
			name:        "ListByBareResourceKey",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Source: telemetrytypes.SourceAudit,
				Filter: &qbtypes.Filter{Expression: "signoz.audit.resource.kind = 'role'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_audit.distributed_logs_resource WHERE (simpleJSONExtractString(labels, 'signoz.audit.resource.kind') = ? AND labels LIKE ? AND labels LIKE ?) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body, event_name, attributes, resource, scope FROM signoz_audit.distributed_logs WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{"role", "%signoz.audit.resource.kind%", "%signoz.audit.resource.kind\":\"role%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:        "ScalarCountGroupedByBareResourceKey",
			requestType: qbtypes.RequestTypeScalar,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				Source:       telemetrytypes.SourceAudit,
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
				GroupBy: []qbtypes.GroupByKey{
					{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "signoz.audit.resource.kind"}},
				},
			},
			expected: qbtypes.Statement{
				Query: "SELECT toString(multiIf(resource.attributes.`signoz.audit.resource.kind` IS NOT NULL, resource.attributes.`signoz.audit.resource.kind`::String, NULL)) AS `signoz.audit.resource.kind`, count() AS __result_0 FROM signoz_audit.distributed_logs WHERE timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `signoz.audit.resource.kind` ORDER BY __result_0 DESC",
				Args:  []any{"1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			q, err := statementBuilder.Build(ctx, valuer.UUID{}, 1747947419000, 1747983448000, testCase.requestType, testCase.query, nil)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected.Query, q.Query)
			assert.Equal(t, testCase.expected.Args, q.Args)
			assert.Empty(t, q.Warnings)
		})
	}
}

func TestStatementBuilderHeatmap(t *testing.T) {
	statementBuilder := newTestAuditStatementBuilder(t, auditFieldKeyMap())

	testCases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
	}{
		{
			name:        "AttributeField_LinearAxis_RequiresField",
			requestType: qbtypes.RequestTypeHeatmap,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:        telemetrytypes.SignalLogs,
				Source:        telemetrytypes.SourceAudit,
				StepInterval:  qbtypes.Step{Duration: 60 * time.Second},
				Aggregations:  []qbtypes.LogAggregation{{Expression: "http.response.status_code"}},
				Filter:        &qbtypes.Filter{Expression: "signoz.audit.resource.kind = 'dashboard'"},
				GroupBy:       []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "signoz.audit.action"}}},
				BucketOptions: &qbtypes.BucketOptions{Kind: qbtypes.BucketsKindLinear, Spec: qbtypes.LinearBucketsSpec{MaxValue: 500, NumBuckets: 5}},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_audit.distributed_logs_resource WHERE ((simpleJSONExtractString(labels, 'signoz.audit.resource.kind') = ? AND labels LIKE ? AND labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), ifNull(toFloat64OrNull(attributes.`http.response.status_code`::String), 0) AS __bucket_value SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, toString(multiIf(attributes.`signoz.audit.action` IS NOT NULL, attributes.`signoz.audit.action`::String, NULL)) AS `signoz.audit.action`, multiIf(__bucket_value <= 0, toFloat64('-Inf'), __bucket_value > 500, toFloat64(500), (least(greatest(ceil(__bucket_value * 5 / 500), 1), 5) - 1) * 500 / 5) AS __bucket_min, multiIf(__bucket_value <= 0, toFloat64(0), __bucket_value > 500, toFloat64('+Inf'), least(greatest(ceil(__bucket_value * 5 / 500), 1), 5) * 500 / 5) AS __bucket_max, count() AS __result_0 FROM signoz_audit.distributed_logs WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND toFloat64OrNull(attributes.`http.response.status_code`::String) IS NOT NULL AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY ts, `signoz.audit.action`, __bucket_min, __bucket_max",
				Args:  []any{"dashboard", "%signoz.audit.resource.kind%", "%signoz.audit.resource.kind\":\"dashboard%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
		{
			name:        "Distribution_AttributeField_SameStatementAsHeatmap",
			requestType: qbtypes.RequestTypeDistribution,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:        telemetrytypes.SignalLogs,
				Source:        telemetrytypes.SourceAudit,
				StepInterval:  qbtypes.Step{Duration: 60 * time.Second},
				Aggregations:  []qbtypes.LogAggregation{{Expression: "http.response.status_code"}},
				Filter:        &qbtypes.Filter{Expression: "signoz.audit.resource.kind = 'dashboard'"},
				GroupBy:       []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "signoz.audit.action"}}},
				BucketOptions: &qbtypes.BucketOptions{Kind: qbtypes.BucketsKindLinear, Spec: qbtypes.LinearBucketsSpec{MaxValue: 500, NumBuckets: 5}},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_audit.distributed_logs_resource WHERE ((simpleJSONExtractString(labels, 'signoz.audit.resource.kind') = ? AND labels LIKE ? AND labels LIKE ?)) AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ? GROUP BY fingerprint), ifNull(toFloat64OrNull(attributes.`http.response.status_code`::String), 0) AS __bucket_value SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 60 SECOND) AS ts, toString(multiIf(attributes.`signoz.audit.action` IS NOT NULL, attributes.`signoz.audit.action`::String, NULL)) AS `signoz.audit.action`, multiIf(__bucket_value <= 0, toFloat64('-Inf'), __bucket_value > 500, toFloat64(500), (least(greatest(ceil(__bucket_value * 5 / 500), 1), 5) - 1) * 500 / 5) AS __bucket_min, multiIf(__bucket_value <= 0, toFloat64(0), __bucket_value > 500, toFloat64('+Inf'), least(greatest(ceil(__bucket_value * 5 / 500), 1), 5) * 500 / 5) AS __bucket_max, count() AS __result_0 FROM signoz_audit.distributed_logs WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND toFloat64OrNull(attributes.`http.response.status_code`::String) IS NOT NULL AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY ts, `signoz.audit.action`, __bucket_min, __bucket_max",
				Args:  []any{"dashboard", "%signoz.audit.resource.kind%", "%signoz.audit.resource.kind\":\"dashboard%", uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			statement, err := statementBuilder.Build(context.Background(), valuer.UUID{}, 1747947419000, 1747983448000, testCase.requestType, testCase.query, nil)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected.Query, statement.Query)
			assert.Equal(t, testCase.expected.Args, statement.Args)
			assert.Equal(t, testCase.expected.Warnings, statement.Warnings)
		})
	}
}
