package v3

type DataSource string

const (
	DataSourceTraces  DataSource = "traces"
	DataSourceLogs    DataSource = "logs"
	DataSourceMetrics DataSource = "metrics"
)

type AggregateOperator string

const (
	AggregateOperatorNoOp          AggregateOperator = "noop"
	AggregateOpeatorCount          AggregateOperator = "count"
	AggregateOperatorCountDistinct AggregateOperator = "count_distinct"
	AggregateOperatorSum           AggregateOperator = "sum"
	AggregateOperatorAvg           AggregateOperator = "avg"
	AggregateOperatorMin           AggregateOperator = "min"
	AggregateOperatorMax           AggregateOperator = "max"
	AggregateOperatorP05           AggregateOperator = "p05"
	AggregateOperatorP10           AggregateOperator = "p10"
	AggregateOperatorP20           AggregateOperator = "p20"
	AggregateOperatorP25           AggregateOperator = "p25"
	AggregateOperatorP50           AggregateOperator = "p50"
	AggregateOperatorP75           AggregateOperator = "p75"
	AggregateOperatorP90           AggregateOperator = "p90"
	AggregateOperatorP95           AggregateOperator = "p95"
	AggregateOperatorP99           AggregateOperator = "p99"
	AggregateOperatorRate          AggregateOperator = "rate"
	AggregateOperatorSumRate       AggregateOperator = "sum_rate"
	AggregateOperatorAvgRate       AggregateOperator = "avg_rate"
	AggregateOperatorMinRate       AggregateOperator = "min_rate"
	AggregateOperatorMaxRate       AggregateOperator = "max_rate"
	AggregateOperatorRateSum       AggregateOperator = "rate_sum"
	AggregateOperatorRateAvg       AggregateOperator = "rate_avg"
	AggregateOperatorRateMin       AggregateOperator = "rate_min"
	AggregateOperatorRateMax       AggregateOperator = "rate_max"
	AggregateOperatorHistQuant50   AggregateOperator = "hist_quantile_50"
	AggregateOperatorHistQuant75   AggregateOperator = "hist_quantile_75"
	AggregateOperatorHistQuant90   AggregateOperator = "hist_quantile_90"
	AggregateOperatorHistQuant95   AggregateOperator = "hist_quantile_95"
	AggregateOperatorHistQuant99   AggregateOperator = "hist_quantile_99"
)

// AggregateAttributeRequest is a request to fetch possible attribute keys
// for a selected aggregate operator and search text.
// The context of the selected aggregate operator is used as the
// type of the attribute key is different for different aggregate operators.
// For example, for the aggregate operator "avg" the attribute value type must be
// a number
type AggregateAttributeRequest struct {
	DataSource DataSource        `json:"dataSource"`
	Operator   AggregateOperator `json:"aggregateOperator"`
	SearchText string            `json:"searchText"`
	Limit      int               `json:"limit"`
}

// FilterAttributeKeyRequest is a request to fetch possible attribute keys
// for a selected aggregate operator and aggregate attribute and search text.
type FilterAttributeKeyRequest struct {
	DataSource         DataSource        `json:"dataSource"`
	AggregateOperator  AggregateOperator `json:"aggregateOperator"`
	AggregateAttribute string            `json:"aggregateAttribute"`
	SearchText         string            `json:"searchText"`
	Limit              int               `json:"limit"`
}

// FilterAttributeValueRequest is a request to fetch possible attribute values
// for a selected aggregate operator, aggregate attribute, filter attribute key
// and search text.
type FilterAttributeValueRequest struct {
	DataSource         DataSource        `json:"dataSource"`
	AggregateOperator  AggregateOperator `json:"aggregateOperator"`
	AggregateAttribute string            `json:"aggregateAttribute"`
	FilterAttributeKey string            `json:"filterAttributeKey"`
	SearchText         string            `json:"searchText"`
	Limit              int               `json:"limit"`
}

type AggregateAttributeResponse struct {
	AttributeKeys []AttributeKey `json:"attributeKeys"`
}

type FilterAttributeKeyResponse struct {
	AttributeKeys []AttributeKey `json:"attributeKeys"`
}

type AttributeKey struct {
	Key      string `json:"key"`
	DataType string `json:"dataType"`
	Type     string `json:"type"` // "column" or "tag"/"attr"/"attribute" or "resource"?
}

type FilterAttributeValueResponse struct {
	AttributeValues []interface{} `json:"attributeValues"`
}
