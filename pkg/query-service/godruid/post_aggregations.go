package godruid

import (
	"encoding/json"
)

type PostAggregation struct {
	Type       string               `json:"type"`
	Name       string               `json:"name,omitempty"`
	Value      interface{}          `json:"value,omitempty"`
	Fn         string               `json:"fn,omitempty"`
	Field      PostAggregationField `json:"field,omitempty"`
	Fields     []PostAggregation    `json:"fields,omitempty"`
	FieldName  string               `json:"fieldName,omitempty"`
	FieldNames []string             `json:"fieldNames,omitempty"`
	Function   string               `json:"function,omitempty"`
	Fraction   float32              `json:"fraction,omitempty"`
	Fractions  []float32            `json:"fractions,omitempty"`
}

type PostAggregationField struct {
	Type      string `json:"type,omitempty"`
	FieldName string `json:"fieldName,omitempty"`
}

func NewPostAggregationField(fieldName string) PostAggregationField {
	return PostAggregationField{
		Type:      "fieldAccess",
		FieldName: fieldName,
	}
}

// The agg reference.
type AggRefer struct {
	Name  string
	Refer string // The refer of Name, empty means Name has no refer.
}

// Return the aggregations or post aggregations which this post aggregation used.
// It could be helpful while automatically filling the aggregations or post aggregations base on this.
func (pa PostAggregation) GetReferAggs(parentName ...string) (refers []AggRefer) {
	switch pa.Type {
	case "arithmetic":
		if len(parentName) != 0 {
			refers = append(refers, AggRefer{parentName[0], pa.Name})
		} else {
			refers = append(refers, AggRefer{pa.Name, ""})
		}
		for _, spa := range pa.Fields {
			refers = append(refers, spa.GetReferAggs(pa.Name)...)
		}
	case "fieldAccess":
		refers = append(refers, AggRefer{parentName[0], pa.FieldName})
	case "constant":
		// no need refers.
	case "javascript":
		for _, f := range pa.FieldNames {
			refers = append(refers, AggRefer{pa.Name, f})
		}
	case "hyperUniqueCardinality":
		refers = append(refers, AggRefer{parentName[0], pa.FieldName})
	}
	return
}

func PostAggRawJson(rawJson string) PostAggregation {
	pa := &PostAggregation{}
	json.Unmarshal([]byte(rawJson), pa)
	return *pa
}

func PostAggArithmetic(name, fn string, fields []PostAggregation) PostAggregation {
	return PostAggregation{
		Type:   "arithmetic",
		Name:   name,
		Fn:     fn,
		Fields: fields,
	}
}

func PostAggFieldAccessor(fieldName string) PostAggregation {
	return PostAggregation{
		Type:      "fieldAccess",
		FieldName: fieldName,
	}
}

func PostAggConstant(name string, value interface{}) PostAggregation {
	return PostAggregation{
		Type:  "constant",
		Name:  name,
		Value: value,
	}
}

func PostAggJavaScript(name, function string, fieldNames []string) PostAggregation {
	return PostAggregation{
		Type:       "javascript",
		Name:       name,
		FieldNames: fieldNames,
		Function:   function,
	}
}

func PostAggFieldHyperUnique(fieldName string) PostAggregation {
	return PostAggregation{
		Type:      "hyperUniqueCardinality",
		FieldName: fieldName,
	}
}
