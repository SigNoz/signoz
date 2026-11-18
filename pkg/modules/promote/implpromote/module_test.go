package implpromote

import (
	"context"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/huandu/go-sqlbuilder"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/tracestelemetryschema"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
)

func TestPromotePaths(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name         string
		paths        []*promotetypes.PromotePath
		promoteTwice bool
		wantErr      bool
		wantPromoted map[telemetrytypes.Signal]map[string]bool
	}{
		{
			name: "PromotesNewAttributes_Idempotent",
			paths: []*promotetypes.PromotePath{
				{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true},
				{Signal: "traces", Context: "attribute", Path: "span.operation", Promote: true},
			},
			promoteTwice: true,
			wantPromoted: map[telemetrytypes.Signal]map[string]bool{telemetrytypes.SignalTraces: {"http.method": true, "span.operation": true}},
		},
		{
			name: "MixedContexts_RecordedPerTarget",
			paths: []*promotetypes.PromotePath{
				{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true},
				{Signal: "logs", Context: "body", Path: "user.name", Promote: true},
			},
			wantPromoted: map[telemetrytypes.Signal]map[string]bool{
				telemetrytypes.SignalTraces: {"http.method": true},
				telemetrytypes.SignalLogs:   {"user.name": true},
			},
		},
		{
			name:         "NonPromoteEntries_NotRecorded",
			paths:        []*promotetypes.PromotePath{{Signal: "traces", Context: "attribute", Path: "http.method"}},
			wantPromoted: map[telemetrytypes.Signal]map[string]bool{},
		},
		{
			name:    "InvalidSignal_Rejected",
			paths:   []*promotetypes.PromotePath{{Signal: "events", Context: "attribute", Path: "http.method", Promote: true}},
			wantErr: true,
		},
		{
			name:    "UnsupportedTarget_Rejected",
			paths:   []*promotetypes.PromotePath{{Signal: "metrics", Context: "attribute", Path: "http.method", Promote: true}},
			wantErr: true,
		},
		{
			name:         "PromotesBareBodyPath_AsIs",
			paths:        []*promotetypes.PromotePath{{Signal: "logs", Context: "body", Path: "user.name", Promote: true}},
			wantPromoted: map[telemetrytypes.Signal]map[string]bool{telemetrytypes.SignalLogs: {"user.name": true}},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			store := telemetrytypestest.NewMockMetadataStore()
			m := NewModule(store, nil, factorytest.NewSettings())

			err := m.PromotePaths(ctx, testCase.paths...)
			if testCase.wantErr {
				assert.Error(t, err)
				assert.Empty(t, store.PromotedPathsMap)
				return
			}
			require.NoError(t, err)

			assert.Equal(t, testCase.wantPromoted, store.PromotedPathsMap)

			if testCase.promoteTwice {
				require.NoError(t, m.PromotePaths(ctx, testCase.paths...))
				assert.Equal(t, testCase.wantPromoted, store.PromotedPathsMap)
			}
		})
	}
}

