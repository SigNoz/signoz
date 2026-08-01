package contextlinks

import (
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// TODO(srikanthccv): Fix the URL management.

type FilterExpression struct {
	Expression string `json:"expression,omitempty"`
}

// LinkQuery carries the only fields the explorer pages read from a shared
// link; the frontend fills in the rest of the query shape with defaults.
type LinkQuery struct {
	DataSource string            `json:"dataSource"`
	Filter     *FilterExpression `json:"filter,omitempty"`
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
