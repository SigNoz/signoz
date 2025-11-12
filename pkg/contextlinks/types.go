package contextlinks

import (
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
)

// TODO(srikanthccv): Fix the URL management
type URLShareableTimeRange struct {
	Start    int64 `json:"start"`
	End      int64 `json:"end"`
	PageSize int64 `json:"pageSize"`
}

type FilterExpression struct {
	Expression string `json:"expression,omitempty"`
}

type Aggregation struct {
	Expression string `json:"expression,omitempty"`
}

type LinkQuery struct {
	v3.BuilderQuery
	Filter       *FilterExpression `json:"filter,omitempty"`
	Aggregations []*Aggregation    `json:"aggregations,omitempty"`
}

type URLShareableBuilderQuery struct {
	QueryData     []LinkQuery `json:"queryData"`
	QueryFormulas []string    `json:"queryFormulas"`
}

type URLShareableCompositeQuery struct {
	QueryType string                   `json:"queryType"`
	Builder   URLShareableBuilderQuery `json:"builder"`
}

type URLShareableOptions struct {
	MaxLines      int               `json:"maxLines"`
	Format        string            `json:"format"`
	SelectColumns []v3.AttributeKey `json:"selectColumns"`
}

var PredefinedAlertLabels = []string{ruletypes.LabelThresholdName, ruletypes.LabelSeverityName, ruletypes.LabelLastSeen}
