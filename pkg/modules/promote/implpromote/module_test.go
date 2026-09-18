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
		target       promotetypes.Target
		paths        []*promotetypes.PromotePath
		promoteTwice bool
		wantErr      bool
		wantPromoted []string
	}{
		{
			name:   "PromotesNewAttributes_Idempotent",
			target: promotetypes.NewTracesAttributesTarget(),
			paths: []*promotetypes.PromotePath{
				{Path: "http.method", Promote: true},
				{Path: "span.operation", Promote: true},
			},
			promoteTwice: true,
			wantPromoted: []string{"http.method", "span.operation"},
		},
		{
			name:   "NonPromoteEntries_NotRecorded",
			target: promotetypes.NewTracesAttributesTarget(),
			paths:  []*promotetypes.PromotePath{{Path: "http.method"}},
		},
		{
			name:   "IndexesOnTraceAttributes_Rejected",
			target: promotetypes.NewTracesAttributesTarget(),
			paths: []*promotetypes.PromotePath{{
				Path:    "http.method",
				Promote: true,
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
				},
			}},
			wantErr: true,
		},
		{
			name:    "ColumnPrefixedPath_Rejected",
			target:  promotetypes.NewTracesAttributesTarget(),
			paths:   []*promotetypes.PromotePath{{Path: "attributes.http.method", Promote: true}},
			wantErr: true,
		},
		{
			name:    "EmptyPath_Rejected",
			target:  promotetypes.NewTracesAttributesTarget(),
			paths:   []*promotetypes.PromotePath{{Path: "", Promote: true}},
			wantErr: true,
		},
		{
			name:    "EmptyRequest_Rejected",
			target:  promotetypes.NewTracesAttributesTarget(),
			wantErr: true,
		},
		{
			name:         "PromotesBodyPath_PrefixStripped",
			target:       promotetypes.NewLogsBodyTarget(),
			paths:        []*promotetypes.PromotePath{{Path: "body.user.name", Promote: true}},
			wantPromoted: []string{"user.name"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			store := telemetrytypestest.NewMockMetadataStore()
			m := NewModule(store, nil)

			err := m.PromotePaths(ctx, testCase.target, testCase.paths...)
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
				// promoting again must not fail
				require.NoError(t, m.PromotePaths(ctx, testCase.target, testCase.paths...))
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
			name: "NewPromotion_IndexesPromotedColumn",
			path: &promotetypes.PromotePath{
				Path:    "body.user.name",
				Promote: true,
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
				},
			},
			wantDDLColumn: "dynamicElement(body_promoted.user.name",
		},
		{
			name:     "AlreadyPromoted_IndexesPromotedColumn",
			promoted: map[string]bool{"user.name": true},
			path: &promotetypes.PromotePath{
				Path: "body.user.name",
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
				},
			},
			wantDDLColumn: "dynamicElement(body_promoted.user.name",
		},
		{
			name: "UnpromotedPath_IndexesBaseColumn",
			path: &promotetypes.PromotePath{
				Path: "body.user.name",
				Indexes: []promotetypes.WrappedIndex{
					{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
				},
			},
			wantDDLColumn: "dynamicElement(body_v2.user.name",
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
			require.NoError(t, m.PromotePaths(ctx, promotetypes.NewLogsBodyTarget(), testCase.path))
			assert.NoError(t, ts.Mock().ExpectationsWereMet())
		})
	}
}

func TestListPromotedPaths(t *testing.T) {
	ctx := context.Background()

	testCases := []struct {
		name      string
		target    promotetypes.Target
		promoted  map[string]bool
		indexes   []telemetrytypes.TelemetryFieldKeySkipIndex
		wantPaths []promotetypes.PromotePath
	}{
		{
			name:     "TracesAttributes_PromotedPaths",
			target:   promotetypes.NewTracesAttributesTarget(),
			promoted: map[string]bool{"http.method": true},
			wantPaths: []promotetypes.PromotePath{
				{Path: "http.method", Promote: true},
			},
		},
		{
			name:     "LogsBody_PromotedAndIndexedPaths",
			target:   promotetypes.NewLogsBodyTarget(),
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
					Path:    "body.user.name",
					Promote: true,
					Indexes: []promotetypes.WrappedIndex{
						{FieldDataType: telemetrytypes.FieldDataTypeString, Type: "ngrambf_v1(4, 1024, 2, 0)", Granularity: 1},
					},
				},
				{
					Path: "body.request.duration",
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

			paths, err := m.ListPromotedPaths(ctx, testCase.target)
			require.NoError(t, err)
			require.Len(t, paths, len(testCase.wantPaths))

			byPath := map[string]promotetypes.PromotePath{}
			for _, path := range paths {
				byPath[path.Path] = path
			}
			for _, want := range testCase.wantPaths {
				require.Contains(t, byPath, want.Path)
				assert.Equal(t, want, byPath[want.Path])
			}
		})
	}
}
