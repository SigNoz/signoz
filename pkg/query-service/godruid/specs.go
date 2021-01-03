package godruid

// Defines some small spec like structs here.

// ---------------------------------
// LimitSpec
// ---------------------------------

type Limit struct {
	Type    string   `json:"type"`
	Limit   int      `json:"limit"`
	Columns []Column `json:"columns,omitempty"`
}

const (
	DirectionASC  = "ASCENDING"
	DirectionDESC = "DESCENDING"
)

type Column struct {
	AsNumber  bool   `json:"asNumber"`
	Dimension string `json:"dimension"`
	Direction string `json:"direction"`
}

func LimitDefault(limit int, columns ...[]Column) *Limit {
	var realColums []Column
	if len(columns) > 0 {
		realColums = columns[0]
	}
	return &Limit{
		Type:    "default",
		Limit:   limit,
		Columns: realColums,
	}
}

// ---------------------------------
// SearchQuerySpec
// ---------------------------------

type SearchQuery struct {
	Type   string        `json:"type"`
	Value  interface{}   `json:"value,omitempty"`
	Values []interface{} `json:"values,omitempty"`
}

func SearchQueryInsensitiveContains(value interface{}) *SearchQuery {
	return &SearchQuery{
		Type:  "insensitive_contains",
		Value: value,
	}
}

func SearchQueryFragmentSearch(values []interface{}) *SearchQuery {
	return &SearchQuery{
		Type:   "fragment",
		Values: values,
	}
}

// ---------------------------------
// ToInclude
// ---------------------------------

type ToInclude struct {
	Type    string   `json:"type"`
	Columns []string `json:"columns,omitempty"`
}

var (
	ToIncludeAll  = &ToInclude{Type: "All"}
	ToIncludeNone = &ToInclude{Type: "None"}
)

func ToIncludeList(columns []string) *ToInclude {
	return &ToInclude{
		Type:    "list",
		Columns: columns,
	}
}

// ---------------------------------
// TopNMetricSpec
// ---------------------------------

type TopNMetric struct {
	Type         string      `json:"type"`
	Metric       interface{} `json:"metric,omitempty"`
	PreviousStop string      `json:"previousStop"`
}

func TopNMetricNumeric(metric string) *TopNMetric {
	return &TopNMetric{
		Type:   "numeric",
		Metric: metric,
	}
}

func TopNMetricLexicographic(previousStop string) *TopNMetric {
	return &TopNMetric{
		Type:         "lexicographic",
		PreviousStop: previousStop,
	}
}

func TopNMetricAlphaNumeric(previousStop string) *TopNMetric {
	return &TopNMetric{
		Type:         "alphaNumeric",
		PreviousStop: previousStop,
	}
}

func TopNMetricInverted(metric *TopNMetric) *TopNMetric {
	return &TopNMetric{
		Type:   "inverted",
		Metric: metric,
	}
}

// ---------------------------------
// SearchSortSpec
// ---------------------------------

type SearchSort struct {
	Type string `json:"type"`
}

var (
	SearchSortLexicographic = &SearchSort{Type: "lexicographic"}
	SearchSortStrlen        = &SearchSort{Type: "strlen"}
)
