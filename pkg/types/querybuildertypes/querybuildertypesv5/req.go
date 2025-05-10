package querybuildertypesv5

type QueryBuilderDef struct {
	Name     string                `json:"name"` // unique identifier
	Kind     QueryBuilderKind      `json:"kind"` // "query" / "formula" / "sub_query" / "join"
	Query    *QueryBuilderQuery    `json:"query,omitempty"`
	Formula  *QueryBuilderFormula  `json:"formula,omitempty"`
	SubQuery *QueryBuilderSubQuery `json:"sub_query,omitempty"`
	Join     *QueryBuilderJoin     `json:"join,omitempty"`
}

type CompositeQuery struct {
	BuilderQueries    map[string]*QueryBuilderDef `json:"builderQueries,omitempty"`
	ClickHouseQueries map[string]*ClickHouseQuery `json:"chQueries,omitempty"`
	PromQueries       map[string]*PromQuery       `json:"promQueries,omitempty"`
	PanelType         PanelType                   `json:"panelType"`
	QueryType         QueryType                   `json:"queryType"`
	// Unit for the time series data shown in the graph
	// This is used in alerts to format the value and threshold
	Unit string `json:"unit,omitempty"`
	// FillGaps is used to fill the gaps in the time series data
	FillGaps bool `json:"fillGaps,omitempty"`
}

type QueryRangeParams struct {
	Start          int64           `json:"start"`
	End            int64           `json:"end"`
	Step           int64           `json:"step"` // step is in seconds; used for prometheus queries
	CompositeQuery *CompositeQuery `json:"compositeQuery"`
	Variables      map[string]any  `json:"variables,omitempty"`
	NoCache        bool            `json:"noCache"`
	FormatForWeb   bool            `json:"formatForWeb,omitempty"`
}
