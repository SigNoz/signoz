package telemetrylogs

import (
	"context"
	"slices"
	"strings"
	"testing"
	"time"

	schemamigrator "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/require"
)

const (
	testJSONQueryPrefix = "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE true AND seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?) SELECT timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body_v2 as body, attributes_string, attributes_number, attributes_bool, resources_string, scope_string FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND"
	testJSONQuerySuffix = "AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? LIMIT ?"
)

type TestExpected struct {
	WhereClause string
	Args        []any
	Warnings    []string
}

func (t TestExpected) GetQuery() string {
	return strings.Join([]string{testJSONQueryPrefix, t.WhereClause, testJSONQuerySuffix}, " ")
}

func TestJSONStmtBuilder_TimeSeries(t *testing.T) {
	enable, disable := jsonQueryTestUtil(t)
	enable()
	defer disable()
	statementBuilder := buildJSONTestStatementBuilder(t, false)

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
							Name: "user.age",
						},
					},
				},
			},
			expected: qbtypes.Statement{
				Query: "WITH __resource_filter AS (SELECT fingerprint FROM signoz_logs.distributed_logs_v2_resource WHERE seen_at_ts_bucket_start >= ? AND seen_at_ts_bucket_start <= ?), __limit_cte AS (SELECT toString(multiIf((dynamicElement(body_v2.`user.age`, 'Int64') IS NOT NULL), toString(dynamicElement(body_v2.`user.age`, 'Int64')), (dynamicElement(body_v2.`user.age`, 'String') IS NOT NULL), dynamicElement(body_v2.`user.age`, 'String'), NULL)) AS `user.age`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? GROUP BY `user.age` ORDER BY __result_0 DESC LIMIT ?) SELECT toStartOfInterval(fromUnixTimestamp64Nano(timestamp), INTERVAL 30 SECOND) AS ts, toString(multiIf((dynamicElement(body_v2.`user.age`, 'Int64') IS NOT NULL), toString(dynamicElement(body_v2.`user.age`, 'Int64')), (dynamicElement(body_v2.`user.age`, 'String') IS NOT NULL), dynamicElement(body_v2.`user.age`, 'String'), NULL)) AS `user.age`, count() AS __result_0 FROM signoz_logs.distributed_logs_v2 WHERE resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter) AND timestamp >= ? AND ts_bucket_start >= ? AND timestamp < ? AND ts_bucket_start <= ? AND (`user.age`) GLOBAL IN (SELECT `user.age` FROM __limit_cte) GROUP BY ts, `user.age`",
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
							Name: "education[].awards[].type",
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

/* Promoted path tests commented out — Materialized now means type hint (direct sub-column),
   not a body_promoted.* column. These tests assumed the old coalesce(body_promoted.x, body_v2.x) path.

func TestStmtBuilderTimeSeriesBodyGroupByPromoted(t *testing.T) {
	enable, disable := jsonQueryTestUtil(t)
	enable()
	defer disable()
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
							Name: "user.age",
						},
					},
					{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name: "user.name",
						},
					},
				},
			},
			expected: qbtypes.Statement{
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
*/

func TestJSONStmtBuilder_PrimitivePaths(t *testing.T) {
	enable, disable := jsonQueryTestUtil(t)
	enable()
	defer disable()

	statementBuilder := buildJSONTestStatementBuilder(t, false)
	cases := []struct {
		name        string
		filter      string
		expected    TestExpected
		expectedErr error
	}{
		// ── intrinsic sub-column (body_v2.message) ──────────────────────────────
		{
			name:   "message Exists",
			filter: "message Exists",
			expected: TestExpected{
				WhereClause: "body_v2.message <> ?",
				Args:        []any{uint64(1747945619), uint64(1747983448), "", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "message Contains 'Iron Award'",
			filter: "message Contains 'Iron Award'",
			expected: TestExpected{
				WhereClause: "LOWER(body_v2.message) LIKE LOWER(?)",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%Iron Award%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},

		// ── flat nested primitive (x.y) ─────────────────────────────────────────
		{
			name:   "Simple string filter",
			filter: "body.user.name = 'x'",
			expected: TestExpected{
				WhereClause: "((dynamicElement(body_v2.`user.name`, 'String') = ?) AND has(JSONAllPaths(body_v2), 'user.name'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "x", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Simple Int field Contains value",
			filter: "body.user.age Contains 25",
			expected: TestExpected{
				WhereClause: "(((LOWER(toString(dynamicElement(body_v2.`user.age`, 'Int64'))) LIKE LOWER(?)) AND has(JSONAllPaths(body_v2), 'user.age')) OR ((LOWER(dynamicElement(body_v2.`user.age`, 'String')) LIKE LOWER(?)) AND has(JSONAllPaths(body_v2), 'user.age')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%25%", "%25%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings:    []string{"Key `user.age` is ambiguous, found 2 different combinations of field context / data type: [name=user.age,context=body,datatype=int64,jsondatatype=Int64 name=user.age,context=body,datatype=string,jsondatatype=String]."},
			},
		},
		{
			name:   "Simple Float field Contains value",
			filter: "body.user.height Contains 5.8",
			expected: TestExpected{
				WhereClause: "((LOWER(toString(dynamicElement(body_v2.`user.height`, 'Float64'))) LIKE LOWER(?)) AND has(JSONAllPaths(body_v2), 'user.height'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%5.8%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Float GT",
			filter: "body.user.height > 5.8",
			expected: TestExpected{
				WhereClause: "((toFloat64(dynamicElement(body_v2.`user.height`, 'Float64')) > ?) AND has(JSONAllPaths(body_v2), 'user.height'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), 5.8, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "String Like",
			filter: "body.user.name LIKE '%ali%'",
			expected: TestExpected{
				WhereClause: "((dynamicElement(body_v2.`user.name`, 'String') LIKE ?) AND has(JSONAllPaths(body_v2), 'user.name'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%ali%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "String Regexp",
			filter: "body.user.name REGEXP 'al.*'",
			expected: TestExpected{
				WhereClause: "((match(dynamicElement(body_v2.`user.name`, 'String'), ?)) AND has(JSONAllPaths(body_v2), 'user.name'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "al.*", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Primitive Bool NotEqual",
			filter: "body.user.active != true",
			expected: TestExpected{
				WhereClause: "(assumeNotNull(dynamicElement(body_v2.`user.active`, 'Bool')) <> ?)",
				Args:        []any{uint64(1747945619), uint64(1747983448), true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Primitive Bool NotExists",
			filter: "body.user.active NOT EXISTS",
			expected: TestExpected{
				WhereClause: "(dynamicElement(body_v2.`user.active`, 'Bool') IS NULL)",
				Args:        []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Primitive String NotContains",
			filter: "body.user.name NOT CONTAINS 'IIT'",
			expected: TestExpected{
				WhereClause: "(LOWER(assumeNotNull(dynamicElement(body_v2.`user.name`, 'String'))) NOT LIKE LOWER(?))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%IIT%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Primitive String NotLike",
			filter: "body.user.name NOT LIKE '%ali%'",
			expected: TestExpected{
				WhereClause: "(assumeNotNull(dynamicElement(body_v2.`user.name`, 'String')) NOT LIKE ?)",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%ali%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Primitive String NotRegexp",
			filter: "body.user.name NOT REGEXP 'al.*'",
			expected: TestExpected{
				WhereClause: "(NOT match(assumeNotNull(dynamicElement(body_v2.`user.name`, 'String')), ?))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "al.*", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Primitive String NotIn",
			filter: "body.user.name NOT IN ['alice', 'bob']",
			expected: TestExpected{
				WhereClause: "(assumeNotNull(dynamicElement(body_v2.`user.name`, 'String')) NOT IN (?, ?))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "alice", "bob", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},

		// ── deeply nested primitive (x.y.z) ─────────────────────────────────────
		{
			name:   "Primitive Int64 NotBetween",
			filter: "body.user.address.zip NOT BETWEEN 100000 AND 999999",
			expected: TestExpected{
				WhereClause: "(toFloat64(assumeNotNull(dynamicElement(body_v2.`user.address.zip`, 'Int64'))) NOT BETWEEN ? AND ?)",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(100000), float64(999999), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, qbtypes.RequestTypeRaw,
				qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
					Signal: telemetrytypes.SignalLogs,
					Filter: &qbtypes.Filter{Expression: c.filter},
					Limit:  10,
				}, nil)
			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
				return
			}
			require.NoError(t, err)
			require.Equal(t, c.expected.GetQuery(), q.Query)
			require.Equal(t, c.expected.Args, q.Args)
			require.Equal(t, c.expected.Warnings, q.Warnings)
		})
	}
}

/* Promoted path list-query tests commented out — Materialized now means type hint
   (direct sub-column access), not a body_promoted.* column.

func TestStatementBuilderListQueryBodyPromoted(t *testing.T) {
	enable, disable := jsonQueryTestUtil(t)
	enable()
	defer disable()

	statementBuilder := buildJSONTestStatementBuilder(t, "education", "tags")
	cases := []struct {
		name        string
		requestType qbtypes.RequestType
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    TestExpected
		expectedErr error
	}{
		{
			name:        "Has Array promoted uses body fallback",
			requestType: qbtypes.RequestTypeRaw,
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "has(body.tags, 'production')"},
				Limit:  10,
			},
			expected: TestExpected{
				Args:  []any{uint64(1747945619), uint64(1747983448), "production", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
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
			expected: TestExpected{
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
			expected: TestExpected{
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
			expected: TestExpected{
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
			expected: TestExpected{
				Args:     []any{uint64(1747945619), uint64(1747983448), "%1.65%", 1.65, "%1.65%", 1.65, "%1.65%", 1.65, "%1.65%", 1.65, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,materialized=true,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,materialized=true,jsondatatype=Array(Dynamic)]."},
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
			expected: TestExpected{
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
			expected: TestExpected{
				Args:     []any{uint64(1747945619), uint64(1747983448), "%true%", true, "%true%", true, "%true%", true, "%true%", true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,materialized=true,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,materialized=true,jsondatatype=Array(Dynamic)]."},
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
			expected: TestExpected{
				Args:     []any{uint64(1747945619), uint64(1747983448), "%passed%", "passed", "%passed%", "passed", "%passed%", "passed", "%passed%", "passed", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,materialized=true,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,materialized=true,jsondatatype=Array(Dynamic)]."},
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
			expected: TestExpected{
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
			expected: TestExpected{
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
				require.Equal(t, c.expected.GetQuery(), q.Query)
				require.Equal(t, c.expected.Args, q.Args)
				require.Equal(t, c.expected.Warnings, q.Warnings)
			}
		})
	}
}
*/

func TestJSONStmtBuilder_ArrayPaths(t *testing.T) {
	enable, disable := jsonQueryTestUtil(t)
	enable()
	defer disable()

	statementBuilder := buildJSONTestStatementBuilder(t, false)
	cases := []struct {
		name        string
		filter      string
		expected    TestExpected
		expectedErr error
	}{
		// ── single-hop (x[].y) ──────────────────────────────────────────────────
		{
			name:   "Key inside Array(JSON) exists",
			filter: "body.education[].name Exists",
			expected: TestExpected{
				WhereClause: "(arrayExists(`body_v2.education`-> dynamicElement(`body_v2.education`.`name`, 'String') IS NOT NULL, dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Key inside Array(JSON) contains String value",
			filter: "body.education[].name Contains 'IIT'",
			expected: TestExpected{
				WhereClause: "((arrayExists(`body_v2.education`-> LOWER(dynamicElement(`body_v2.education`.`name`, 'String')) LIKE LOWER(?), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%IIT%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Int in array Contains value",
			filter: "body.education[].year Contains 2020",
			expected: TestExpected{
				WhereClause: "((arrayExists(`body_v2.education`-> LOWER(toString(dynamicElement(`body_v2.education`.`year`, 'Int64'))) LIKE LOWER(?), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%2020%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Array simple path NotEqual",
			filter: "body.education[].type != '10001'",
			expected: TestExpected{
				WhereClause: "((NOT arrayExists(`body_v2.education`-> toFloat64OrNull(dynamicElement(`body_v2.education`.`type`, 'String')) = ?, dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND (NOT arrayExists(`body_v2.education`-> dynamicElement(`body_v2.education`.`type`, 'Int64') = ?, dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))))",
				Args:        []any{uint64(1747945619), uint64(1747983448), int64(10001), int64(10001), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings:    []string{"Key `education[].type` is ambiguous, found 2 different combinations of field context / data type: [name=education[].type,context=body,datatype=string,jsondatatype=String name=education[].type,context=body,datatype=int64,jsondatatype=Int64]."},
			},
		},
		{
			name:   "Array simple path NotExists",
			filter: "body.education[].name NOT EXISTS",
			expected: TestExpected{
				WhereClause: "(NOT arrayExists(`body_v2.education`-> dynamicElement(`body_v2.education`.`name`, 'String') IS NOT NULL, dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Array simple path NotContains",
			filter: "body.education[].name NOT CONTAINS 'IIT'",
			expected: TestExpected{
				WhereClause: "(NOT arrayExists(`body_v2.education`-> LOWER(dynamicElement(`body_v2.education`.`name`, 'String')) LIKE LOWER(?), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%IIT%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},

		// ── single-hop terminal array (x[].y[]) ─────────────────────────────────
		{
			name:   "Key inside Array(JSON) contains Float value",
			filter: "body.education[].parameters Contains 1.65",
			expected: TestExpected{
				WhereClause: "(((arrayExists(`body_v2.education`-> (arrayExists(x -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(x -> toFloat64(x) = ?, dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education')) OR ((arrayExists(`body_v2.education`-> (arrayExists(x -> LOWER(toString(x)) LIKE LOWER(?), arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)'))) OR arrayExists(x -> accurateCastOrNull(x, 'Float64') = ?, arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)')))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%1.65%", 1.65, "%1.65%", 1.65, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings:    []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,jsondatatype=Array(Dynamic)]."},
			},
		},
		{
			name:   "Dynamic array element comparison",
			filter: "body.education[].parameters = 'passed'",
			expected: TestExpected{
				WhereClause: "(((arrayExists(`body_v2.education`-> arrayExists(x -> toString(x) = ?, dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))')), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education')) OR ((arrayExists(`body_v2.education`-> arrayExists(x -> toString(x) = ?, arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)'))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "passed", "passed", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings:    []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,jsondatatype=Array(Dynamic)]."},
			},
		},
		{
			name:   "Dynamic array contains String",
			filter: "body.education[].parameters Contains 'passed'",
			expected: TestExpected{
				WhereClause: "(((arrayExists(`body_v2.education`-> (arrayExists(x -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(x -> toString(x) = ?, dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education')) OR ((arrayExists(`body_v2.education`-> (arrayExists(x -> LOWER(toString(x)) LIKE LOWER(?), arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)'))) OR arrayExists(x -> toString(x) = ?, arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)')))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%passed%", "passed", "%passed%", "passed", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings:    []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,jsondatatype=Array(Dynamic)]."},
			},
		},
		{
			name:   "Dynamic array IN Operator",
			filter: "body.education[].parameters IN [1.65, 1.99]",
			expected: TestExpected{
				WhereClause: "(((arrayExists(`body_v2.education`-> arrayExists(x -> toFloat64(x) IN (?, ?), dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))')), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education')) OR ((arrayExists(`body_v2.education`-> arrayExists(x -> toString(x) IN (?, ?), arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)'))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), 1.65, 1.99, "1.65", "1.99", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings:    []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,jsondatatype=Array(Dynamic)]."},
			},
		},
		{
			name:   "Terminal array NotContains float",
			filter: "body.education[].parameters NOT CONTAINS 1.65",
			expected: TestExpected{
				WhereClause: "((NOT arrayExists(`body_v2.education`-> (arrayExists(x -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))')) OR arrayExists(x -> toFloat64(x) = ?, dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))'))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND (NOT arrayExists(`body_v2.education`-> (arrayExists(x -> LOWER(toString(x)) LIKE LOWER(?), arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)'))) OR arrayExists(x -> accurateCastOrNull(x, 'Float64') = ?, arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)')))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%1.65%", float64(1.65), "%1.65%", float64(1.65), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings:    []string{"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,jsondatatype=Array(Dynamic)]."},
			},
		},
		{
			name:   "Simple has filter",
			filter: "has(body.education[].parameters, 1.65)",
			expected: TestExpected{
				WhereClause: "(has(arrayFlatten(arrayConcat(arrayMap(`body_v2.education`->dynamicElement(`body_v2.education`.`parameters`, 'Array(Nullable(Float64))'), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))), ?) OR has(arrayFlatten(arrayConcat(arrayMap(`body_v2.education`->dynamicElement(`body_v2.education`.`parameters`, 'Array(Dynamic)'), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))), ?))",
				Args:        []any{uint64(1747945619), uint64(1747983448), 1.65, 1.65, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings: []string{
					"Key `education[].parameters` is ambiguous, found 2 different combinations of field context / data type: [name=education[].parameters,context=body,datatype=[]float64,jsondatatype=Array(Nullable(Float64)) name=education[].parameters,context=body,datatype=[]dynamic,jsondatatype=Array(Dynamic)].",
				},
			},
		},
		{
			name:   "Flat path hasAll filter",
			filter: "hasAll(body.user.permissions, ['read', 'write'])",
			expected: TestExpected{
				WhereClause: "hasAll(dynamicElement(body_v2.`user.permissions`, 'Array(Nullable(String))'), ?)",
				Args:        []any{uint64(1747945619), uint64(1747983448), []any{"read", "write"}, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},

		// ── non-array intermediate hop (x[].y.z) ────────────────────────────────
		{
			name:   "Non-array intermediate NotEqual",
			filter: "body.http-events[].request-info.host != 'example.com'",
			expected: TestExpected{
				WhereClause: "(NOT arrayExists(`body_v2.http-events`-> dynamicElement(`body_v2.http-events`.`request-info.host`, 'String') = ?, dynamicElement(body_v2.`http-events`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "example.com", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},

		// ── double-hop (x[].y[].z) ──────────────────────────────────────────────
		{
			name:   "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) exists",
			filter: "body.education[].awards[].name Exists",
			expected: TestExpected{
				WhereClause: "(arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') IS NOT NULL, dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Key inside Array(JSON) -> Array(Dynamic) + Array(JSON) = 'Iron Award'",
			filter: "body.education[].awards[].name = 'Iron Award'",
			expected: TestExpected{
				WhereClause: "((arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') = ?, dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "Iron Award", "Iron Award", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Integer BETWEEN Operator",
			filter: "education[].awards[].semester BETWEEN 2 AND 4",
			expected: TestExpected{
				WhereClause: "((arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> toFloat64(dynamicElement(`body_v2.education[].awards`.`semester`, 'Int64')) BETWEEN ? AND ?, dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> toFloat64(dynamicElement(`body_v2.education[].awards`.`semester`, 'Int64')) BETWEEN ? AND ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(2), float64(4), float64(2), float64(4), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Integer IN Operator",
			filter: "education[].awards[].semester IN [2, 4]",
			expected: TestExpected{
				WhereClause: "((arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> toFloat64(dynamicElement(`body_v2.education[].awards`.`semester`, 'Int64')) IN (?, ?), dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> toFloat64(dynamicElement(`body_v2.education[].awards`.`semester`, 'Int64')) IN (?, ?), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(2), float64(4), float64(2), float64(4), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Nested array NotEqual",
			filter: "body.education[].awards[].type != 'sports'",
			expected: TestExpected{
				WhereClause: "(NOT arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`type`, 'String') = ?, dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`type`, 'String') = ?, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "sports", "sports", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Nested array NotExists",
			filter: "body.education[].awards[].name NOT EXISTS",
			expected: TestExpected{
				WhereClause: "(NOT arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') IS NOT NULL, dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> dynamicElement(`body_v2.education[].awards`.`name`, 'String') IS NOT NULL, arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},

		// ── deep multi-hop (x[].y[].z[].w...) ──────────────────────────────────
		{
			name:   "Super nested array contains Int64 value",
			filter: "body.interests[].entities[].reviews[].entries[].metadata[].positions[].ratings Contains 4",
			expected: TestExpected{
				WhereClause: "(((arrayExists(`body_v2.interests`-> arrayExists(`body_v2.interests[].entities`-> arrayExists(`body_v2.interests[].entities[].reviews`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries[].metadata`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`-> (arrayExists(x -> LOWER(toString(x)) LIKE LOWER(?), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(Int64))')) OR arrayExists(x -> toFloat64(x) = ?, dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(Int64))'))), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.`positions`, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.`metadata`, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.`entries`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.`reviews`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.`entities`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.`interests`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'interests')) OR ((arrayExists(`body_v2.interests`-> arrayExists(`body_v2.interests[].entities`-> arrayExists(`body_v2.interests[].entities[].reviews`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries[].metadata`-> arrayExists(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`-> (arrayExists(x -> LOWER(x) LIKE LOWER(?), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(String))')) OR arrayExists(x -> toFloat64OrNull(x) = ?, dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata[].positions`.`ratings`, 'Array(Nullable(String))'))), dynamicElement(`body_v2.interests[].entities[].reviews[].entries[].metadata`.`positions`, 'Array(JSON(max_dynamic_types=0, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews[].entries`.`metadata`, 'Array(JSON(max_dynamic_types=1, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities[].reviews`.`entries`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests[].entities`.`reviews`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), dynamicElement(`body_v2.interests`.`entities`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), dynamicElement(body_v2.`interests`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'interests')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%4%", float64(4), "%4%", float64(4), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
				Warnings:    []string{"Key `interests[].entities[].reviews[].entries[].metadata[].positions[].ratings` is ambiguous, found 2 different combinations of field context / data type: [name=interests[].entities[].reviews[].entries[].metadata[].positions[].ratings,context=body,datatype=[]int64,jsondatatype=Array(Nullable(Int64)) name=interests[].entities[].reviews[].entries[].metadata[].positions[].ratings,context=body,datatype=[]string,jsondatatype=Array(Nullable(String))]."},
			},
		},
		{
			name:   "Multi nested Array(Dynamic) + Array(JSON) both can contain a value",
			filter: "body.education[].awards[].participated[].team[].branch Contains 'Civil'",
			expected: TestExpected{
				WhereClause: "((arrayExists(`body_v2.education`-> (arrayExists(`body_v2.education[].awards`-> (arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=2, max_dynamic_paths=0))')), dynamicElement(`body_v2.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education[].awards`.`participated`, 'Array(Dynamic)'))))), dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')) OR arrayExists(`body_v2.education[].awards`-> (arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=64))')), dynamicElement(`body_v2.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')) OR arrayExists(`body_v2.education[].awards[].participated`-> arrayExists(`body_v2.education[].awards[].participated[].team`-> LOWER(dynamicElement(`body_v2.education[].awards[].participated[].team`.`branch`, 'String')) LIKE LOWER(?), dynamicElement(`body_v2.education[].awards[].participated`.`team`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education[].awards`.`participated`, 'Array(Dynamic)'))))), arrayMap(x->dynamicElement(x, 'JSON'), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%Civil%", "%Civil%", "%Civil%", "%Civil%", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			// IN on a single-type Int64 array terminal: any element of scores IN {90, 95}
			name:   "Terminal Int64 array IN operator",
			filter: "body.education[].scores IN [90, 95]",
			expected: TestExpected{
				WhereClause: "((arrayExists(`body_v2.education`-> arrayExists(x -> toFloat64(x) IN (?, ?), dynamicElement(`body_v2.education`.`scores`, 'Array(Nullable(Int64))')), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(90), float64(95), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			// NOT IN on a single-type Int64 array terminal: no element of scores IN {90, 95}.
			// Negative operator → NOT wraps outer arrayExists; no path-index guard added.
			name:   "Terminal Int64 array NOT IN operator",
			filter: "body.education[].scores NOT IN [90, 95]",
			expected: TestExpected{
				WhereClause: "(NOT arrayExists(`body_v2.education`-> arrayExists(x -> toFloat64(x) IN (?, ?), dynamicElement(`body_v2.education`.`scores`, 'Array(Nullable(Int64))')), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(90), float64(95), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			// BETWEEN on a single-type Int64 array terminal: any element of scores BETWEEN 80 AND 95.
			// BETWEEN is an IsArrayOperator → value arrives as []any{80,95} → c.valueType.IsArray=true.
			name:   "Terminal Int64 array BETWEEN operator",
			filter: "body.education[].scores BETWEEN 80 AND 95",
			expected: TestExpected{
				WhereClause: "((arrayExists(`body_v2.education`-> arrayExists(x -> toFloat64(x) BETWEEN ? AND ?, dynamicElement(`body_v2.education`.`scores`, 'Array(Nullable(Int64))')), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))'))) AND has(JSONAllPaths(body_v2), 'education'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(80), float64(95), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			// NOT BETWEEN on a single-type Int64 array terminal: no element BETWEEN 80 AND 95.
			// Negative → NOT wraps outer arrayExists; no path-index guard.
			name:   "Terminal Int64 array NOT BETWEEN operator",
			filter: "body.education[].scores NOT BETWEEN 80 AND 95",
			expected: TestExpected{
				WhereClause: "(NOT arrayExists(`body_v2.education`-> arrayExists(x -> toFloat64(x) BETWEEN ? AND ?, dynamicElement(`body_v2.education`.`scores`, 'Array(Nullable(Int64))')), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(80), float64(95), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "Nested path hasAny filter",
			filter: "hasAny(education[].awards[].participated[].members, ['Piyush', 'Tushar'])",
			expected: TestExpected{
				WhereClause: "hasAny(arrayFlatten(arrayConcat(arrayMap(`body_v2.education`->arrayConcat(arrayMap(`body_v2.education[].awards`->arrayConcat(arrayMap(`body_v2.education[].awards[].participated`->dynamicElement(`body_v2.education[].awards[].participated`.`members`, 'Array(Nullable(String))'), dynamicElement(`body_v2.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=4, max_dynamic_paths=0))')), arrayMap(`body_v2.education[].awards[].participated`->dynamicElement(`body_v2.education[].awards[].participated`.`members`, 'Array(Nullable(String))'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education[].awards`.`participated`, 'Array(Dynamic)'))))), dynamicElement(`body_v2.education`.`awards`, 'Array(JSON(max_dynamic_types=8, max_dynamic_paths=0))')), arrayMap(`body_v2.education[].awards`->arrayConcat(arrayMap(`body_v2.education[].awards[].participated`->dynamicElement(`body_v2.education[].awards[].participated`.`members`, 'Array(Nullable(String))'), dynamicElement(`body_v2.education[].awards`.`participated`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=256))')), arrayMap(`body_v2.education[].awards[].participated`->dynamicElement(`body_v2.education[].awards[].participated`.`members`, 'Array(Nullable(String))'), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education[].awards`.`participated`, 'Array(Dynamic)'))))), arrayMap(x->assumeNotNull(dynamicElement(x, 'JSON')), arrayFilter(x->(dynamicType(x) = 'JSON'), dynamicElement(`body_v2.education`.`awards`, 'Array(Dynamic)'))))), dynamicElement(body_v2.`education`, 'Array(JSON(max_dynamic_types=16, max_dynamic_paths=0))')))), ?)",
				Args:        []any{uint64(1747945619), uint64(1747983448), []any{"Piyush", "Tushar"}, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "dynamic array element comparison",
			filter: "ids Contains 1",
			expected: TestExpected{
				WhereClause: "(((arrayExists(x -> LOWER(toString(x)) LIKE LOWER(?), arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(body_v2.`ids`, 'Array(Dynamic)'))) OR arrayExists(x -> accurateCastOrNull(x, 'Float64') = ?, arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(body_v2.`ids`, 'Array(Dynamic)'))))) AND has(JSONAllPaths(body_v2), 'ids'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "%1%", float64(1), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "dynamic array element comparison",
			filter: "ids != '1'",
			expected: TestExpected{
				WhereClause: "(NOT arrayExists(x -> accurateCastOrNull(x, 'Float64') = ?, arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(body_v2.`ids`, 'Array(Dynamic)'))))",
				Args:        []any{uint64(1747945619), uint64(1747983448), int64(1), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name:   "dynamic array element comparison boolean",
			filter: "ids = true",
			expected: TestExpected{
				WhereClause: "((arrayExists(x -> accurateCastOrNull(x, 'Bool') = ?, arrayFilter(x->(dynamicType(x) IN ('String', 'Int64', 'Float64', 'Bool')), dynamicElement(body_v2.`ids`, 'Array(Dynamic)')))) AND has(JSONAllPaths(body_v2), 'ids'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, qbtypes.RequestTypeRaw,
				qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
					Signal: telemetrytypes.SignalLogs,
					Filter: &qbtypes.Filter{Expression: c.filter},
					Limit:  10,
				}, nil)
			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
				return
			}
			require.NoError(t, err)
			require.Equal(t, c.expected.GetQuery(), q.Query)
			require.Equal(t, c.expected.Args, q.Args)
			require.Equal(t, c.expected.Warnings, q.Warnings)
		})
	}
}

func TestJSONStmtBuilder_IndexedPaths(t *testing.T) {
	enable, disable := jsonQueryTestUtil(t)
	enable()
	defer disable()

	statementBuilder := buildJSONTestStatementBuilder(t, true)
	cases := []struct {
		name        string
		query       qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]
		expected    TestExpected
		expectedErr error
	}{
		// ── indexed equal: emits assumeNotNull(dynamicElement) = ? ───────────
		{
			name: "Indexed String Equal",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.name = 'alice'"},
				Limit:  10,
			},
			expected: TestExpected{
				WhereClause: "((assumeNotNull(dynamicElement(body_v2.`user.name`, 'String')) = ?) AND has(JSONAllPaths(body_v2), 'user.name'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "alice", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name: "Indexed Int64 Equal",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.address.zip = 110001"},
				Limit:  10,
			},
			expected: TestExpected{
				WhereClause: "((toFloat64(assumeNotNull(dynamicElement(body_v2.`user.address.zip`, 'Int64'))) = ?) AND has(JSONAllPaths(body_v2), 'user.address.zip'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(110001), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		// ── indexed exists: emits assumeNotNull != nil AND dynamicElement IS NOT NULL ─
		{
			name: "Indexed String Exists",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.name Exists"},
				Limit:  10,
			},
			expected: TestExpected{
				WhereClause: "((assumeNotNull(dynamicElement(body_v2.`user.name`, 'String')) <> ? AND dynamicElement(body_v2.`user.name`, 'String') IS NOT NULL))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		// ── indexed not-equal: assumeNotNull wrapping + no path index ─────────
		{
			name: "Indexed String NotEqual",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.name != 'alice'"},
				Limit:  10,
			},
			expected: TestExpected{
				WhereClause: "(assumeNotNull(dynamicElement(body_v2.`user.name`, 'String')) <> ?)",
				Args:        []any{uint64(1747945619), uint64(1747983448), "alice", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		// ── indexed not-exists: assumeNotNull = "" AND assumeNotNull IS NOT NULL ─
		// FilterOperatorNotExists → Equal + emptyValue("") in the indexed branch,
		// then a second condition flipped to Exists (IS NOT NULL) on the same
		// assumeNotNull expr, producing AND(= "", IS NOT NULL).
		{
			name: "Indexed String NotExists",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.name NOT EXISTS"},
				Limit:  10,
			},
			expected: TestExpected{
				WhereClause: "((assumeNotNull(dynamicElement(body_v2.`user.name`, 'String')) = ? AND dynamicElement(body_v2.`user.name`, 'String') IS NULL))",
				Args:        []any{uint64(1747945619), uint64(1747983448), "", "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},

		// ── special-character indexed paths ───────────────────────────────────
		{
			name: "Indexed hyphen key Equal",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.http-status = 200"},
				Limit:  10,
			},
			expected: TestExpected{
				WhereClause: "(((toFloat64(assumeNotNull(dynamicElement(body_v2.`http-status`, 'Int64'))) = ?) AND has(JSONAllPaths(body_v2), 'http-status')) OR ((toFloat64OrNull(assumeNotNull(dynamicElement(body_v2.`http-status`, 'String'))) = ?) AND has(JSONAllPaths(body_v2), 'http-status')))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(200), float64(200), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		{
			name: "Indexed nested hyphen key Equal",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.response.time-taken > 1.5"},
				Limit:  10,
			},
			expected: TestExpected{
				WhereClause: "((toFloat64(assumeNotNull(dynamicElement(body_v2.`response.time-taken`, 'Float64'))) > ?) AND has(JSONAllPaths(body_v2), 'response.time-taken'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), float64(1.5), "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
		// ── Bool is NOT IndexSupported — index branch must be skipped ─────────
		// user.active is Bool; even with indexed builder it must not use the index.
		{
			name: "Bool skips index — Equal",
			query: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal: telemetrytypes.SignalLogs,
				Filter: &qbtypes.Filter{Expression: "body.user.active = true"},
				Limit:  10,
			},
			expected: TestExpected{
				WhereClause: "((dynamicElement(body_v2.`user.active`, 'Bool') = ?) AND has(JSONAllPaths(body_v2), 'user.active'))",
				Args:        []any{uint64(1747945619), uint64(1747983448), true, "1747947419000000000", uint64(1747945619), "1747983448000000000", uint64(1747983448), 10},
			},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			q, err := statementBuilder.Build(context.Background(), 1747947419000, 1747983448000, qbtypes.RequestTypeRaw, c.query, nil)
			if c.expectedErr != nil {
				require.Error(t, err)
				require.Contains(t, err.Error(), c.expectedErr.Error())
				return
			}
			require.NoError(t, err)
			require.Equal(t, c.expected.GetQuery(), q.Query)
			require.Equal(t, c.expected.Args, q.Args)
		})
	}
}
func buildTestTelemetryMetadataStore(t *testing.T, addIndexes bool) *telemetrytypestest.MockMetadataStore {
	mockMetadataStore := telemetrytypestest.NewMockMetadataStore()
	mockMetadataStore.SetStaticFields(IntrinsicFields)
	types, _ := telemetrytypes.TestJSONTypeSet()
	for path, jsonTypes := range types {
		for _, jsonType := range jsonTypes {
			key := &telemetrytypes.TelemetryFieldKey{
				Name:          path,
				Signal:        telemetrytypes.SignalLogs,
				FieldContext:  telemetrytypes.FieldContextBody,
				FieldDataType: telemetrytypes.MappingJSONDataTypeToFieldDataType[jsonType],
				JSONDataType:  &jsonType,
			}
			if addIndexes {
				idx := slices.IndexFunc(telemetrytypes.TestIndexedPaths, func(entry telemetrytypes.TestIndexedPathEntry) bool {
					return entry.Path == path && entry.Type == jsonType
				})
				if idx >= 0 {
					key.Indexes = append(key.Indexes, telemetrytypes.JSONDataTypeIndex{
						Type:             jsonType,
						ColumnExpression: schemamigrator.JSONSubColumnIndexExpr(LogsV2BodyV2Column, path, jsonType.StringValue()),
					})
				}
			}

			err := key.SetJSONAccessPlan(telemetrytypes.JSONColumnMetadata{
				BaseColumn:     LogsV2BodyV2Column,
				PromotedColumn: LogsV2BodyPromotedColumn,
			}, types)
			require.NoError(t, err)

			mockMetadataStore.SetKey(key)
		}
	}

	return mockMetadataStore
}

func buildJSONTestStatementBuilder(t *testing.T, addIndexes bool) *logQueryStatementBuilder {
	mockMetadataStore := buildTestTelemetryMetadataStore(t, addIndexes)
	fm := NewFieldMapper()
	cb := NewConditionBuilder(fm)

	aggExprRewriter := querybuilder.NewAggExprRewriter(instrumentationtest.New().ToProviderSettings(), nil, fm, cb, nil)

	statementBuilder := NewLogQueryStatementBuilder(
		instrumentationtest.New().ToProviderSettings(),
		mockMetadataStore,
		fm,
		cb,
		aggExprRewriter,
		DefaultFullTextColumn,
		GetBodyJSONKey,
	)

	return statementBuilder
}

func jsonQueryTestUtil(_ *testing.T) (func(), func()) {
	enable := func() {
		querybuilder.BodyJSONQueryEnabled = true
	}
	disable := func() {
		querybuilder.BodyJSONQueryEnabled = false
	}

	return enable, disable
}
