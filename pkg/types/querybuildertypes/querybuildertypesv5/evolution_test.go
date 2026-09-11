package querybuildertypesv5

import (
	"testing"
	"time"

	schema "github.com/SigNoz/signoz-otel-collector/cmd/signozschemamigrator/schema_migrator"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	LogsV2BodyV2Column       = "body_v2"
	LogsV2BodyPromotedColumn = "body_promoted"
)

var (
	resources_string = &schema.Column{Name: "resources_string", Type: schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeString,
	}}
	resource          = &schema.Column{Name: "resource", Type: schema.JSONColumnType{}}
	attributes_string = &schema.Column{Name: "attributes_string", Type: schema.MapColumnType{
		KeyType:   schema.LowCardinalityColumnType{ElementType: schema.ColumnTypeString},
		ValueType: schema.ColumnTypeString,
	}}
	attributes    = &schema.Column{Name: "attributes", Type: schema.JSONColumnType{}}
	body_v2       = &schema.Column{Name: LogsV2BodyV2Column, Type: schema.JSONColumnType{}}
	body_promoted = &schema.Column{Name: LogsV2BodyPromotedColumn, Type: schema.JSONColumnType{}}
)

func TestSelectEvolutionsForColumns(t *testing.T) {
	testCases := []struct {
		name            string
		columns         []*schema.Column
		evolutions      []*telemetrytypes.EvolutionEntry
		tsStart         uint64
		tsEnd           uint64
		expectedColumns []string // column names
		expectedEvols   []string // evolution column names
		expectedError   bool
		errorStr        string
	}{
		{
			name: "New evolutions at tsStartTime - should include latest evolution",
			columns: []*schema.Column{
				resources_string,
				resource,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 2, 25, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 25, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 30, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resource"},
			expectedEvols:   []string{"resource"},
		},
		{
			name: "New evolutions after tsStartTime but less than tsEndTime - should include both",
			columns: []*schema.Column{
				resources_string,
				resource,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 2, 3, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resource", "resources_string"}, // sorted by ReleaseTime desc
			expectedEvols:   []string{"resource", "resources_string"},
		},
		{
			name: "Columns without matching evolutions - should exclude them",
			columns: []*schema.Column{
				resources_string,
				resource,          // no evolution for this
				attributes_string, // no evolution for this
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string"},
			expectedEvols:   []string{"resources_string"},
		},
		{
			name: "New evolutions at tsEndTime - should not include new evolution",
			columns: []*schema.Column{
				resources_string,
				resource,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 2, 30, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 25, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 30, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string"},
			expectedEvols:   []string{"resources_string"},
		},
		{
			name: "New evolutions after tsEndTime - should exclude new",
			columns: []*schema.Column{
				resources_string,
				resource,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 2, 25, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string"},
			expectedEvols:   []string{"resources_string"},
		},
		{
			name:    "Empty columns array",
			columns: []*schema.Column{},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{},
			expectedEvols:   []string{},
			expectedError:   true,
			errorStr:        "column resources_string not found",
		},
		{
			name: "Duplicate evolutions - should use first encountered (oldest if sorted)",
			columns: []*schema.Column{
				resource,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 1, 20, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resource"},
			expectedEvols:   []string{"resource"}, // should use first one (older)
		},
		{
			name: "Genuine Duplicate evolutions with new version- should consider both",
			columns: []*schema.Column{
				resources_string,
				resource,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      0,
					ReleaseTime:  time.Date(0, 0, 0, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      1,
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					Version:      2,
					ReleaseTime:  time.Date(2024, 1, 20, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 1, 16, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string", "resource"},
			expectedEvols:   []string{"resources_string", "resource"}, // should use first one (older)
		},
		{
			name: "Evolution exactly at tsEndTime",
			columns: []*schema.Column{
				resources_string,
				resource,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resources_string",
					ColumnType:   "Map(LowCardinality(String), String)",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   "resource",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextResource,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC), // exactly at tsEnd
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"resources_string"}, // resource excluded because After(tsEnd) is true
			expectedEvols:   []string{"resources_string"},
		},
		{
			name: "Single evolution after tsStartTime - JSON body",
			columns: []*schema.Column{
				body_v2,
				body_promoted,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   LogsV2BodyV2Column,
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextBody,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   LogsV2BodyPromotedColumn,
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextBody,
					FieldName:    "user.name",
					ReleaseTime:  time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{LogsV2BodyPromotedColumn, LogsV2BodyV2Column}, // sorted by ReleaseTime desc (newest first)
			expectedEvols:   []string{LogsV2BodyPromotedColumn, LogsV2BodyV2Column},
		},
		{
			name: "No evolution after tsStartTime - JSON body",
			columns: []*schema.Column{
				body_v2,
				body_promoted,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   LogsV2BodyV2Column,
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextBody,
					FieldName:    "__all__",
					ReleaseTime:  time.Unix(0, 0),
				},
				{
					Signal:       telemetrytypes.SignalLogs,
					ColumnName:   LogsV2BodyPromotedColumn,
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextBody,
					FieldName:    "user.name",
					ReleaseTime:  time.Date(2024, 2, 2, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 3, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{LogsV2BodyPromotedColumn},
			expectedEvols:   []string{LogsV2BodyPromotedColumn},
		},
		// The legacy Map column carries no evolution row; it is synthesized as an epoch-0 base.
		// Without that synthesis a window before the JSON rollout has no base <= tsStart and errors.
		{
			name: "Synthesized base only - window before JSON rollout selects the Map base",
			columns: []*schema.Column{
				attributes_string,
				attributes,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalTraces,
					ColumnName:   "attributes",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextAttribute,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 10, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 5, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"attributes_string"},
			expectedEvols:   []string{"attributes_string"},
		},
		{
			name: "Synthesized base and JSON evolution - window straddling rollout selects both",
			columns: []*schema.Column{
				attributes_string,
				attributes,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalTraces,
					ColumnName:   "attributes",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextAttribute,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 10, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"attributes", "attributes_string"}, // sorted by ReleaseTime desc
			expectedEvols:   []string{"attributes", "attributes_string"},
		},
		{
			name: "Synthesized base rejected - window after rollout selects only JSON",
			columns: []*schema.Column{
				attributes_string,
				attributes,
			},
			evolutions: []*telemetrytypes.EvolutionEntry{
				{
					Signal:       telemetrytypes.SignalTraces,
					ColumnName:   "attributes",
					ColumnType:   "JSON()",
					FieldContext: telemetrytypes.FieldContextAttribute,
					FieldName:    "__all__",
					ReleaseTime:  time.Date(2024, 2, 10, 0, 0, 0, 0, time.UTC),
				},
			},
			tsStart:         uint64(time.Date(2024, 2, 15, 0, 0, 0, 0, time.UTC).UnixNano()),
			tsEnd:           uint64(time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC).UnixNano()),
			expectedColumns: []string{"attributes"},
			expectedEvols:   []string{"attributes"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resultColumns, resultEvols, err := SelectEvolutionsForColumns(tc.columns, tc.evolutions, tc.tsStart, tc.tsEnd)

			if tc.expectedError {
				assert.Contains(t, err.Error(), tc.errorStr)
			} else {
				require.NoError(t, err)
				assert.Equal(t, len(tc.expectedColumns), len(resultColumns), "column count mismatch")
				assert.Equal(t, len(tc.expectedEvols), len(resultEvols), "evolution count mismatch")

				resultColumnNames := make([]string, len(resultColumns))
				for i, col := range resultColumns {
					resultColumnNames[i] = col.Name
				}
				resultEvolNames := make([]string, len(resultEvols))
				for i, evol := range resultEvols {
					resultEvolNames[i] = evol.ColumnName
				}

				for i := range tc.expectedColumns {
					assert.Equal(t, resultColumnNames[i], tc.expectedColumns[i], "expected column missing: "+tc.expectedColumns[i])
				}
				for i := range tc.expectedEvols {
					assert.Equal(t, resultEvolNames[i], tc.expectedEvols[i], "expected evolution missing: "+tc.expectedEvols[i])
				}
				// Verify sorting: should be descending by ReleaseTime
				for i := 0; i < len(resultEvols)-1; i++ {
					assert.True(t, !resultEvols[i].ReleaseTime.Before(resultEvols[i+1].ReleaseTime),
						"evolutions should be sorted descending by ReleaseTime")
				}
			}
		})
	}
}

// SelectEvolutionsForColumns synthesizes epoch-0 bases into a fresh slice and sorts that copy;
// the caller's evolutions slice may be cached and shared, so it must come back untouched.
func TestSelectEvolutionsForColumnsDoesNotMutateInput(t *testing.T) {
	evolutions := []*telemetrytypes.EvolutionEntry{
		{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   "attributes",
			ColumnType:   "JSON()",
			FieldContext: telemetrytypes.FieldContextAttribute,
			FieldName:    "__all__",
			ReleaseTime:  time.Date(2024, 2, 10, 0, 0, 0, 0, time.UTC),
		},
		{
			Signal:       telemetrytypes.SignalTraces,
			ColumnName:   "resource",
			ColumnType:   "JSON()",
			FieldContext: telemetrytypes.FieldContextResource,
			FieldName:    "__all__",
			ReleaseTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		},
	}
	original := make([]*telemetrytypes.EvolutionEntry, len(evolutions))
	copy(original, evolutions)

	_, _, err := SelectEvolutionsForColumns(
		[]*schema.Column{attributes_string, attributes, resource},
		evolutions,
		uint64(time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC).UnixNano()),
		uint64(time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC).UnixNano()),
	)

	require.NoError(t, err)
	require.Equal(t, original, evolutions, "input evolutions slice must not be reordered or extended")
}
