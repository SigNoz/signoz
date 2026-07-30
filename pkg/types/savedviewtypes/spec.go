package savedviewtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// SavedViewSchemaVersion is the only schemaVersion currently.
const SavedViewSchemaVersion = "v2"

// Display holds view-rendering preferences. Fields are always serialized
// (no omitempty) so a zero value in a response can't be confused with an
// omitted key -- e.g. an explicit maxLines:0 must round-trip as 0, not
// silently disappear.
type Display struct {
	MaxLines int    `json:"maxLines"`
	FontSize string `json:"fontSize"`
	Format   string `json:"format"`
	Color    string `json:"color"`
}

// SavedViewSpec is the typed content of a saved view, mirroring the dashboardtypes v2 spec pattern.
type SavedViewSpec struct {
	PanelType      PanelType                          `json:"panelType" required:"true"`
	Queries        []qbtypes.QueryEnvelope            `json:"queries" required:"true" nullable:"false"`
	SelectedFields []telemetrytypes.TelemetryFieldKey `json:"selectedFields" required:"true" nullable:"false"`
	Display        Display                            `json:"display" required:"true"`
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

var (
	PanelTypeValue = PanelType{valuer.NewString("value")}
	PanelTypeGraph = PanelType{valuer.NewString("graph")}
	PanelTypeTable = PanelType{valuer.NewString("table")}
	PanelTypeList  = PanelType{valuer.NewString("list")}
	PanelTypeTrace = PanelType{valuer.NewString("trace")}
)

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
	if err := s.PanelType.Validate(); err != nil {
		return err
	}

	return (&qbtypes.CompositeQuery{Queries: s.Queries}).Validate()
}

func (d *SavedViewData) Validate() error {
	if d.SchemaVersion != SavedViewSchemaVersion {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "schemaVersion must be %q, got %q", SavedViewSchemaVersion, d.SchemaVersion)
	}

	return d.Spec.Validate()
}
