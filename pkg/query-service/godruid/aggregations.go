package godruid

import (
	"encoding/json"
)

type Aggregation struct {
	Type        string   `json:"type"`
	Name        string   `json:"name,omitempty"`
	FieldName   string   `json:"fieldName,omitempty"`
	FieldNames  []string `json:"fieldNames,omitempty"`
	FnAggregate string   `json:"fnAggregate,omitempty"`
	FnCombine   string   `json:"fnCombine,omitempty"`
	FnReset     string   `json:"fnReset,omitempty"`
	ByRow       bool     `json:"byRow,omitempty"`
}

func AggRawJson(rawJson string) Aggregation {
	agg := &Aggregation{}
	json.Unmarshal([]byte(rawJson), agg)
	return *agg
}

func AggCount(name string) Aggregation {
	return Aggregation{
		Type: "count",
		Name: name,
	}
}

func AggLongSum(name, fieldName string) Aggregation {
	return Aggregation{
		Type:      "longSum",
		Name:      name,
		FieldName: fieldName,
	}
}

func AggDoubleSum(name, fieldName string) Aggregation {
	return Aggregation{
		Type:      "doubleSum",
		Name:      name,
		FieldName: fieldName,
	}
}

func AggMin(name, fieldName string) Aggregation {
	return Aggregation{
		Type:      "min",
		Name:      name,
		FieldName: fieldName,
	}
}

func AggMax(name, fieldName string) Aggregation {
	return Aggregation{
		Type:      "max",
		Name:      name,
		FieldName: fieldName,
	}
}

func AggJavaScript(name, fnAggregate, fnCombine, fnReset string, fieldNames []string) Aggregation {
	return Aggregation{
		Type:        "javascript",
		Name:        name,
		FieldNames:  fieldNames,
		FnAggregate: fnAggregate,
		FnCombine:   fnCombine,
		FnReset:     fnReset,
	}
}

func AggCardinality(name string, fieldNames []string, byRow ...bool) Aggregation {
	isByRow := false
	if len(byRow) != 0 {
		isByRow = byRow[0]
	}
	return Aggregation{
		Type:       "cardinality",
		Name:       name,
		FieldNames: fieldNames,
		ByRow:      isByRow,
	}
}
