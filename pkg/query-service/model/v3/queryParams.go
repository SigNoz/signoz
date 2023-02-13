package v3

import "go.signoz.io/signoz/pkg/query-service/model"

type QueryRangeParamsV3 struct {
	Start          int64                  `json:"start"`
	End            int64                  `json:"end"`
	Step           int64                  `json:"step,omitempty"`
	CompositeQuery *CompositeQuery        `json:"compositeQuery"`
	Variables      map[string]interface{} `json:"variables,omitempty"`
}

type CompositeQuery struct {
	BuilderQueries    map[string]*BuilderQuery          `json:"builderQueries,omitempty"`
	ClickHouseQueries map[string]*model.ClickHouseQuery `json:"chQueries,omitempty"`
	PromQueries       map[string]*model.PromQuery       `json:"promQueries,omitempty"`
	PanelType         model.PanelType                   `json:"panelType"`
	QueryType         model.QueryType                   `json:"queryType"`
}

type BuilderQuery struct {
	QueryName          string                  `json:"queryName"`
	DataSource         model.DataSource        `json:"dataSource"`
	AggregateOperator  model.AggregateOperator `json:"aggregateOperator"`
	AggregateAttribute string                  `json:"aggregateAttribute,omitempty"`
	Filters            *FilterSet              `json:"filters,omitempty"`
	GroupBy            []string                `json:"groupBy,omitempty"`
	Expression         string                  `json:"expression"`
	Disabled           bool                    `json:"disabled"`
	Having             []Having                `json:"having"`
	Limit              uint64                  `json:"limit"`
	Offset             uint64                  `json:"offset"`
	PageSize           uint64                  `json:"pageSize"`
	OrderBy            []OrderBy               `json:"orderBy"`
	Step               int64                   `json:"step,omitempty"`
	ReduceTo           model.ReduceToOperator  `json:"reduceTo,omitempty"`
	SelectColumns      []string                `json:"selectColumns,omitempty"`
}

type FilterSet struct {
	Operator string       `json:"op,omitempty"`
	Items    []FilterItem `json:"items"`
}

type FilterItem struct {
	Key      string      `json:"key"`
	Value    interface{} `json:"value"`
	Operator string      `json:"op"`
}

type OrderBy struct {
	ColumnName string
	Order      string
}

type Having struct {
	Operator   string
	Value      interface{}
	ColumnName string
}