func TestPromotePathsCreatesIndexes(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name          string
		promoted      map[string]bool
		path          *promotetypes.PromotePath
		wantDDLColumn string
	}{
		{
			name: "LogsNewPromotion_IndexesPromotedColumn",
			path: &promotetypes.PromotePath{
				Signal:  "logs",
				Context: "body",
				Path:    "user.name",
				Promote: true,
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1, JSONDataType: telemetrytypes.String},
				},
			},
			wantDDLColumn: "dynamicElement(body_promoted.user.name",
		},
		{
			name:     "LogsAlreadyPromoted_IndexesPromotedColumn",
			promoted: map[string]bool{"user.name": true},
			path: &promotetypes.PromotePath{
				Signal:  "logs",
				Context: "body",
				Path:    "user.name",
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1, JSONDataType: telemetrytypes.String},
				},
			},
			wantDDLColumn: "dynamicElement(body_promoted.user.name",
		},
		{
			name: "LogsUnpromotedPath_IndexesBaseColumn",
			path: &promotetypes.PromotePath{
				Signal:  "logs",
				Context: "body",
				Path:    "user.name",
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1, JSONDataType: telemetrytypes.String},
				},
			},
			wantDDLColumn: "dynamicElement(body_v2.user.name",
		},
		{
			name: "TracesNewPromotion_IndexesPromotedColumn",
			path: &promotetypes.PromotePath{
				Signal:  "traces",
				Context: "attribute",
				Path:    "http.method",
				Promote: true,
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1, JSONDataType: telemetrytypes.String},
				},
			},
			wantDDLColumn: "`attributes_promoted.http.method_string_ngrambf_v1` attributes_promoted.`http.method`::String",
		},
		{
			name: "TracesUnpromotedPath_IndexesBaseColumn",
			path: &promotetypes.PromotePath{
				Signal:  "traces",
				Context: "attribute",
				Path:    "http.method",
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1, JSONDataType: telemetrytypes.String},
				},
			},
			wantDDLColumn: "`attributes.http.method_string_ngrambf_v1` attributes.`http.method`::String",
		},
		{
			name: "BloomFilterIndex_FullTypeInDDL",
			path: &promotetypes.PromotePath{
				Signal:  "logs",
				Context: "body",
				Path:    "user.name",
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "bloom_filter(0.01)", Granularity: 1, JSONDataType: telemetrytypes.String},
				},
			},
			wantDDLColumn: "`body_v2.user.name_string_bloom_filter` lower(assumeNotNull(dynamicElement(body_v2.user.name, 'String'))) TYPE bloom_filter(0.01)",
		},
		{
			name: "SetIndex_FullTypeInDDL",
			path: &promotetypes.PromotePath{
				Signal:  "logs",
				Context: "body",
				Path:    "user.name",
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "set(100)", Granularity: 1, JSONDataType: telemetrytypes.String},
				},
			},
			wantDDLColumn: "`body_v2.user.name_string_set` lower(assumeNotNull(dynamicElement(body_v2.user.name, 'String'))) TYPE set(100)",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ts := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
			store := telemetrytypestest.NewMockMetadataStore()
			store.PromotedPathsMap[telemetrytypes.SignalLogs] = testCase.promoted
			m := NewModule(store, ts, factorytest.NewSettings())

			ts.Mock().ExpectExec("ADD INDEX (.+)" + regexp.QuoteMeta(testCase.wantDDLColumn)).WillReturnError(nil)
			require.NoError(t, m.PromotePaths(ctx, testCase.path))
			assert.NoError(t, ts.Mock().ExpectationsWereMet())
		})
	}
}

