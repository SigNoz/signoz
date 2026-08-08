package savedviewtypes

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"testing"

	"github.com/stretchr/testify/assert"
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
			spec:        SavedViewSpec{DisplayName: "My View", PanelType: PanelTypeGraph, Queries: validQueries()},
			expectError: false,
		},
		{
			name:        "empty display name is rejected",
			spec:        SavedViewSpec{PanelType: PanelTypeGraph, Queries: validQueries()},
			expectError: true,
		},
		{
			name:        "invalid panel type is rejected before queries are checked",
			spec:        SavedViewSpec{DisplayName: "My View", PanelType: PanelType{valuer.NewString("bogus")}, Queries: validQueries()},
			expectError: true,
		},
		{
			name:        "no queries is rejected",
			spec:        SavedViewSpec{DisplayName: "My View", PanelType: PanelTypeGraph},
			expectError: true,
		},
		{
			name: "selected fields and display are not required",
			spec: SavedViewSpec{
				DisplayName:    "My View",
				PanelType:      PanelTypeTable,
				Queries:        validQueries(),
				SelectedFields: []telemetrytypes.TelemetryFieldKey{{Name: "service.name"}},
				Display:        Display{MaxLines: 3, FontSize: "small", Format: "table", Color: "blue"},
			},
			expectError: false,
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

func TestSavedViewMetadataBaseValidate(t *testing.T) {
	cases := []struct {
		name        string
		metadata    SavedViewMetadataBase
		expectError bool
	}{
		{name: "valid schema version", metadata: SavedViewMetadataBase{SchemaVersion: SavedViewSchemaVersion}, expectError: false},
		{name: "wrong schema version is rejected", metadata: SavedViewMetadataBase{SchemaVersion: "v1"}, expectError: true},
		{name: "empty schema version is rejected", metadata: SavedViewMetadataBase{}, expectError: true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.metadata.Validate()
			if c.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
