package v3

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
)

type DataSource string

const (
	DataSourceTraces  DataSource = "traces"
	DataSourceLogs    DataSource = "logs"
	DataSourceMetrics DataSource = "metrics"
)

func (d DataSource) Validate() error {
	switch d {
	case DataSourceTraces, DataSourceLogs, DataSourceMetrics:
		return nil
	default:
		return fmt.Errorf("invalid data source: %s", d)
	}
}

type AggregateOperator string

const (
	AggregateOperatorNoOp          AggregateOperator = "noop"
	AggregateOperatorCount         AggregateOperator = "count"
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

func (a AggregateOperator) Validate() error {
	switch a {
	case AggregateOperatorNoOp,
		AggregateOperatorCount,
		AggregateOperatorCountDistinct,
		AggregateOperatorSum,
		AggregateOperatorAvg,
		AggregateOperatorMin,
		AggregateOperatorMax,
		AggregateOperatorP05,
		AggregateOperatorP10,
		AggregateOperatorP20,
		AggregateOperatorP25,
		AggregateOperatorP50,
		AggregateOperatorP75,
		AggregateOperatorP90,
		AggregateOperatorP95,
		AggregateOperatorP99,
		AggregateOperatorRate,
		AggregateOperatorSumRate,
		AggregateOperatorAvgRate,
		AggregateOperatorMinRate,
		AggregateOperatorMaxRate,
		AggregateOperatorRateSum,
		AggregateOperatorRateAvg,
		AggregateOperatorRateMin,
		AggregateOperatorRateMax,
		AggregateOperatorHistQuant50,
		AggregateOperatorHistQuant75,
		AggregateOperatorHistQuant90,
		AggregateOperatorHistQuant95,
		AggregateOperatorHistQuant99:
		return nil
	default:
		return fmt.Errorf("invalid operator: %s", a)
	}
}

// RequireAttribute returns true if the aggregate operator requires an attribute
// to be specified.
func (a AggregateOperator) RequireAttribute(dataSource DataSource) bool {
	switch dataSource {
	case DataSourceMetrics:
		switch a {
		case AggregateOperatorNoOp,
			AggregateOperatorCount,
			AggregateOperatorCountDistinct:
			return false
		default:
			return true
		}
	default:
		return false
	}
}

type ReduceToOperator string

const (
	ReduceToOperatorLast ReduceToOperator = "last"
	ReduceToOperatorSum  ReduceToOperator = "sum"
	ReduceToOperatorAvg  ReduceToOperator = "avg"
	ReduceToOperatorMin  ReduceToOperator = "min"
	ReduceToOperatorMax  ReduceToOperator = "max"
)

func (r ReduceToOperator) Validate() error {
	switch r {
	case ReduceToOperatorLast, ReduceToOperatorSum, ReduceToOperatorAvg, ReduceToOperatorMin, ReduceToOperatorMax:
		return nil
	default:
		return fmt.Errorf("invalid reduce to operator: %s", r)
	}
}

type QueryType string

const (
	QueryTypeUnknown       QueryType = "unknown"
	QueryTypeBuilder       QueryType = "builder"
	QueryTypeClickHouseSQL QueryType = "clickhouse_sql"
	QueryTypePromQL        QueryType = "promql"
)

func (q QueryType) Validate() error {
	switch q {
	case QueryTypeBuilder, QueryTypeClickHouseSQL, QueryTypePromQL:
		return nil
	default:
		return fmt.Errorf("invalid query type: %s", q)
	}
}

type PanelType string

const (
	PanelTypeValue PanelType = "value"
	PanelTypeGraph PanelType = "graph"
	PanelTypeTable PanelType = "table"
	PanelTypeList  PanelType = "list"
)

func (p PanelType) Validate() error {
	switch p {
	case PanelTypeValue, PanelTypeGraph, PanelTypeTable, PanelTypeList:
		return nil
	default:
		return fmt.Errorf("invalid panel type: %s", p)
	}
}

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

type TagType string

const (
	TagTypeTag      TagType = "tag"
	TagTypeResource TagType = "resource"
)

func (q TagType) Validate() error {
	switch q {
	case TagTypeTag, TagTypeResource:
		return nil
	default:
		return fmt.Errorf("invalid tag type: %s", q)
	}
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

type AttributeKeyDataType string

const (
	AttributeKeyDataTypeUnspecified AttributeKeyDataType = ""
	AttributeKeyDataTypeString      AttributeKeyDataType = "string"
	AttributeKeyDataTypeInt64       AttributeKeyDataType = "int64"
	AttributeKeyDataTypeFloat64     AttributeKeyDataType = "float64"
	AttributeKeyDataTypeBool        AttributeKeyDataType = "bool"
)

func (q AttributeKeyDataType) Validate() error {
	switch q {
	case AttributeKeyDataTypeString, AttributeKeyDataTypeInt64, AttributeKeyDataTypeFloat64, AttributeKeyDataTypeBool:
		return nil
	default:
		return fmt.Errorf("invalid tag data type: %s", q)
	}
}

// FilterAttributeValueRequest is a request to fetch possible attribute values
// for a selected aggregate operator, aggregate attribute, filter attribute key
// and search text.
type FilterAttributeValueRequest struct {
	DataSource                 DataSource           `json:"dataSource"`
	AggregateOperator          AggregateOperator    `json:"aggregateOperator"`
	AggregateAttribute         string               `json:"aggregateAttribute"`
	FilterAttributeKey         string               `json:"filterAttributeKey"`
	FilterAttributeKeyDataType AttributeKeyDataType `json:"filterAttributeKeyDataType"`
	TagType                    TagType              `json:"tagType"`
	SearchText                 string               `json:"searchText"`
	Limit                      int                  `json:"limit"`
}

type AggregateAttributeResponse struct {
	AttributeKeys []AttributeKey `json:"attributeKeys"`
}

type FilterAttributeKeyResponse struct {
	AttributeKeys []AttributeKey `json:"attributeKeys"`
}

type AttributeKeyType string

const (
	AttributeKeyTypeUnspecified AttributeKeyType = ""
	AttributeKeyTypeTag         AttributeKeyType = "tag"
	AttributeKeyTypeResource    AttributeKeyType = "resource"
)

type AttributeKey struct {
	Key      string               `json:"key"`
	DataType AttributeKeyDataType `json:"dataType"`
	Type     AttributeKeyType     `json:"type"`
	IsColumn bool                 `json:"isColumn"`
}

func (a AttributeKey) Validate() error {
	switch a.DataType {
	case AttributeKeyDataTypeBool, AttributeKeyDataTypeInt64, AttributeKeyDataTypeFloat64, AttributeKeyDataTypeString, AttributeKeyDataTypeUnspecified:
		break
	default:
		return fmt.Errorf("invalid attribute dataType: %s", a.DataType)
	}

	if a.IsColumn {
		switch a.Type {
		case AttributeKeyTypeResource, AttributeKeyTypeTag:
			break
		default:
			return fmt.Errorf("invalid attribute type: %s", a.Type)
		}
	}

	if a.Key == "" {
		return fmt.Errorf("key is empty")
	}

	return nil
}

type FilterAttributeValueResponse struct {
	StringAttributeValues []string      `json:"stringAttributeValues"`
	NumberAttributeValues []interface{} `json:"numberAttributeValues"`
	BoolAttributeValues   []bool        `json:"boolAttributeValues"`
}

type QueryRangeParamsV3 struct {
	Start          int64                  `json:"start"`
	End            int64                  `json:"end"`
	Step           int64                  `json:"step"`
	CompositeQuery *CompositeQuery        `json:"compositeQuery"`
	Variables      map[string]interface{} `json:"variables,omitempty"`
}

type PromQuery struct {
	Query    string `json:"query"`
	Stats    string `json:"stats,omitempty"`
	Disabled bool   `json:"disabled"`
}

func (p *PromQuery) Validate() error {
	if p == nil {
		return nil
	}

	if p.Query == "" {
		return fmt.Errorf("query is empty")
	}

	return nil
}

type ClickHouseQuery struct {
	Query    string `json:"query"`
	Disabled bool   `json:"disabled"`
}

func (c *ClickHouseQuery) Validate() error {
	if c == nil {
		return nil
	}

	if c.Query == "" {
		return fmt.Errorf("query is empty")
	}

	return nil
}

type CompositeQuery struct {
	BuilderQueries    map[string]*BuilderQuery    `json:"builderQueries,omitempty"`
	ClickHouseQueries map[string]*ClickHouseQuery `json:"chQueries,omitempty"`
	PromQueries       map[string]*PromQuery       `json:"promQueries,omitempty"`
	PanelType         PanelType                   `json:"panelType"`
	QueryType         QueryType                   `json:"queryType"`
}

func (c *CompositeQuery) Validate() error {
	if c == nil {
		return nil
	}

	if c.BuilderQueries == nil && c.ClickHouseQueries == nil && c.PromQueries == nil {
		return fmt.Errorf("composite query must contain at least one query")
	}

	if c.BuilderQueries != nil {
		for name, query := range c.BuilderQueries {
			if err := query.Validate(); err != nil {
				return fmt.Errorf("builder query %s is invalid: %w", name, err)
			}
		}
	}

	if c.ClickHouseQueries != nil {
		for name, query := range c.ClickHouseQueries {
			if err := query.Validate(); err != nil {
				return fmt.Errorf("clickhouse query %s is invalid: %w", name, err)
			}
		}
	}

	if c.PromQueries != nil {
		for name, query := range c.PromQueries {
			if err := query.Validate(); err != nil {
				return fmt.Errorf("prom query %s is invalid: %w", name, err)
			}
		}
	}

	if err := c.PanelType.Validate(); err != nil {
		return fmt.Errorf("panel type is invalid: %w", err)
	}

	if err := c.QueryType.Validate(); err != nil {
		return fmt.Errorf("query type is invalid: %w", err)
	}

	return nil
}

type BuilderQuery struct {
	QueryName          string            `json:"queryName"`
	StepInterval       int64             `json:"stepInterval"`
	DataSource         DataSource        `json:"dataSource"`
	AggregateOperator  AggregateOperator `json:"aggregateOperator"`
	AggregateAttribute AttributeKey      `json:"aggregateAttribute,omitempty"`
	Filters            *FilterSet        `json:"filters,omitempty"`
	GroupBy            []AttributeKey    `json:"groupBy,omitempty"`
	Expression         string            `json:"expression"`
	Disabled           bool              `json:"disabled"`
	Having             []Having          `json:"having,omitempty"`
	Limit              uint64            `json:"limit"`
	Offset             uint64            `json:"offset"`
	PageSize           uint64            `json:"pageSize"`
	OrderBy            []OrderBy         `json:"orderBy,omitempty"`
	ReduceTo           ReduceToOperator  `json:"reduceTo,omitempty"`
	SelectColumns      []AttributeKey    `json:"selectColumns,omitempty"`
}

func (b *BuilderQuery) Validate() error {
	if b == nil {
		return nil
	}
	if b.QueryName == "" {
		return fmt.Errorf("query name is required")
	}

	// if expression is same as query name, it's a simple builder query and not a formula
	// formula involves more than one data source, aggregate operator, etc.
	if b.QueryName == b.Expression {
		if err := b.DataSource.Validate(); err != nil {
			return fmt.Errorf("data source is invalid: %w", err)
		}
		if err := b.AggregateOperator.Validate(); err != nil {
			return fmt.Errorf("aggregate operator is invalid: %w", err)
		}
		if b.AggregateAttribute == (AttributeKey{}) && b.AggregateOperator.RequireAttribute(b.DataSource) {
			return fmt.Errorf("aggregate attribute is required")
		}
	}

	if b.Filters != nil {
		if err := b.Filters.Validate(); err != nil {
			return fmt.Errorf("filters are invalid: %w", err)
		}
	}
	if b.GroupBy != nil {
		for _, groupBy := range b.GroupBy {
			if err := groupBy.Validate(); err != nil {
				return fmt.Errorf("group by is invalid %w", err)
			}
		}

		if b.DataSource == DataSourceMetrics && len(b.GroupBy) > 0 {
			if b.AggregateOperator == AggregateOperatorNoOp || b.AggregateOperator == AggregateOperatorRate {
				return fmt.Errorf("group by requires aggregate operator other than noop or rate")
			}
		}
	}

	if b.SelectColumns != nil {
		for _, selectColumn := range b.SelectColumns {
			if err := selectColumn.Validate(); err != nil {
				return fmt.Errorf("select column is invalid %w", err)
			}
		}
	}

	if b.Expression == "" {
		return fmt.Errorf("expression is required")
	}
	return nil
}

type FilterSet struct {
	Operator string       `json:"op,omitempty"`
	Items    []FilterItem `json:"items"`
}

func (f *FilterSet) Validate() error {
	if f == nil {
		return nil
	}
	if f.Operator != "" && f.Operator != "AND" && f.Operator != "OR" {
		return fmt.Errorf("operator must be AND or OR")
	}
	for _, item := range f.Items {
		if err := item.Key.Validate(); err != nil {
			return fmt.Errorf("filter item key is invalid: %w", err)
		}
	}
	return nil
}

type FilterOperator string

const (
	FilterOperatorEqual           FilterOperator = "="
	FilterOperatorNotEqual        FilterOperator = "!="
	FilterOperatorGreaterThan     FilterOperator = ">"
	FilterOperatorGreaterThanOrEq FilterOperator = ">="
	FilterOperatorLessThan        FilterOperator = "<"
	FilterOperatorLessThanOrEq    FilterOperator = "<="
	FilterOperatorIn              FilterOperator = "in"
	FilterOperatorNotIn           FilterOperator = "nin"
	FilterOperatorContains        FilterOperator = "contains"
	FilterOperatorNotContains     FilterOperator = "ncontains"
	FilterOperatorRegex           FilterOperator = "regex"
	FilterOperatorNotRegex        FilterOperator = "nregex"
	// (I)LIKE is faster than REGEX and supports index
	FilterOperatorLike    FilterOperator = "like"
	FilterOperatorNotLike FilterOperator = "nlike"

	FilterOperatorExists    FilterOperator = "exists"
	FilterOperatorNotExists FilterOperator = "nexists"
)

type FilterItem struct {
	Key      AttributeKey   `json:"key"`
	Value    interface{}    `json:"value"`
	Operator FilterOperator `json:"op"`
}

type OrderBy struct {
	ColumnName string `json:"columnName"`
	Order      string `json:"order"`
}

type Having struct {
	ColumnName string      `json:"columnName"`
	Operator   string      `json:"op"`
	Value      interface{} `json:"value"`
}

type QueryRangeResponse struct {
	ResultType string    `json:"resultType"`
	Result     []*Result `json:"result"`
}

type Result struct {
	QueryName string    `json:"queryName"`
	Series    []*Series `json:"series"`
	List      []*Row    `json:"list"`
}

type Series struct {
	Labels map[string]string `json:"labels"`
	Points []Point           `json:"values"`
}

type Row struct {
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

type Point struct {
	Timestamp int64
	Value     float64
}

// MarshalJSON implements json.Marshaler.
func (p *Point) MarshalJSON() ([]byte, error) {
	v := strconv.FormatFloat(p.Value, 'f', -1, 64)
	return json.Marshal(map[string]interface{}{"timestamp": p.Timestamp, "value": v})
}

// ExploreQuery is a query for the explore page
// It is a composite query with a source page name
// The source page name is used to identify the page that initiated the query
// The source page could be "traces", "logs", "metrics" or "dashboards", "alerts" etc.
type ExplorerQuery struct {
	UUID           string          `json:"uuid,omitempty"`
	SourcePage     string          `json:"sourcePage"`
	CompositeQuery *CompositeQuery `json:"compositeQuery"`
	// ExtraData is JSON encoded data used by frontend to store additional data
	ExtraData string `json:"extraData"`
	// 0 - false, 1 - true; this is int8 because sqlite doesn't support bool
	IsView int8 `json:"isView"`
}

func (eq *ExplorerQuery) Validate() error {
	if eq.IsView != 0 && eq.IsView != 1 {
		return fmt.Errorf("isView must be 0 or 1")
	}

	if eq.CompositeQuery == nil {
		return fmt.Errorf("composite query is required")
	}

	if eq.UUID == "" {
		eq.UUID = uuid.New().String()
	}
	return eq.CompositeQuery.Validate()
}