func TestListPromotedPaths(t *testing.T) {
	ctx := context.Background()
	trueValue := true
	falseValue := false

	testCases := []struct {
		name      string
		filters   promotetypes.ListPromotedPathsFilters
		promoted  map[telemetrytypes.Signal]map[string]bool
		indexes   []telemetrytypes.TelemetryFieldKeySkipIndex
		wantPaths []promotetypes.PromotePath
	}{
		{
			name: "PromotedPaths_ListedPerTarget",
			promoted: map[telemetrytypes.Signal]map[string]bool{
				telemetrytypes.SignalLogs:   {"user.name": true},
				telemetrytypes.SignalTraces: {"http.method": true},
			},
			wantPaths: []promotetypes.PromotePath{
				{Signal: "logs", Context: "body", Path: "user.name", Promote: true},
				{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true},
			},
		},
		{
			name:    "SignalFilter_SkipsOtherContexts",
			filters: promotetypes.ListPromotedPathsFilters{Signal: "traces"},
			promoted: map[telemetrytypes.Signal]map[string]bool{
				telemetrytypes.SignalLogs:   {"user.name": true},
				telemetrytypes.SignalTraces: {"http.method": true},
			},
			wantPaths: []promotetypes.PromotePath{{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true}},
		},
		{
			name:    "ContextFilter_SkipsOtherContexts",
			filters: promotetypes.ListPromotedPathsFilters{Context: "body"},
			promoted: map[telemetrytypes.Signal]map[string]bool{
				telemetrytypes.SignalLogs:   {"user.name": true},
				telemetrytypes.SignalTraces: {"http.method": true},
			},
			wantPaths: []promotetypes.PromotePath{{Signal: "logs", Context: "body", Path: "user.name", Promote: true}},
		},
		{
			name:      "ContextAliasFilter_MatchesTarget",
			filters:   promotetypes.ListPromotedPathsFilters{Signal: "traces", Context: "tag"},
			promoted:  map[telemetrytypes.Signal]map[string]bool{telemetrytypes.SignalTraces: {"http.method": true}},
			wantPaths: []promotetypes.PromotePath{{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true}},
		},
		{
			name:     "LogsIndexes_MergedWithLogsPaths",
			promoted: map[telemetrytypes.Signal]map[string]bool{telemetrytypes.SignalLogs: {"user.name": true}},
			indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{
					Name:          "user.name",
					FieldContext:  telemetrytypes.FieldContextBody,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					BaseColumn:    "body_promoted.",
					IndexType:     "ngrambf_v1(4, 1024, 2, 0)",
					Granularity:   1,
				},
				{
					Name:          "request.duration",
					FieldContext:  telemetrytypes.FieldContextBody,
					FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					BaseColumn:    "body_v2.",
					IndexType:     "minmax",
					Granularity:   1,
				},
			},
			wantPaths: []promotetypes.PromotePath{
				{
					Signal:  "logs",
					Context: "body",
					Path:    "user.name",
					Promote: true,
					Indexes: []promotetypes.WrappedIndex{
						{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
					},
				},
				{
					Signal:  "logs",
					Context: "body",
					Path:    "request.duration",
					Indexes: []promotetypes.WrappedIndex{
						{FieldDataType: telemetrytypes.FieldDataTypeFloat64, Type: "minmax", Granularity: 1},
					},
				},
			},
		},
		{
			name:     "PromotedFalseFilter_IndexOnlyPaths",
			filters:  promotetypes.ListPromotedPathsFilters{Promoted: &falseValue},
			promoted: map[telemetrytypes.Signal]map[string]bool{telemetrytypes.SignalLogs: {"user.name": true}},
			indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{
					Name:          "request.duration",
					FieldContext:  telemetrytypes.FieldContextBody,
					FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					BaseColumn:    "body_v2.",
					IndexType:     "minmax",
					Granularity:   1,
				},
			},
			wantPaths: []promotetypes.PromotePath{
				{
					Signal:  "logs",
					Context: "body",
					Path:    "request.duration",
					Indexes: []promotetypes.WrappedIndex{
						{FieldDataType: telemetrytypes.FieldDataTypeFloat64, Type: "minmax", Granularity: 1},
					},
				},
			},
		},
		{
			name:     "IndexesTrueFilter_PathsWithIndexes",
			filters:  promotetypes.ListPromotedPathsFilters{Indexes: &trueValue},
			promoted: map[telemetrytypes.Signal]map[string]bool{telemetrytypes.SignalLogs: {"user.name": true}},
			indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{
					Name:          "user.name",
					FieldContext:  telemetrytypes.FieldContextBody,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					BaseColumn:    "body_promoted.",
					IndexType:     "ngrambf_v1(4, 1024, 2, 0)",
					Granularity:   1,
				},
			},
			wantPaths: []promotetypes.PromotePath{
				{
					Signal:  "logs",
					Context: "body",
					Path:    "user.name",
					Promote: true,
					Indexes: []promotetypes.WrappedIndex{
						{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
					},
				},
			},
		},
		{
			name:     "TracesIndexes_MergedWithTracesPaths",
			promoted: map[telemetrytypes.Signal]map[string]bool{telemetrytypes.SignalTraces: {"http.method": true}},
			indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{
				{
					Name:          "http.method",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeString,
					BaseColumn:    "attributes_promoted.",
					IndexType:     "ngrambf_v1(4, 1024, 2, 0)",
					Granularity:   1,
				},
				{
					Name:          "http.status_code",
					FieldContext:  telemetrytypes.FieldContextAttribute,
					FieldDataType: telemetrytypes.FieldDataTypeFloat64,
					BaseColumn:    "attributes.",
					IndexType:     "minmax",
					Granularity:   1,
				},
			},
			wantPaths: []promotetypes.PromotePath{
				{
					Signal:  "traces",
					Context: "attribute",
					Path:    "http.method",
					Promote: true,
					Indexes: []promotetypes.WrappedIndex{
						{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
					},
				},
				{
					Signal:  "traces",
					Context: "attribute",
					Path:    "http.status_code",
					Indexes: []promotetypes.WrappedIndex{
						{FieldDataType: telemetrytypes.FieldDataTypeFloat64, Type: "minmax", Granularity: 1},
					},
				},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			store := telemetrytypestest.NewMockMetadataStore()
			store.PromotedPathsMap = testCase.promoted
			store.LogsJSONIndexes = testCase.indexes
			m := NewModule(store, nil, factorytest.NewSettings())

			paths, err := m.ListPromotedPaths(ctx, testCase.filters)
			require.NoError(t, err)
			require.Len(t, paths, len(testCase.wantPaths))

			byContextPath := map[string]promotetypes.PromotePath{}
			for _, path := range paths {
				byContextPath[path.Signal+"/"+path.Context+"/"+path.Path] = path
			}
			for _, want := range testCase.wantPaths {
				key := want.Signal + "/" + want.Context + "/" + want.Path
				require.Contains(t, byContextPath, key)
				assert.Equal(t, want, byContextPath[key])
			}
		})
	}
}

