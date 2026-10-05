package implpromote

import (
	"context"
	"regexp"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/promotetypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes/telemetrytypestest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPromotePaths(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name         string
		paths        []*promotetypes.PromotePath
		promoteTwice bool
		wantErr      bool
		wantPromoted []string
	}{
		{
			name: "PromotesNewAttributes_Idempotent",
			paths: []*promotetypes.PromotePath{
				{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true},
				{Signal: "traces", Context: "attribute", Path: "span.operation", Promote: true},
			},
			promoteTwice: true,
			wantPromoted: []string{"http.method", "span.operation"},
		},
		{
			name: "MixedDomains_RecordedPerTarget",
			paths: []*promotetypes.PromotePath{
				{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true},
				{Signal: "logs", Context: "body", Path: "user.name", Promote: true},
			},
			wantPromoted: []string{"http.method", "user.name"},
		},
		{
			name:  "NonPromoteEntries_NotRecorded",
			paths: []*promotetypes.PromotePath{{Signal: "traces", Context: "attribute", Path: "http.method"}},
		},
		{
			name:    "InvalidSignal_Rejected",
			paths:   []*promotetypes.PromotePath{{Signal: "events", Context: "attribute", Path: "http.method", Promote: true}},
			wantErr: true,
		},
		{
			name:    "UnsupportedDomain_Rejected",
			paths:   []*promotetypes.PromotePath{{Signal: "metrics", Context: "attribute", Path: "http.method", Promote: true}},
			wantErr: true,
		},
		{
			name:         "PromotesBareBodyPath_AsIs",
			paths:        []*promotetypes.PromotePath{{Signal: "logs", Context: "body", Path: "user.name", Promote: true}},
			wantPromoted: []string{"user.name"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			store := telemetrytypestest.NewMockMetadataStore()
			m := NewModule(store, nil)

			err := m.PromotePaths(ctx, testCase.paths...)
			if testCase.wantErr {
				assert.Error(t, err)
				assert.Empty(t, store.PromotedPathsMap)
				return
			}
			require.NoError(t, err)

			require.Len(t, store.PromotedPathsMap, len(testCase.wantPromoted))
			for _, path := range testCase.wantPromoted {
				assert.True(t, store.PromotedPathsMap[path], path)
			}

			if testCase.promoteTwice {
				require.NoError(t, m.PromotePaths(ctx, testCase.paths...))
				assert.Len(t, store.PromotedPathsMap, len(testCase.wantPromoted))
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
			wantDDLColumn: "`attributes_promoted.http.method_String_ngrambf_v1` attributes_promoted.http.method::String",
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
			wantDDLColumn: "`attributes.http.method_String_ngrambf_v1` attributes.http.method::String",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			ts := telemetrystoretest.New(telemetrystore.Config{}, sqlmock.QueryMatcherRegexp)
			store := telemetrytypestest.NewMockMetadataStore()
			if testCase.promoted != nil {
				store.PromotedPathsMap = testCase.promoted
			}
			m := NewModule(store, ts)

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
		promoted  map[string]bool
		indexes   []telemetrytypes.TelemetryFieldKeySkipIndex
		wantPaths []promotetypes.PromotePath
	}{
		{
			name:     "PromotedPaths_EveryDomainAnnotated",
			promoted: map[string]bool{"http.method": true},
			wantPaths: []promotetypes.PromotePath{
				{Signal: "logs", Context: "body", Path: "http.method", Promote: true},
				{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true},
			},
		},
		{
			name:      "SignalFilter_SkipsOtherDomains",
			filters:   promotetypes.ListPromotedPathsFilters{Signal: "traces"},
			promoted:  map[string]bool{"http.method": true},
			wantPaths: []promotetypes.PromotePath{{Signal: "traces", Context: "attribute", Path: "http.method", Promote: true}},
		},
		{
			name:      "ContextFilter_SkipsOtherDomains",
			filters:   promotetypes.ListPromotedPathsFilters{Context: "body"},
			promoted:  map[string]bool{"http.method": true},
			wantPaths: []promotetypes.PromotePath{{Signal: "logs", Context: "body", Path: "http.method", Promote: true}},
		},
		{
			name:     "LogsIndexes_MergedWithLogsPaths",
			promoted: map[string]bool{"user.name": true},
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
				{
					Signal:  "traces",
					Context: "attribute",
					Path:    "user.name",
					Promote: true,
				},
			},
		},
		{
			name:     "PromotedFalseFilter_IndexOnlyPaths",
			filters:  promotetypes.ListPromotedPathsFilters{Promoted: &falseValue},
			promoted: map[string]bool{"user.name": true},
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
			promoted: map[string]bool{"user.name": true},
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
			promoted: map[string]bool{"http.method": true},
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
					Signal:  "logs",
					Context: "body",
					Path:    "http.method",
					Promote: true,
				},
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
			m := NewModule(store, nil)

			paths, err := m.ListPromotedPaths(ctx, testCase.filters)
			require.NoError(t, err)
			require.Len(t, paths, len(testCase.wantPaths))

			byDomainPath := map[string]promotetypes.PromotePath{}
			for _, path := range paths {
				byDomainPath[path.Signal+"/"+path.Context+"/"+path.Path] = path
			}
			for _, want := range testCase.wantPaths {
				key := want.Signal + "/" + want.Context + "/" + want.Path
				require.Contains(t, byDomainPath, key)
				assert.Equal(t, want, byDomainPath[key])
			}
		})
	}
}
