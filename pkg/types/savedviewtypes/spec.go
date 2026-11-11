package savedviewtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// SavedViewSchemaVersion is the only schemaVersion currently.
var SavedViewSchemaVersion = SchemaVersion{valuer.NewString("v2")}

var (
	PanelTypeValue = PanelType{valuer.NewString("value")}
	PanelTypeGraph = PanelType{valuer.NewString("graph")}
	PanelTypeTable = PanelType{valuer.NewString("table")}
	PanelTypeList  = PanelType{valuer.NewString("list")}
	PanelTypeTrace = PanelType{valuer.NewString("trace")}
)

// Display holds view-rendering preferences.
type Display struct {
	MaxLines int    `json:"maxLines" description:"The number of lines shown per row before the body is truncated in logs list views. 0 leaves the explorer default."`
	FontSize string `json:"fontSize" description:"The row font size in list views: small, medium or large. Empty leaves the explorer default."`
	Format   string `json:"format" description:"The list rendering mode in the logs explorer: raw, table or list. Empty leaves the explorer default."`
	Color    string `json:"color" description:"A CSS color such as a hex code, shown as the view's color in the explorer view picker; the saved views panel does not use it. Empty leaves the default."`
}

// SavedViewSpec is the typed content of a saved view.
type SavedViewSpec struct {
	DisplayName    string                             `json:"displayName" required:"true" description:"The human readable title shown in the explorer. It may differ from the machine name and need not be unique."`
	PanelType      PanelType                          `json:"panelType" required:"true" description:"The explorer panel the view renders as: list, graph, table, value or trace."`
	RequestType    qbtypes.RequestType                `json:"requestType" required:"true" description:"The query_range request type the panel issues: raw for list panels, time_series for graphs, scalar for table and value panels, trace for trace panels."`
	Queries        []qbtypes.QueryEnvelope            `json:"queries" required:"true" nullable:"false" minItems:"1" description:"The query envelopes the view runs, in the v5 query builder shape. At least one is required and the set is validated for the requestType."`
	SelectedFields []telemetrytypes.TelemetryFieldKey `json:"selectedFields" nullable:"false" description:"The columns shown in list panels, each a field key with name and optionally signal, fieldContext and fieldDataType. Send explicit columns for list views: an empty array yields no trace columns and only the required log columns. Use an empty array for graph views."`
	Display        Display                            `json:"display" description:"Rendering preferences for list panels. All fields are optional."`
}

// SavedViewData is what's persisted as saved view data.
type SavedViewData struct {
	SchemaVersion string        `json:"schemaVersion" required:"true" description:"The version of the spec shape the stored view was written with."`
	Spec          SavedViewSpec `json:"spec" required:"true" description:"The stored view spec."`
}

// SchemaVersion has v2 as the only value currently.
type SchemaVersion struct {
	valuer.String
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

func (SchemaVersion) Enum() []any {
	return []any{SavedViewSchemaVersion}
}

func (s SchemaVersion) Validate() error {
	if s != SavedViewSchemaVersion {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "schemaVersion must be %q, got %q", SavedViewSchemaVersion.StringValue(), s.StringValue())
	}
	return nil
}

func (s *SavedViewSpec) Validate() error {
	if s.DisplayName == "" {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "displayName is required")
	}
	if err := s.PanelType.Validate(); err != nil {
		return err
	}
	if s.RequestType.IsZero() {
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "requestType is required")
	}
	for i, field := range s.SelectedFields {
		if field.Name == "" {
			return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "selectedFields[%d].name is required", i)
		}
	}

	return (&qbtypes.CompositeQuery{Queries: s.Queries}).Validate(qbtypes.GetValidationOptions(s.RequestType)...)
}

// LegacyRequestTypeForPanelType exists only for the v1 legacy API.
func LegacyRequestTypeForPanelType(p PanelType) qbtypes.RequestType {
	switch p {
	case PanelTypeList:
		return qbtypes.RequestTypeRaw
	case PanelTypeTrace:
		return qbtypes.RequestTypeTrace
	case PanelTypeGraph:
		return qbtypes.RequestTypeTimeSeries
	default:
		return qbtypes.RequestTypeScalar
	}
}