func TestIndexMaterializedPaths(t *testing.T) {
	ctx := context.Background()
	bloomIndex := []telemetrytypes.TelemetryFieldKeySkipIndex{{IndexType: "bloom_filter", Granularity: 4}}
	materializedKeys := []*telemetrytypes.TelemetryFieldKey{
		{Name: "user.id", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString, Indexes: bloomIndex},
		{Name: "tenant.id", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
		{Name: "retry.count", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber, Indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{{IndexType: "minmax", Granularity: 1}}},
		{Name: "k8s.pod.name", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString, Indexes: bloomIndex},
	}
	userIDDDL := "`attributes.user.id_string_bloom_filter` attributes.`user.id`::String TYPE bloom_filter GRANULARITY 4"
	retryCountDDL := "`attributes.retry.count_float64_minmax` toFloat64OrNull(attributes.`retry.count`::String) TYPE minmax GRANULARITY 1"

	testCases := []struct {
		name        string
		req         promotetypes.PostableIndexMaterializedPaths
		keys        []*telemetrytypes.TelemetryFieldKey
		existing    []telemetrytypes.TelemetryFieldKeySkipIndex
		wantIndexed []string
		wantSkipped []string
		wantDDL     []string
		wantErr     bool
	}{
		{
			name:        "DryRun_NoDDL",
			req:         promotetypes.PostableIndexMaterializedPaths{Signal: "traces", DryRun: true},
			keys:        materializedKeys,
			wantIndexed: []string{"user.id", "retry.count"},
			wantSkipped: []string{},
		},
		{
			name:        "Run_IndexesBaseColumn",
			req:         promotetypes.PostableIndexMaterializedPaths{Signal: "traces"},
			keys:        materializedKeys,
			wantIndexed: []string{"user.id", "retry.count"},
			wantSkipped: []string{},
			wantDDL:     []string{userIDDDL, retryCountDDL},
		},
		{
			name:        "AnyIndexBuilt_Skipped",
			req:         promotetypes.PostableIndexMaterializedPaths{Signal: "traces"},
			keys:        materializedKeys,
			existing:    []telemetrytypes.TelemetryFieldKeySkipIndex{{Name: "user.id", FieldContext: telemetrytypes.FieldContextAttribute, IndexType: "ngrambf_v1(4, 1024, 2, 0)"}},
			wantIndexed: []string{"retry.count"},
			wantSkipped: []string{"user.id"},
			wantDDL:     []string{retryCountDDL},
		},
		{
			name: "UnsupportedIndexType_LoggedAndLeftOut",
			req:  promotetypes.PostableIndexMaterializedPaths{Signal: "traces"},
			keys: append([]*telemetrytypes.TelemetryFieldKey{
				{Name: "user.email", Signal: telemetrytypes.SignalTraces, FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString, Indexes: []telemetrytypes.TelemetryFieldKeySkipIndex{{IndexType: "text(tokenizer = 'splitByNonAlpha')", Granularity: 1}}},
			}, materializedKeys...),
			wantIndexed: []string{"user.id", "retry.count"},
			wantSkipped: []string{},
			wantDDL:     []string{userIDDDL, retryCountDDL},
		},
		{
			name:    "LogsSignal_NoAttributeTarget_Rejected",
			req:     promotetypes.PostableIndexMaterializedPaths{Signal: "logs"},
			wantErr: true,
		},
		{
			name:    "MissingSignal_Rejected",
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ts := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
			store := telemetrytypestest.NewMockMetadataStore()
			store.MaterializedKeys = testCase.keys
			store.LogsJSONIndexes = testCase.existing
			m := NewModule(store, ts, factorytest.NewSettings())
			for _, ddl := range testCase.wantDDL {
				ts.Mock().ExpectExec("ADD INDEX (.+)" + regexp.QuoteMeta(ddl)).WillReturnError(nil)
			}

			result, err := m.IndexMaterializedPaths(ctx, testCase.req)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)

			indexed := []string{}
			for _, path := range result.Indexed {
				assert.False(t, path.Promote)
				indexed = append(indexed, path.Path)
			}
			skipped := []string{}
			for _, path := range result.Skipped {
				skipped = append(skipped, path.Path)
			}
			assert.Equal(t, testCase.wantIndexed, indexed)
			assert.Equal(t, testCase.wantSkipped, skipped)
			assert.NoError(t, ts.Mock().ExpectationsWereMet())
		})
	}
}

