package savedviewtypes

import (
	"encoding/json"
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func validQueries() []qbtypes.QueryEnvelope {
	return []qbtypes.QueryEnvelope{
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
			},
		},
	}
}

func TestPanelTypeValidate(t *testing.T) {
	cases := []struct {
		name        string
		panelType   PanelType
		expectError bool
	}{
		{name: "value", panelType: PanelTypeValue},
		{name: "graph", panelType: PanelTypeGraph},
		{name: "table", panelType: PanelTypeTable},
		{name: "list", panelType: PanelTypeList},
		{name: "trace", panelType: PanelTypeTrace},
		{name: "unknown is rejected", panelType: PanelType{valuer.NewString("bogus")}, expectError: true},
		{name: "empty is rejected", panelType: PanelType{}, expectError: true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.panelType.Validate()
			if c.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestSavedViewSpecValidate(t *testing.T) {
	cases := []struct {
		name        string
		spec        SavedViewSpec
		expectError bool
	}{
		{
			name:        "valid spec",
			spec:        SavedViewSpec{DisplayName: "My View", PanelType: PanelTypeGraph, RequestType: qbtypes.RequestTypeTimeSeries, Queries: validQueries()},
			expectError: false,
		},
		{
			name:        "empty display name is rejected",
			spec:        SavedViewSpec{RequestType: qbtypes.RequestTypeTimeSeries, Queries: validQueries()},
			expectError: true,
		},
		{
			name:        "invalid panel type is rejected",
			spec:        SavedViewSpec{DisplayName: "My View", PanelType: PanelType{valuer.NewString("bogus")}, RequestType: qbtypes.RequestTypeTimeSeries, Queries: validQueries()},
			expectError: true,
		},
		{
			name:        "unset panel type is rejected",
			spec:        SavedViewSpec{DisplayName: "My View", RequestType: qbtypes.RequestTypeTimeSeries, Queries: validQueries()},
			expectError: true,
		},
		{
			name:        "missing requestType is rejected",
			spec:        SavedViewSpec{DisplayName: "My View", Queries: validQueries()},
			expectError: true,
		},
		{
			name:        "no queries is rejected",
			spec:        SavedViewSpec{DisplayName: "My View", RequestType: qbtypes.RequestTypeTimeSeries},
			expectError: true,
		},
		{
			name: "selectedFields and display populated is still valid",
			spec: SavedViewSpec{
				DisplayName:    "My View",
				PanelType:      PanelTypeTable,
				RequestType:    qbtypes.RequestTypeScalar,
				Queries:        validQueries(),
				SelectedFields: []telemetrytypes.TelemetryFieldKey{{Name: "service.name"}},
				Display:        Display{MaxLines: 3, FontSize: "small", Format: "table", Color: "blue"},
			},
			expectError: false,
		},
		{
			name: "nil selectedFields is valid -- selectedFields itself is not required",
			spec: SavedViewSpec{
				DisplayName:    "My View",
				PanelType:      PanelTypeValue,
				RequestType:    qbtypes.RequestTypeScalar,
				Queries:        validQueries(),
				SelectedFields: nil,
			},
			expectError: false,
		},
		{
			name: "empty (non-nil) selectedFields is valid",
			spec: SavedViewSpec{
				DisplayName:    "My View",
				PanelType:      PanelTypeValue,
				RequestType:    qbtypes.RequestTypeScalar,
				Queries:        validQueries(),
				SelectedFields: []telemetrytypes.TelemetryFieldKey{},
			},
			expectError: false,
		},
		{
			name: "zero-value display is valid",
			spec: SavedViewSpec{
				DisplayName: "My View",
				PanelType:   PanelTypeValue,
				RequestType: qbtypes.RequestTypeScalar,
				Queries:     validQueries(),
				Display:     Display{},
			},
			expectError: false,
		},
		{
			name: "list panel query with no aggregation is valid",
			spec: SavedViewSpec{
				DisplayName: "My View",
				PanelType:   PanelTypeList,
				RequestType: qbtypes.RequestTypeRaw,
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Signal: telemetrytypes.SignalTraces,
					},
				}},
			},
			expectError: false,
		},
		{
			name: "trace panel query with no aggregation is valid",
			spec: SavedViewSpec{
				DisplayName: "My View",
				PanelType:   PanelTypeTrace,
				RequestType: qbtypes.RequestTypeTrace,
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Signal: telemetrytypes.SignalTraces,
					},
				}},
			},
			expectError: false,
		},
		{
			name: "graph panel query with no aggregation is still rejected",
			spec: SavedViewSpec{
				DisplayName: "My View",
				PanelType:   PanelTypeGraph,
				RequestType: qbtypes.RequestTypeTimeSeries,
				Queries: []qbtypes.QueryEnvelope{{
					Type: qbtypes.QueryTypeBuilder,
					Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
						Signal: telemetrytypes.SignalTraces,
					},
				}},
			},
			expectError: true,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.spec.Validate()
			if c.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestSavedViewSpecValidate_RequestTypeIsIndependentOfPanelType(t *testing.T) {
	// RequestType, not PanelType, governs which aggregation rules apply -- nothing
	// derives one from the other inside Validate.
	spec := SavedViewSpec{
		DisplayName: "My View",
		PanelType:   PanelTypeGraph,
		RequestType: qbtypes.RequestTypeRaw,
		Queries: []qbtypes.QueryEnvelope{{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
				Signal: telemetrytypes.SignalTraces,
			},
		}},
	}

	assert.NoError(t, spec.Validate())

	spec.RequestType = qbtypes.RequestTypeTimeSeries
	assert.Error(t, spec.Validate())
}

func TestSavedViewSpecJSONUnmarshal_OptionalFields(t *testing.T) {
	base := `"displayName":"My View","panelType":"value","requestType":"scalar","queries":[{"type":"builder_query","spec":{"signal":"logs","aggregations":[{"expression":"count()"}]}}]`

	cases := []struct {
		name string
		json string
	}{
		{name: "selectedFields and display omitted entirely", json: `{` + base + `}`},
		{name: "selectedFields and display explicitly null", json: `{` + base + `,"selectedFields":null,"display":null}`},
		{name: "selectedFields empty array, display empty object", json: `{` + base + `,"selectedFields":[],"display":{}}`},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var spec SavedViewSpec
			err := json.Unmarshal([]byte(c.json), &spec)
			require.NoError(t, err)
			assert.NoError(t, spec.Validate())
			assert.Empty(t, spec.SelectedFields)
			assert.Equal(t, Display{}, spec.Display)
		})
	}
}

func TestSchemaVersionValidate(t *testing.T) {
	cases := []struct {
		name          string
		schemaVersion SchemaVersion
		expectError   bool
	}{
		{name: "valid schema version", schemaVersion: SavedViewSchemaVersion, expectError: false},
		{name: "wrong schema version is rejected", schemaVersion: SchemaVersion{valuer.NewString("v1")}, expectError: true},
		{name: "empty schema version is rejected", schemaVersion: SchemaVersion{}, expectError: true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.schemaVersion.Validate()
			if c.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
