package savedviewtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// SavedViewSchemaVersion is the only schemaVersion currently.
const SavedViewSchemaVersion = "v2"

var (
	PanelTypeValue = PanelType{valuer.NewString("value")}
	PanelTypeGraph = PanelType{valuer.NewString("graph")}
	PanelTypeTable = PanelType{valuer.NewString("table")}
	PanelTypeList  = PanelType{valuer.NewString("list")}
	PanelTypeTrace = PanelType{valuer.NewString("trace")}
)

// Display holds view-rendering preferences.
type Display struct {
	MaxLines int    `json:"maxLines"`
	FontSize string `json:"fontSize"`
	Format   string `json:"format"`
	Color    string `json:"color"`
}

// SavedViewSpec is the typed content of a saved view. selectedFields and
// display are not marked required: neither is actually validated
// server-side, so requiring them in the schema would over-constrain callers.
type SavedViewSpec struct {
	DisplayName    string                             `json:"displayName" required:"true"`
	PanelType      PanelType                          `json:"panelType" required:"true"`
	Queries        []qbtypes.QueryEnvelope            `json:"queries" required:"true" nullable:"false" minItems:"1"`
	SelectedFields []telemetrytypes.TelemetryFieldKey `json:"selectedFields" nullable:"false"`
	Display        Display                            `json:"display"`
}

// SavedViewData is what's persisted as saved view data.
type SavedViewData struct {
	SchemaVersion string        `json:"schemaVersion" required:"true"`
	Spec          SavedViewSpec `json:"spec" required:"true"`
}

// PanelType is the explore-page panel a saved view renders as.
type PanelType struct {
	valuer.String
}

func (PanelType) Enum() []any {
	return []any{
		PanelTypeValue,
		PanelTypeGraph,
		PanelTypeTable,
		PanelTypeList,
		PanelTypeTrace,
	}
}

func (p PanelType) Validate() error {
	switch p {
	case PanelTypeValue, PanelTypeGraph, PanelTypeTable, PanelTypeList, PanelTypeTrace:
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "invalid panel type: %s", p.StringValue())
	}
}

func (s *SavedViewSpec) Validate() error {
	if s.DisplayName == "" {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "displayName is required")
	}
	if err := s.PanelType.Validate(); err != nil {
		return err
	}

	return (&qbtypes.CompositeQuery{Queries: s.Queries}).Validate()
}

