package godruid

type DimSpec interface{}

type Dimension struct {
	Type            string           `json:"type"`
	Dimension       string           `json:"dimension"`
	OutputName      string           `json:"outputName"`
	DimExtractionFn *DimExtractionFn `json:"dimExtractionFn,omitempty"`
}

type DimExtractionFn struct {
	Type         string       `json:"type"`
	Expr         string       `json:"expr,omitempty"`
	Query        *SearchQuery `json:"query,omitempty"`
	TimeFormat   string       `json:"timeFormat,omitempty"`
	ResultFormat string       `json:"resultFormat,omitempty"`
	Function     string       `json:"function,omitempty"`
}

func DimDefault(dimension, outputName string) DimSpec {
	return &Dimension{
		Type:       "default",
		Dimension:  dimension,
		OutputName: outputName,
	}
}

func DimExtraction(dimension, outputName string, fn *DimExtractionFn) DimSpec {
	return &Dimension{
		Type:            "extraction",
		Dimension:       dimension,
		OutputName:      outputName,
		DimExtractionFn: fn,
	}
}

func DimExFnRegex(expr string) *DimExtractionFn {
	return &DimExtractionFn{
		Type: "regex",
		Expr: expr,
	}
}

func DimExFnPartial(expr string) *DimExtractionFn {
	return &DimExtractionFn{
		Type: "partial",
		Expr: expr,
	}
}

func DimExFnSearchQuerySpec(query *SearchQuery) *DimExtractionFn {
	return &DimExtractionFn{
		Type:  "searchQuery",
		Query: query,
	}
}

func DimExFnTime(timeFormat, resultFormat string) *DimExtractionFn {
	return &DimExtractionFn{
		Type:         "time",
		TimeFormat:   timeFormat,
		ResultFormat: resultFormat,
	}
}

func DimExFnJavascript(function string) *DimExtractionFn {
	return &DimExtractionFn{
		Type:     "javascript",
		Function: function,
	}
}
