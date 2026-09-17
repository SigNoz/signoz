package contextlinks

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// TODO(srikanthccv): Fix the URL management.

type FilterExpression struct {
	Expression string `json:"expression,omitempty"`
}

// BuilderQuery is the part of an alert's builder query that carries over into
// an explorer link.
type BuilderQuery struct {
	Filter  string
	GroupBy []qbtypes.GroupByKey
}

// LinkQuery carries the only fields the explorer pages read from a shared
// link; the frontend fills in the rest of the query shape with defaults.
type LinkQuery struct {
	DataSource       string            `json:"dataSource"`
	BuilderQueryType string            `json:"builderQueryType,omitempty"`
	Filter           *FilterExpression `json:"filter,omitempty"`
}

type URLShareableBuilderQuery struct {
	QueryData     []LinkQuery `json:"queryData"`
	QueryFormulas []string    `json:"queryFormulas"`
}

type URLShareableCompositeQuery struct {
	QueryType string                   `json:"queryType"`
	Builder   URLShareableBuilderQuery `json:"builder"`
}

var PredefinedAlertLabels = []string{ruletypes.LabelThresholdName, ruletypes.LabelSeverityName, ruletypes.LabelLastSeen}