// An index is used only when a filter's left-hand side is its exact expression.
func TestTracesNumberIndexExpr_MatchesQuerierFilters(t *testing.T) {
	release := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	queryInfo := qbtypes.QueryInfo{StartNs: uint64(release.AddDate(0, 6, 0).UnixNano()), EndNs: uint64(release.AddDate(0, 7, 0).UnixNano()), TraceAttrsJSONOn: true}
	key := telemetrytypes.TelemetryFieldKey{Name: "http.status_code", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber, Evolutions: tracestelemetryschema.MockAttributeEvolutionData(release)}
	indexExpr := promotetypes.NewTracesAttributesTarget().IndexExpression("attributes", "http.status_code", telemetrytypes.Float64.StringValue())

	testCases := []struct {
		name     string
		operator qbtypes.FilterOperator
		value    any
		want     string
	}{
		{name: "Equal", operator: qbtypes.FilterOperatorEqual, value: float64(200), want: indexExpr + " = ?"},
		{name: "In", operator: qbtypes.FilterOperatorIn, value: []any{float64(200), float64(404)}, want: indexExpr + " = ? OR " + indexExpr + " = ?"},
		{name: "GreaterThan", operator: qbtypes.FilterOperatorGreaterThan, value: float64(200), want: indexExpr + " > ?"},
		{name: "Between", operator: qbtypes.FilterOperatorBetween, value: []any{float64(200), float64(299)}, want: indexExpr + " BETWEEN ? AND ?"},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			sb := sqlbuilder.NewSelectBuilder()
			conditions, _, err := querybuilder.Conditions(context.Background(), queryInfo, tracestelemetryschema.NewStorage(nil), &key, testCase.operator, testCase.value, map[string][]*telemetrytypes.TelemetryFieldKey{key.Name: {&key}}, false, sb)
			require.NoError(t, err)
			sb.Where(conditions...)
			sql, _ := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
			assert.Contains(t, sql, testCase.want)
		})
	}
}
