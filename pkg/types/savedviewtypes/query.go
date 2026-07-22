package savedviewtypes

import (
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// CompositeQuery is the query a saved view persists: a v5 query envelope
// list plus the panel/query type needed to render and edit it. Unlike the
// legacy v3.CompositeQuery it replaces here, this is v5-only by
// construction -- no builderQueries/chQueries/promQueries/unit/fillGaps.
// Saved views are always built from builder queries (never raw ClickHouse
// SQL or PromQL), so this covers every saved view.
type CompositeQuery struct {
	PanelType v3.PanelType            `json:"panelType" required:"true"`
	QueryType v3.QueryType            `json:"queryType" required:"true"`
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
