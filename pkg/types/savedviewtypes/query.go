package savedviewtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// PanelType is the explore-page panel a saved view renders as. It is local
// to savedviewtypes (not the legacy pkg/query-service/model/v3.PanelType)
// following the same pattern ruletypes.PanelType uses alongside
// qbtypes.QueryEnvelope for alerts.
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

// Enum implements jsonschema.Enum; returns the acceptable values for PanelType.
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

// QueryType records which query-builder mode (builder/ClickHouse SQL/PromQL)
// the view was last edited in -- it is a UI-tab selector, not a technical
// query-execution detail (that's qbtypes.QueryEnvelope.Type, which lives per
// query in Queries and can differ across entries). Local to savedviewtypes,
// mirroring ruletypes.QueryType.
type QueryType struct {
	valuer.String
}

var (
	QueryTypeBuilder       = QueryType{valuer.NewString("builder")}
	QueryTypeClickHouseSQL = QueryType{valuer.NewString("clickhouse_sql")}
	QueryTypePromQL        = QueryType{valuer.NewString("promql")}
)

// Enum implements jsonschema.Enum; returns the acceptable values for QueryType.
func (QueryType) Enum() []any {
	return []any{
		QueryTypeBuilder,
		QueryTypeClickHouseSQL,
		QueryTypePromQL,
	}
}

func (q QueryType) Validate() error {
	switch q {
	case QueryTypeBuilder, QueryTypeClickHouseSQL, QueryTypePromQL:
		return nil
	default:
		return errors.NewInvalidInputf(ErrCodeSavedViewInvalidInput, "invalid query type: %s", q.StringValue())
	}
}

// CompositeQuery is the query a saved view persists: a v5 query envelope
// list plus the panel/query type needed to render and edit it. Unlike the
// legacy v3.CompositeQuery it replaces here, this is v5-only by
// construction -- no builderQueries/chQueries/promQueries/unit/fillGaps.
// Saved views are always built from builder queries (never raw ClickHouse
// SQL or PromQL), so this covers every saved view.
type CompositeQuery struct {
	PanelType PanelType               `json:"panelType" required:"true"`
	QueryType QueryType               `json:"queryType" required:"true"`
	Queries   []qbtypes.QueryEnvelope `json:"queries" required:"true"`
}

func (q *CompositeQuery) Validate() error {
	if err := q.PanelType.Validate(); err != nil {
		return err
	}

	if err := q.QueryType.Validate(); err != nil {
		return err
	}

	return (&qbtypes.CompositeQuery{Queries: q.Queries}).Validate()
}
