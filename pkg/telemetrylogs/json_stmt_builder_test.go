package telemetrylogs

import (
	"context"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

func TestStmtBuilderTimeSeriesBodyGroupByJSON(t *testing.T) {
	enableBodyJSONQuery(t)
	defer func() {
		disableBodyJSONQuery(t)
	}()
	statementBuilder := buildJSONTestStatementBuilder(t)

	cases := []struct {
		name                string
		requestType         qbtypes.RequestType
		query               qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected            qbtypes.Statement
		expectedErrContains string
	}{
		{
			name:        "Group By Simple Path",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.user.age",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf((dynamicElement(body_json.`user.age`, 'Int64') IS NOT NULL), toString(dynamicElement(body_json.`user.age`, 'Int64')), (dynamicElement(body_json.`user.age`, 'String') IS NOT NULL), dynamicElement(body_json.`user.age`, 'String'), NULL)) AS `user.age`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `user.age` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf((dynamicElement(body_json.`user.age`, 'Int64') IS NOT NULL), toString(dynamicElement(body_json.`user.age`, 'Int64')), (dynamicElement(body_json.`user.age`, 'String') IS NOT NULL), dynamicElement(body_json.`user.age`, 'String'), NULL)) AS `user.age`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`user.age`) GLOBAL IN (SELECT `user.age` FROM __limit_cte) GROUP BY ts, `user.age`",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
		{
			name:        "Group By One Array Join",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.education[].awards[].type",
						},
					},
				},
			},
			expectedErrContains: "Group by/Aggregation isn't available for the Array Paths",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)

			if c.expectedErrContains != "" {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErrContains)
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func TestStmtBuilderTimeSeriesBodyGroupByPromoted(t *testing.T) {
	enableBodyJSONQuery(t)
	defer func() {
		disableBodyJSONQuery(t)
	}()
	statementBuilder := buildJSONTestStatementBuilder(t, "user.age", "user.name")

	cases := []struct {
		name                string
		requestType         qbtypes.RequestType
		query               qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected            qbtypes.Statement
		expectedErrContains string
	}{
		{
			name:        "Two simple paths",
			requestType: qbtypes.RequestTypeTimeSeries,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				StepInterval: qbtypes.Step{Duration: 30 * time.Second},
				Aggregations: []qbtypes.LogAggregation{
					{
						Expression: "count()",
					},
				},
				Limit: 10,
				GroupBy: []qbtypes.GroupByKey{
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.user.age",
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "body.user.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf((dynamicElement(body_json.`user.age`, 'Int64') IS NOT NULL OR dynamicElement(body_json_promoted.`user.age`, 'Int64') IS NOT NULL), toString(coalesce(dynamicElement(body_json.`user.age`, 'Int64'), dynamicElement(body_json_promoted.`user.age`, 'Int64'))), (dynamicElement(body_json.`user.age`, 'String') IS NOT NULL OR dynamicElement(body_json_promoted.`user.age`, 'String') IS NOT NULL), coalesce(dynamicElement(body_json.`user.age`, 'String'), dynamicElement(body_json_promoted.`user.age`, 'String')), NULL)) AS `user.age`, toString(multiIf((dynamicElement(body_json.`user.name`, 'String') IS NOT NULL OR dynamicElement(body_json_promoted.`user.name`, 'String') IS NOT NULL), coalesce(dynamicElement(body_json.`user.name`, 'String'), dynamicElement(body_json_promoted.`user.name`, 'String')), NULL)) AS `user.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `user.age`, `user.name` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf((dynamicElement(body_json.`user.age`, 'Int64') IS NOT NULL OR dynamicElement(body_json_promoted.`user.age`, 'Int64') IS NOT NULL), toString(coalesce(dynamicElement(body_json.`user.age`, 'Int64'), dynamicElement(body_json_promoted.`user.age`, 'Int64'))), (dynamicElement(body_json.`user.age`, 'String') IS NOT NULL OR dynamicElement(body_json_promoted.`user.age`, 'String') IS NOT NULL), coalesce(dynamicElement(body_json.`user.age`, 'String'), dynamicElement(body_json_promoted.`user.age`, 'String')), NULL)) AS `user.age`, toString(multiIf((dynamicElement(body_json.`user.name`, 'String') IS NOT NULL OR dynamicElement(body_json_promoted.`user.name`, 'String') IS NOT NULL), coalesce(dynamicElement(body_json.`user.name`, 'String'), dynamicElement(body_json_promoted.`user.name`, 'String')), NULL)) AS `user.name`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`user.age`, `user.name`) GLOBAL IN (SELECT `user.age`, `user.name` FROM __limit_cte) GROUP BY ts, `user.age`, `user.name`",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448)},
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)
			if c.expectedErrContains != "" {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErrContains)
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func TestStatementBuilderListQueryBody(t *testing.T) {
	enableBodyJSONQuery(t)
	defer func() {
		disableBodyJSONQuery(t)
	}()

	statementBuilder := buildJSONTestStatementBuilder(t)
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "Simple string filter",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.name = 'x'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (dynamicElement(body_json.`user.name`, 'String') = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "x", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> dynamicElement(`body_json.education`.`name`, 'String') IS NOT NULL, dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> (arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`name`, 'String') IS NOT NULL, dynamicElement(`body_json.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`name`, 'String') IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) = 'Iron Award'",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].name = 'Iron Award'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> (arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`name`, 'String') = ?, dynamicElement(`body_json.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`name`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "Iron Award", "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains Float value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains 1.65"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(toFloat64(x) -> toFloat64(x) = ?, dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) OR (arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(toFloat64(x) -> toFloat64(x) = ?, arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%1.65%", 1.65, "%1.65%", 1.65, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64 name=education[].parameters,context=body,datatype=[]dynamic]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains String value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].name Contains 'IIT'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> LOWER(dynamicElement(`body_json.education`.`name`, 'String')) LIKE LOWER(?), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%IIT%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains boolean",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains true"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(x -> x = ?, dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) OR (arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%true%", true, "%true%", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64 name=education[].parameters,context=body,datatype=[]dynamic]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains String",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains 'passed'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(toString(x) -> toString(x) = ?, dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) OR (arrayExists(`body_json.education`-> (arrayExists(x -> LOWER(x) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%passed%", "passed", "%passed%", "passed", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64 name=education[].parameters,context=body,datatype=[]dynamic]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Equals to 'sports' inside array of awards",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].type = 'sports'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> (arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`type`, 'String') = ?, dynamicElement(`body_json.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`type`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "sports", "sports", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Super nested array contains Int64 value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].ratings Contains 4"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((arrayExists(`body_json.interests`-> arrayExists(`body_json.interests[].entities`-> arrayExists(`body_json.interests[].entities[].reviews`-> arrayExists(`body_json.interests[].entities[].reviews[].entries`-> arrayExists(`body_json.interests[].entities[].reviews[].entries[].metadata`-> arrayExists(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(Int64))')) OR arrayExists(toFloat64(x) -> toFloat64(x) = ?, dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(Int64))'))), dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata`.`positions`, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities[].reviews[].entries`.`metadata`, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities[].reviews`.`entries`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities`.`reviews`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_json.interests`.`entities`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_json.`interests`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) OR (arrayExists(`body_json.interests`-> arrayExists(`body_json.interests[].entities`-> arrayExists(`body_json.interests[].entities[].reviews`-> arrayExists(`body_json.interests[].entities[].reviews[].entries`-> arrayExists(`body_json.interests[].entities[].reviews[].entries[].metadata`-> arrayExists(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`-> (arrayExists(x -> LOWER(x) LIKE LOWER(?), dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(String))')) OR arrayExists(toFloat64OrNull(x) -> toFloat64OrNull(x) = ?, dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(String))'))), dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata`.`positions`, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities[].reviews[].entries`.`metadata`, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities[].reviews`.`entries`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities`.`reviews`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_json.interests`.`entities`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_json.`interests`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%4%", float64(4), "%4%", float64(4), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `interests[].entities[].reviews[].entries[].metadata[].positions[].ratings` is ambiguous, found 2 different combinations of field context / data type: [name=interests[].entities[].reviews[].entries[].metadata[].positions[].ratings,context=body,datatype=[]int64 name=interests[].entities[].reviews[].entries[].metadata[].positions[].ratings,context=body,datatype=[]string]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Super nested array contains value - x2",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].ratings Contains 'Good'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((arrayExists(`body_json.interests`-> arrayExists(`body_json.interests[].entities`-> arrayExists(`body_json.interests[].entities[].reviews`-> arrayExists(`body_json.interests[].entities[].reviews[].entries`-> arrayExists(`body_json.interests[].entities[].reviews[].entries[].metadata`-> arrayExists(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(Int64))')) OR arrayExists(toString(x) -> toString(x) = ?, dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(Int64))'))), dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata`.`positions`, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities[].reviews[].entries`.`metadata`, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities[].reviews`.`entries`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities`.`reviews`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_json.interests`.`entities`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_json.`interests`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) OR (arrayExists(`body_json.interests`-> arrayExists(`body_json.interests[].entities`-> arrayExists(`body_json.interests[].entities[].reviews`-> arrayExists(`body_json.interests[].entities[].reviews[].entries`-> arrayExists(`body_json.interests[].entities[].reviews[].entries[].metadata`-> arrayExists(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`-> (arrayExists(x -> LOWER(x) LIKE LOWER(?), dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(String))')) OR arrayExists(x -> x = ?, dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(String))'))), dynamicElement(`body_json.interests[].entities[].reviews[].entries[].metadata`.`positions`, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities[].reviews[].entries`.`metadata`, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities[].reviews`.`entries`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_json.interests[].entities`.`reviews`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_json.interests`.`entities`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_json.`interests`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%Good%", "Good", "%Good%", "Good", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `interests[].entities[].reviews[].entries[].metadata[].positions[].ratings` is ambiguous, found 2 different combinations of field context / data type: [name=interests[].entities[].reviews[].entries[].metadata[].positions[].ratings,context=body,datatype=[]int64 name=interests[].entities[].reviews[].entries[].metadata[].positions[].ratings,context=body,datatype=[]string]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Multi nested Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].participated[].team[].branch Contains 'Civil'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> (arrayExists(`body_json.education[].awards`-> (arrayExists(`body_json.education[].awards[].participated`-> arrayExists(`body_json.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_json.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards[].participated`-> arrayExists(`body_json.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education[].awards`.`participated`, 'Array(Dynamic)'))))), dynamicElement(`body_json.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards`-> (arrayExists(`body_json.education[].awards[].participated`-> arrayExists(`body_json.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(`body_json.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`body_json.education[].awards[].participated`-> arrayExists(`body_json.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education[].awards`.`participated`, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%Civil%", "%Civil%", "%Civil%", "%Civil%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Simple Int field Contains value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.age Contains 25"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((LOWER(toString(dynamicElement(body_json.`user.age`, 'Int64'))) LIKE LOWER(?)) OR (LOWER(dynamicElement(body_json.`user.age`, 'String')) LIKE LOWER(?))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%25%", "%25%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `user.age` is ambiguous, found 2 different combinations of field context / data type: [name=user.age,context=body,datatype=int64 name=user.age,context=body,datatype=string]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Simple Float field Contains value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.height Contains 5.8"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (LOWER(toString(dynamicElement(body_json.`user.height`, 'Float64'))) LIKE LOWER(?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%5.8%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Int in array Contains value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].year Contains 2020"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> LOWER(toString(dynamicElement(`body_json.education`.`year`, 'Int64'))) LIKE LOWER(?), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%2020%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)
			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func TestStatementBuilderListQueryBodyPromoted(t *testing.T) {
	enableBodyJSONQuery(t)
	defer func() {
		disableBodyJSONQuery(t)
	}()

	statementBuilder := buildJSONTestStatementBuilder(t, "education")
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "Key inside Array(JSON) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> dynamicElement(`body_json.education`.`name`, 'String') IS NOT NULL, dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> dynamicElement(`body_json_promoted.education`.`name`, 'String') IS NOT NULL, dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].name Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> (arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`name`, 'String') IS NOT NULL, dynamicElement(`body_json.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`name`, 'String') IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(`body_json_promoted.education[].awards`-> dynamicElement(`body_json_promoted.education[].awards`.`name`, 'String') IS NOT NULL, dynamicElement(`body_json_promoted.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`body_json_promoted.education[].awards`-> dynamicElement(`body_json_promoted.education[].awards`.`name`, 'String') IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json_promoted.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) = 'Iron Award'",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].name = 'Iron Award'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> (arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`name`, 'String') = ?, dynamicElement(`body_json.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`name`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(`body_json_promoted.education[].awards`-> dynamicElement(`body_json_promoted.education[].awards`.`name`, 'String') = ?, dynamicElement(`body_json_promoted.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`body_json_promoted.education[].awards`-> dynamicElement(`body_json_promoted.education[].awards`.`name`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json_promoted.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "Iron Award", "Iron Award", "Iron Award", "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains 1.65"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(toFloat64(x) -> toFloat64(x) = ?, dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(toFloat64(x) -> toFloat64(x) = ?, dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) OR (arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(toFloat64(x) -> toFloat64(x) = ?, arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(toFloat64(x) -> toFloat64(x) = ?, arrayMap(x->dynamicElement(x, 'Float64'), arrayFilter(x->(dynamicType(x) = 'Float64'), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%1.65%", 1.65, "%1.65%", 1.65, "%1.65%", 1.65, "%1.65%", 1.65, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64 name=education[].parameters,context=body,datatype=[]dynamic]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Key inside Array(JSON) contains String value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].name Contains 'IIT'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> LOWER(dynamicElement(`body_json.education`.`name`, 'String')) LIKE LOWER(?), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> LOWER(dynamicElement(`body_json_promoted.education`.`name`, 'String')) LIKE LOWER(?), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%IIT%", "%IIT%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains boolean",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains true"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(x -> x = ?, dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(x -> x = ?, dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) OR (arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'Bool'), arrayFilter(x->(dynamicType(x) = 'Bool'), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%true%", true, "%true%", true, "%true%", true, "%true%", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64 name=education[].parameters,context=body,datatype=[]dynamic]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Dynamic array contains String",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].parameters Contains 'passed'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query:    "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND ((arrayExists(`body_json.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(toString(x) -> toString(x) = ?, dynamicElement(`body_json.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(toString(x) -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(toString(x) -> toString(x) = ?, dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) OR (arrayExists(`body_json.education`-> (arrayExists(x -> LOWER(x) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`body_json.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(x -> LOWER(x) LIKE LOWER(?), arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Dynamic)')))) OR arrayExists(x -> x = ?, arrayMap(x->dynamicElement(x, 'String'), arrayFilter(x->(dynamicType(x) = 'String'), dynamicElement(`body_json_promoted.education`.`parameters`, 'Array(Dynamic)'))))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:     []any{uint64(1747945619), uint64(1747983448), "%passed%", "passed", "%passed%", "passed", "%passed%", "passed", "%passed%", "passed", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64 name=education[].parameters,context=body,datatype=[]dynamic]."},
			},
			expectedErr: nil,
		},
		{
			name:        "Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].type = 'sports'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> (arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`type`, 'String') = ?, dynamicElement(`body_json.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards`-> dynamicElement(`body_json.education[].awards`.`type`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(`body_json_promoted.education[].awards`-> dynamicElement(`body_json_promoted.education[].awards`.`type`, 'String') = ?, dynamicElement(`body_json_promoted.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`body_json_promoted.education[].awards`-> dynamicElement(`body_json_promoted.education[].awards`.`type`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json_promoted.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "sports", "sports", "sports", "sports", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "Multi nested Array(Dynamic) + Array(JSON) both can contain a value",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.education[].awards[].participated[].team[].branch Contains 'Civil'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (arrayExists(`body_json.education`-> (arrayExists(`body_json.education[].awards`-> (arrayExists(`body_json.education[].awards[].participated`-> arrayExists(`body_json.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_json.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards[].participated`-> arrayExists(`body_json.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education[].awards`.`participated`, 'Array(Dynamic)'))))), dynamicElement(`body_json.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_json.education[].awards`-> (arrayExists(`body_json.education[].awards[].participated`-> arrayExists(`body_json.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(`body_json.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`body_json.education[].awards[].participated`-> arrayExists(`body_json.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education[].awards`.`participated`, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')) OR arrayExists(`body_json_promoted.education`-> (arrayExists(`body_json_promoted.education[].awards`-> (arrayExists(`body_json_promoted.education[].awards[].participated`-> arrayExists(`body_json_promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json_promoted.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json_promoted.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=4))')), dynamicElement(`body_json_promoted.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=16))')) OR arrayExists(`body_json_promoted.education[].awards[].participated`-> arrayExists(`body_json_promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json_promoted.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json_promoted.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json_promoted.education[].awards`.`participated`, 'Array(Dynamic)'))))), dynamicElement(`body_json_promoted.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')) OR arrayExists(`body_json_promoted.education[].awards`-> (arrayExists(`body_json_promoted.education[].awards[].participated`-> arrayExists(`body_json_promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json_promoted.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json_promoted.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(`body_json_promoted.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`body_json_promoted.education[].awards[].participated`-> arrayExists(`body_json_promoted.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_json_promoted.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_json_promoted.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json_promoted.education[].awards`.`participated`, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_json_promoted.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_json_promoted.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))'))) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%Civil%", "%Civil%", "%Civil%", "%Civil%", "%Civil%", "%Civil%", "%Civil%", "%Civil%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)

			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func TestStatementBuilderListQueryBodyMessage(t *testing.T) {
	enableBodyJSONQuery(t)
	defer func() {
		disableBodyJSONQuery(t)
	}()

	statementBuilder := buildJSONTestStatementBuilder(t)
	indexed := []*telemetrytypes.TelemetryFieldKey{
		{
			Name: "message",
			Indexes: []telemetrytypes.JSONDataTypeIndex{
				{
					Type:             telemetrytypes.String,
					ColumnExpression: "body_json_promoted.message",
					IndexExpression:  "(lower(assumeNotNull(dynamicElement(body_json_promoted.message, 'String'))))",
				},
			},
		},
	}
	testAddIndexedPaths(t, statementBuilder, indexed...)
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    qbtypes.Statement
		expectedErr error
	}{
		{
			name:        "body.message Exists",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.message Exists"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (dynamicElement(body_json.`message`, 'String') IS NOT NULL OR dynamicElement(body_json_promoted.`message`, 'String') IS NOT NULL) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "body.message equals to empty string",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.message = ''"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (dynamicElement(body_json.`message`, 'String') = ? OR dynamicElement(body_json_promoted.`message`, 'String') = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "", "", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "body.message equals to 'Iron Award'",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.message = 'Iron Award'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (dynamicElement(body_json.`message`, 'String') = ? OR dynamicElement(body_json_promoted.`message`, 'String') = ?) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "Iron Award", "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
		{
			name:        "body.message contains 'Iron Award'",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.message Contains 'Iron Award'"},
				Limit:  10,
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, body_json, body_json_promoted, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND (LOWER(dynamicElement(body_json.`message`, 'String')) LIKE LOWER(?) OR LOWER(dynamicElement(body_json_promoted.`message`, 'String')) LIKE LOWER(?)) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?",
				Args:  []any{uint64(1747945619), uint64(1747983448), "%Iron Award%", "%Iron Award%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
			expectedErr: nil,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, c.requestType, c.query, nil)

			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
			} else {
				require.NoError(t, err)
				require.Equal(t, c.expected.Query, q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}

func buildTestTelemetryMetadataStore(promotedPaths ...string) *telemetrytypestest.MockMetadataStore {
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()

	types, _ := testTypeSet()
	for path, jsonTypes := range types {
		promoted := false

		split := strings.Split(path, telemetrytypes.ArraySep)
		if path == "message" {
			promoted = true
		} else if slices.Contains(promotedPaths, split[0]) {
			promoted = true
		}
		// Create a TelemetryFieldKey for each JSONDataType for this path
		// Since a path can have multiple types, we create one key per type
		for _, jsonType := range jsonTypes {
			key := &telemetrytypes.TelemetryFieldKey{
				Name:          path,
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextBody,
				FieldDataType: telemetrytypes.MappingJSONDataTypeToFieldDataType[jsonType],
				JSONDataType:  &jsonType,
				Materialized:  promoted,
			}
			mockMetadataStore.SetKey(key)
		}
	}

	return mockMetadataStore
}

func buildJSONTestStatementBuilder(_ *testing.T, promotedPaths ...string) *logQueryStatementBuilder {
	fm := NewFieldMapper()
	mockMetadataStore := buildTestTelemetryMetadataStore(promotedPaths...)
	cb := NewConditionBuilder(fm, mockMetadataStore)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil)
	resourceFilterStmtBuilder := resourcefilter.NewLogResourceFilterStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		fm,
		cb,
		mockMetadataStore,
		DefaultFullTextColumn,
		GetBodyJSONKey,
	)

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		resourceFilterStmtBuilder,
		aggExprRewriter,
		DefaultFullTextColumn,
		GetBodyJSONKey,
	)

	return statementBuilder
}

func testAddIndexedPaths(t *testing.T, statementBuilder *logQueryStatementBuilder, telemetryFieldKeys ...*telemetrytypes.TelemetryFieldKey) {
	mockMetadataStore := statementBuilder.metadataStore.(*telemetrytypestest.MockMetadataStore)
	for _, key := range telemetryFieldKeys {
		if strings.Contains(key.Name, telemetrytypes.ArraySep) || strings.Contains(key.Name, telemetrytypes.ArrayAnyIndex) {
			t.Fatalf("array paths are not supported: %s", key.Name)
		}

		for _, storedKey := range mockMetadataStore.KeysMap[key.Name] {
			storedKey.Indexes = append(storedKey.Indexes, key.Indexes...)
		}
	}
}

func enableBodyJSONQuery(_ *testing.T) {
	querybuilder.BodyJSONQueryEnabled = true
}

func disableBodyJSONQuery(_ *testing.T) {
	querybuilder.BodyJSONQueryEnabled = false
}
