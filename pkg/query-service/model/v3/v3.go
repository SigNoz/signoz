package v3

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.uber.org/zap"
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
			AggregateOperatorCount:
			return false
		default:
			return true
		}
	case DataSourceLogs:
		switch a {
		case AggregateOperatorNoOp,
			AggregateOperatorCount,
			AggregateOperatorRate:
			return false
		default:
			return true
		}
	case DataSourceTraces:
		switch a {
		case AggregateOperatorNoOp,
			AggregateOperatorCount,
			AggregateOperatorRate:
			return false
		default:
			return true
		}
	default:
		return false
	}
}

func (a AggregateOperator) IsRateOperator() bool {
	switch a {
	case AggregateOperatorRate,
		AggregateOperatorSumRate,
		AggregateOperatorAvgRate,
		AggregateOperatorMinRate,
		AggregateOperatorMaxRate,
		AggregateOperatorRateSum,
		AggregateOperatorRateAvg,
		AggregateOperatorRateMin,
		AggregateOperatorRateMax:
		return true

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
	PanelTypeTrace PanelType = "trace"
)

func (p PanelType) Validate() error {
	switch p {
	case PanelTypeValue, PanelTypeGraph, PanelTypeTable, PanelTypeList, PanelTypeTrace:
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
	TagTypeTag                  TagType = "tag"
	TagTypeResource             TagType = "resource"
	TagTypeInstrumentationScope TagType = "scope"
)

func (q TagType) Validate() error {
	switch q {
	case TagTypeTag, TagTypeResource, TagTypeInstrumentationScope:
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

type QBFilterSuggestionsRequest struct {
	DataSource      DataSource `json:"dataSource"`
	SearchText      string     `json:"searchText"`
	ExistingFilter  *FilterSet `json:"existingFilter"`
	AttributesLimit uint64     `json:"attributesLimit"`
	ExamplesLimit   uint64     `json:"examplesLimit"`
}

type QBFilterSuggestionsResponse struct {
	AttributeKeys  []AttributeKey `json:"attributes"`
	ExampleQueries []FilterSet    `json:"example_queries"`
}

type AttributeKeyDataType string

const (
	AttributeKeyDataTypeUnspecified  AttributeKeyDataType = ""
	AttributeKeyDataTypeString       AttributeKeyDataType = "string"
	AttributeKeyDataTypeInt64        AttributeKeyDataType = "int64"
	AttributeKeyDataTypeFloat64      AttributeKeyDataType = "float64"
	AttributeKeyDataTypeBool         AttributeKeyDataType = "bool"
	AttributeKeyDataTypeArrayString  AttributeKeyDataType = "array(string)"
	AttributeKeyDataTypeArrayInt64   AttributeKeyDataType = "array(int64)"
	AttributeKeyDataTypeArrayFloat64 AttributeKeyDataType = "array(float64)"
	AttributeKeyDataTypeArrayBool    AttributeKeyDataType = "array(bool)"
)

func (q AttributeKeyDataType) Validate() error {
	switch q {
	case AttributeKeyDataTypeString, AttributeKeyDataTypeInt64, AttributeKeyDataTypeFloat64, AttributeKeyDataTypeBool:
		return nil
	default:
		return fmt.Errorf("invalid tag data type: %s", q)
	}
}

func (q AttributeKeyDataType) String() string {
	return string(q)
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
	AttributeKeyTypeUnspecified          AttributeKeyType = ""
	AttributeKeyTypeTag                  AttributeKeyType = "tag"
	AttributeKeyTypeResource             AttributeKeyType = "resource"
	AttributeKeyTypeInstrumentationScope AttributeKeyType = "scope"
	AttributeKeyTypeSpanSearchScope      AttributeKeyType = "spanSearchScope"
)

func (t AttributeKeyType) String() string {
	return string(t)
}

type AttributeKey struct {
	Key      string               `json:"key"`
	DataType AttributeKeyDataType `json:"dataType"`
	Type     AttributeKeyType     `json:"type"`
	IsColumn bool                 `json:"isColumn"`
	IsJSON   bool                 `json:"isJSON"`
}

func (a AttributeKey) CacheKey() string {
	return fmt.Sprintf("%s-%s-%s-%t", a.Key, a.DataType, a.Type, a.IsColumn)
}

func (a AttributeKey) Validate() error {
	switch a.DataType {
	case AttributeKeyDataTypeBool, AttributeKeyDataTypeInt64, AttributeKeyDataTypeFloat64, AttributeKeyDataTypeString, AttributeKeyDataTypeArrayFloat64, AttributeKeyDataTypeArrayString, AttributeKeyDataTypeArrayInt64, AttributeKeyDataTypeArrayBool, AttributeKeyDataTypeUnspecified:
		break
	default:
		return fmt.Errorf("invalid attribute dataType: %s", a.DataType)
	}

	if a.IsColumn {
		switch a.Type {
		case AttributeKeyTypeResource, AttributeKeyTypeTag, AttributeKeyTypeUnspecified, AttributeKeyTypeInstrumentationScope:
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
	Step           int64                  `json:"step"` // step is in seconds; used for prometheus queries
	CompositeQuery *CompositeQuery        `json:"compositeQuery"`
	Variables      map[string]interface{} `json:"variables,omitempty"`
	NoCache        bool                   `json:"noCache"`
	Version        string                 `json:"-"`
	FormatForWeb   bool                   `json:"formatForWeb,omitempty"`
}

func (q *QueryRangeParamsV3) Clone() *QueryRangeParamsV3 {
	if q == nil {
		return nil
	}
	return &QueryRangeParamsV3{
		Start:          q.Start,
		End:            q.End,
		Step:           q.Step,
		CompositeQuery: q.CompositeQuery.Clone(),
		Variables:      q.Variables,
		NoCache:        q.NoCache,
		Version:        q.Version,
		FormatForWeb:   q.FormatForWeb,
	}
}

type PromQuery struct {
	Query    string `json:"query"`
	Stats    string `json:"stats,omitempty"`
	Disabled bool   `json:"disabled"`
	Legend   string `json:"legend,omitempty"`
}

func (p *PromQuery) Clone() *PromQuery {
	if p == nil {
		return nil
	}
	return &PromQuery{
		Query:    p.Query,
		Stats:    p.Stats,
		Disabled: p.Disabled,
		Legend:   p.Legend,
	}
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
	Legend   string `json:"legend,omitempty"`
}

func (c *ClickHouseQuery) Clone() *ClickHouseQuery {
	if c == nil {
		return nil
	}
	return &ClickHouseQuery{
		Query:    c.Query,
		Disabled: c.Disabled,
		Legend:   c.Legend,
	}
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
	// Unit for the time series data shown in the graph
	// This is used in alerts to format the value and threshold
	Unit string `json:"unit,omitempty"`
	// FillGaps is used to fill the gaps in the time series data
	FillGaps bool `json:"fillGaps,omitempty"`
}

func (c *CompositeQuery) Clone() *CompositeQuery {
	if c == nil {
		return nil
	}
	var builderQueries map[string]*BuilderQuery
	if c.BuilderQueries != nil {
		builderQueries = make(map[string]*BuilderQuery)
		for name, query := range c.BuilderQueries {
			builderQueries[name] = query.Clone()
		}
	}
	var clickHouseQueries map[string]*ClickHouseQuery
	if c.ClickHouseQueries != nil {
		clickHouseQueries = make(map[string]*ClickHouseQuery)
		for name, query := range c.ClickHouseQueries {
			clickHouseQueries[name] = query.Clone()
		}
	}
	var promQueries map[string]*PromQuery
	if c.PromQueries != nil {
		promQueries = make(map[string]*PromQuery)
		for name, query := range c.PromQueries {
			promQueries[name] = query.Clone()
		}
	}
	return &CompositeQuery{
		BuilderQueries:    builderQueries,
		ClickHouseQueries: clickHouseQueries,
		PromQueries:       promQueries,
		PanelType:         c.PanelType,
		QueryType:         c.QueryType,
		Unit:              c.Unit,
		FillGaps:          c.FillGaps,
	}

}

func (c *CompositeQuery) EnabledQueries() int {
	count := 0
	switch c.QueryType {
	case QueryTypeBuilder:
		for _, query := range c.BuilderQueries {
			if !query.Disabled {
				count++
			}
		}
	case QueryTypeClickHouseSQL:
		for _, query := range c.ClickHouseQueries {
			if !query.Disabled {
				count++
			}
		}
	case QueryTypePromQL:
		for _, query := range c.PromQueries {
			if !query.Disabled {
				count++
			}
		}
	}
	return count
}

func (c *CompositeQuery) Sanitize() {
	if c == nil {
		return
	}
	// remove groupBy for queries with list panel type
	for _, query := range c.BuilderQueries {
		if len(query.GroupBy) > 0 && c.PanelType == PanelTypeList {
			query.GroupBy = []AttributeKey{}
		}
	}
}

func (c *CompositeQuery) Validate() error {
	if c == nil {
		return fmt.Errorf("composite query is required")
	}

	if c.BuilderQueries == nil && c.ClickHouseQueries == nil && c.PromQueries == nil {
		return fmt.Errorf("composite query must contain at least one query type")
	}

	if c.QueryType == QueryTypeBuilder {
		for name, query := range c.BuilderQueries {
			if err := query.Validate(c.PanelType); err != nil {
				return fmt.Errorf("builder query %s is invalid: %w", name, err)
			}
		}
	}

	if c.QueryType == QueryTypeClickHouseSQL {
		for name, query := range c.ClickHouseQueries {
			if err := query.Validate(); err != nil {
				return fmt.Errorf("clickhouse query %s is invalid: %w", name, err)
			}
		}
	}

	if c.QueryType == QueryTypePromQL {
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

type Temporality string

const (
	Unspecified Temporality = "Unspecified"
	Delta       Temporality = "Delta"
	Cumulative  Temporality = "Cumulative"
)

type TimeAggregation string

const (
	TimeAggregationUnspecified   TimeAggregation = ""
	TimeAggregationAnyLast       TimeAggregation = "latest"
	TimeAggregationSum           TimeAggregation = "sum"
	TimeAggregationAvg           TimeAggregation = "avg"
	TimeAggregationMin           TimeAggregation = "min"
	TimeAggregationMax           TimeAggregation = "max"
	TimeAggregationCount         TimeAggregation = "count"
	TimeAggregationCountDistinct TimeAggregation = "count_distinct"
	TimeAggregationRate          TimeAggregation = "rate"
	TimeAggregationIncrease      TimeAggregation = "increase"
)

func (t TimeAggregation) Validate() error {
	switch t {
	case TimeAggregationAnyLast,
		TimeAggregationSum,
		TimeAggregationAvg,
		TimeAggregationMin,
		TimeAggregationMax,
		TimeAggregationCount,
		TimeAggregationCountDistinct,
		TimeAggregationRate,
		TimeAggregationIncrease:
		return nil
	default:
		return fmt.Errorf("invalid time aggregation: %s", t)
	}
}

func (t TimeAggregation) IsRateOperator() bool {
	switch t {
	case TimeAggregationRate, TimeAggregationIncrease:
		return true
	default:
		return false
	}
}

type MetricType string

const (
	MetricTypeUnspecified          MetricType = ""
	MetricTypeSum                  MetricType = "Sum"
	MetricTypeGauge                MetricType = "Gauge"
	MetricTypeHistogram            MetricType = "Histogram"
	MetricTypeSummary              MetricType = "Summary"
	MetricTypeExponentialHistogram MetricType = "ExponentialHistogram"
)

type SpaceAggregation string

const (
	SpaceAggregationUnspecified  SpaceAggregation = ""
	SpaceAggregationSum          SpaceAggregation = "sum"
	SpaceAggregationAvg          SpaceAggregation = "avg"
	SpaceAggregationMin          SpaceAggregation = "min"
	SpaceAggregationMax          SpaceAggregation = "max"
	SpaceAggregationCount        SpaceAggregation = "count"
	SpaceAggregationPercentile50 SpaceAggregation = "p50"
	SpaceAggregationPercentile75 SpaceAggregation = "p75"
	SpaceAggregationPercentile90 SpaceAggregation = "p90"
	SpaceAggregationPercentile95 SpaceAggregation = "p95"
	SpaceAggregationPercentile99 SpaceAggregation = "p99"
)

func (s SpaceAggregation) Validate() error {
	switch s {
	case SpaceAggregationSum,
		SpaceAggregationAvg,
		SpaceAggregationMin,
		SpaceAggregationMax,
		SpaceAggregationCount,
		SpaceAggregationPercentile50,
		SpaceAggregationPercentile75,
		SpaceAggregationPercentile90,
		SpaceAggregationPercentile95,
		SpaceAggregationPercentile99:
		return nil
	default:
		return fmt.Errorf("invalid space aggregation: %s", s)
	}
}

func IsPercentileOperator(operator SpaceAggregation) bool {
	switch operator {
	case SpaceAggregationPercentile50,
		SpaceAggregationPercentile75,
		SpaceAggregationPercentile90,
		SpaceAggregationPercentile95,
		SpaceAggregationPercentile99:
		return true
	default:
		return false
	}
}

func GetPercentileFromOperator(operator SpaceAggregation) float64 {
	// This could be done with a map, but it's just easier to read this way
	switch operator {
	case SpaceAggregationPercentile50:
		return 0.5
	case SpaceAggregationPercentile75:
		return 0.75
	case SpaceAggregationPercentile90:
		return 0.9
	case SpaceAggregationPercentile95:
		return 0.95
	case SpaceAggregationPercentile99:
		return 0.99
	default:
		return 0
	}
}

type SecondaryAggregation string

const (
	SecondaryAggregationUnspecified SecondaryAggregation = ""
	SecondaryAggregationSum         SecondaryAggregation = "sum"
	SecondaryAggregationAvg         SecondaryAggregation = "avg"
	SecondaryAggregationMin         SecondaryAggregation = "min"
	SecondaryAggregationMax         SecondaryAggregation = "max"
)

func (s SecondaryAggregation) Validate() error {
	switch s {
	case SecondaryAggregationSum,
		SecondaryAggregationAvg,
		SecondaryAggregationMin,
		SecondaryAggregationMax:
		return nil
	default:
		return fmt.Errorf("invalid series aggregation: %s", s)
	}
}

type FunctionName string

const (
	FunctionNameCutOffMin   FunctionName = "cutOffMin"
	FunctionNameCutOffMax   FunctionName = "cutOffMax"
	FunctionNameClampMin    FunctionName = "clampMin"
	FunctionNameClampMax    FunctionName = "clampMax"
	FunctionNameAbsolute    FunctionName = "absolute"
	FunctionNameRunningDiff FunctionName = "runningDiff"
	FunctionNameLog2        FunctionName = "log2"
	FunctionNameLog10       FunctionName = "log10"
	FunctionNameCumSum      FunctionName = "cumSum"
	FunctionNameEWMA3       FunctionName = "ewma3"
	FunctionNameEWMA5       FunctionName = "ewma5"
	FunctionNameEWMA7       FunctionName = "ewma7"
	FunctionNameMedian3     FunctionName = "median3"
	FunctionNameMedian5     FunctionName = "median5"
	FunctionNameMedian7     FunctionName = "median7"
	FunctionNameTimeShift   FunctionName = "timeShift"
	FunctionNameAnomaly     FunctionName = "anomaly"
)

func (f FunctionName) Validate() error {
	switch f {
	case FunctionNameCutOffMin,
		FunctionNameCutOffMax,
		FunctionNameClampMin,
		FunctionNameClampMax,
		FunctionNameAbsolute,
		FunctionNameRunningDiff,
		FunctionNameLog2,
		FunctionNameLog10,
		FunctionNameCumSum,
		FunctionNameEWMA3,
		FunctionNameEWMA5,
		FunctionNameEWMA7,
		FunctionNameMedian3,
		FunctionNameMedian5,
		FunctionNameMedian7,
		FunctionNameTimeShift,
		FunctionNameAnomaly:
		return nil
	default:
		return fmt.Errorf("invalid function name: %s", f)
	}
}

type Function struct {
	Name      FunctionName           `json:"name"`
	Args      []interface{}          `json:"args,omitempty"`
	NamedArgs map[string]interface{} `json:"namedArgs,omitempty"`
}

type MetricTableHints struct {
	TimeSeriesTableName string
	SamplesTableName    string
}

type MetricValueFilter struct {
	Value float64
}

func (m *MetricValueFilter) Clone() *MetricValueFilter {
	if m == nil {
		return nil
	}
	return &MetricValueFilter{
		Value: m.Value,
	}
}

type BuilderQuery struct {
	QueryName            string               `json:"queryName"`
	StepInterval         int64                `json:"stepInterval"`
	DataSource           DataSource           `json:"dataSource"`
	AggregateOperator    AggregateOperator    `json:"aggregateOperator"`
	AggregateAttribute   AttributeKey         `json:"aggregateAttribute,omitempty"`
	Temporality          Temporality          `json:"temporality,omitempty"`
	Filters              *FilterSet           `json:"filters,omitempty"`
	GroupBy              []AttributeKey       `json:"groupBy,omitempty"`
	Expression           string               `json:"expression"`
	Disabled             bool                 `json:"disabled"`
	Having               []Having             `json:"having,omitempty"`
	Legend               string               `json:"legend,omitempty"`
	Limit                uint64               `json:"limit"`
	Offset               uint64               `json:"offset"`
	PageSize             uint64               `json:"pageSize"`
	OrderBy              []OrderBy            `json:"orderBy,omitempty"`
	ReduceTo             ReduceToOperator     `json:"reduceTo,omitempty"`
	SelectColumns        []AttributeKey       `json:"selectColumns,omitempty"`
	TimeAggregation      TimeAggregation      `json:"timeAggregation,omitempty"`
	SpaceAggregation     SpaceAggregation     `json:"spaceAggregation,omitempty"`
	SecondaryAggregation SecondaryAggregation `json:"seriesAggregation,omitempty"`
	Functions            []Function           `json:"functions,omitempty"`
	ShiftBy              int64
	IsAnomaly            bool
	QueriesUsedInFormula []string
	MetricTableHints     *MetricTableHints  `json:"-"`
	MetricValueFilter    *MetricValueFilter `json:"-"`
}

func (b *BuilderQuery) SetShiftByFromFunc() {
	// Remove the time shift function from the list of functions and set the shift by value
	var timeShiftBy int64
	if len(b.Functions) > 0 {
		for idx := range b.Functions {
			function := &b.Functions[idx]
			if function.Name == FunctionNameTimeShift {
				// move the function to the beginning of the list
				// so any other function can use the shifted time
				var fns []Function
				fns = append(fns, *function)
				fns = append(fns, b.Functions[:idx]...)
				fns = append(fns, b.Functions[idx+1:]...)
				b.Functions = fns
				if len(function.Args) > 0 {
					if shift, ok := function.Args[0].(float64); ok {
						timeShiftBy = int64(shift)
					} else if shift, ok := function.Args[0].(string); ok {
						shiftBy, err := strconv.ParseFloat(shift, 64)
						if err != nil {
							zap.L().Error("failed to parse time shift by", zap.String("shift", shift), zap.Error(err))
						}
						timeShiftBy = int64(shiftBy)
					}
				}
				break
			}
		}
	}
	b.ShiftBy = timeShiftBy
}

func (b *BuilderQuery) Clone() *BuilderQuery {
	if b == nil {
		return nil
	}
	return &BuilderQuery{
		QueryName:            b.QueryName,
		StepInterval:         b.StepInterval,
		DataSource:           b.DataSource,
		AggregateOperator:    b.AggregateOperator,
		AggregateAttribute:   b.AggregateAttribute,
		Temporality:          b.Temporality,
		Filters:              b.Filters.Clone(),
		GroupBy:              b.GroupBy,
		Expression:           b.Expression,
		Disabled:             b.Disabled,
		Having:               b.Having,
		Legend:               b.Legend,
		Limit:                b.Limit,
		Offset:               b.Offset,
		PageSize:             b.PageSize,
		OrderBy:              b.OrderBy,
		ReduceTo:             b.ReduceTo,
		SelectColumns:        b.SelectColumns,
		TimeAggregation:      b.TimeAggregation,
		SpaceAggregation:     b.SpaceAggregation,
		Functions:            b.Functions,
		ShiftBy:              b.ShiftBy,
		IsAnomaly:            b.IsAnomaly,
		QueriesUsedInFormula: b.QueriesUsedInFormula,
		MetricValueFilter:    b.MetricValueFilter.Clone(),
	}
}

// CanDefaultZero returns true if the missing value can be substituted by zero
// For example, for an aggregation window [Tx - Tx+1], with an aggregation operator `count`
// The lack of data can always be interpreted as zero. No data for requests count = zero requests
// This is true for all aggregations that have `count`ing involved.
//
// The same can't be true for others, `sum` of no values doesn't necessarily mean zero.
// We can't decide whether or not should it be zero.
func (b *BuilderQuery) CanDefaultZero() bool {
	switch b.DataSource {
	case DataSourceMetrics:
		if b.AggregateOperator.IsRateOperator() ||
			b.TimeAggregation.IsRateOperator() ||
			b.AggregateOperator == AggregateOperatorCount ||
			b.AggregateOperator == AggregateOperatorCountDistinct ||
			b.TimeAggregation == TimeAggregationCount ||
			b.TimeAggregation == TimeAggregationCountDistinct {
			return true
		}
	case DataSourceTraces, DataSourceLogs:
		if b.AggregateOperator.IsRateOperator() ||
			b.AggregateOperator == AggregateOperatorCount ||
			b.AggregateOperator == AggregateOperatorCountDistinct {
			return true
		}
	}
	return false
}

func (b *BuilderQuery) Validate(panelType PanelType) error {
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
		if b.DataSource == DataSourceMetrics {
			// if AggregateOperator is specified, then the request is using v3 payload
			// if b.AggregateOperator != "" && b.SpaceAggregation == SpaceAggregationUnspecified {
			// 	if err := b.AggregateOperator.Validate(); err != nil {
			// 		return fmt.Errorf("aggregate operator is invalid: %w", err)
			// 	}
			// } else {
			// 	// the time aggregation is not needed for percentile operators
			// 	if !IsPercentileOperator(b.SpaceAggregation) {
			// 		if err := b.TimeAggregation.Validate(); err != nil {
			// 			return fmt.Errorf("time aggregation is invalid: %w", err)
			// 		}
			// 	}

			// 	if err := b.SpaceAggregation.Validate(); err != nil {
			// 		return fmt.Errorf("space aggregation is invalid: %w", err)
			// 	}
			// }
		} else {
			if err := b.AggregateOperator.Validate(); err != nil {
				return fmt.Errorf("aggregate operator is invalid: %w", err)
			}
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
		// if len(b.GroupBy) > 0 && panelType == PanelTypeList {
		// 	return fmt.Errorf("group by is not supported for list panel type")
		// }

		if panelType == PanelTypeValue && len(b.GroupBy) > 0 {
			if err := b.SecondaryAggregation.Validate(); err != nil {
				return fmt.Errorf("series aggregation is required for value type panel with group by: %w", err)
			}
		}

		for _, groupBy := range b.GroupBy {
			if err := groupBy.Validate(); err != nil {
				return fmt.Errorf("group by is invalid %w", err)
			}
		}

		if b.DataSource == DataSourceMetrics && len(b.GroupBy) > 0 && b.SpaceAggregation == SpaceAggregationUnspecified {
			if b.AggregateOperator == AggregateOperatorNoOp || b.AggregateOperator == AggregateOperatorRate {
				return fmt.Errorf("group by requires aggregate operator other than noop or rate")
			}
		}
	}

	if b.Having != nil {
		for _, having := range b.Having {
			if err := having.Operator.Validate(); err != nil {
				return fmt.Errorf("having operator is invalid: %w", err)
			}
		}
	}

	for _, selectColumn := range b.SelectColumns {
		if err := selectColumn.Validate(); err != nil {
			return fmt.Errorf("select column is invalid %w", err)
		}
	}

	if b.Expression == "" {
		return fmt.Errorf("expression is required")
	}

	if len(b.Functions) > 0 {
		for _, function := range b.Functions {
			if err := function.Name.Validate(); err != nil {
				return fmt.Errorf("function name is invalid: %w", err)
			}
			if function.Name == FunctionNameTimeShift {
				if len(function.Args) == 0 {
					return fmt.Errorf("timeShiftBy param missing in query")
				}
				_, ok := function.Args[0].(float64)
				if !ok {
					// if string, attempt to convert to float
					timeShiftBy, err := strconv.ParseFloat(function.Args[0].(string), 64)
					if err != nil {
						return fmt.Errorf("timeShiftBy param should be a number")
					}
					function.Args[0] = timeShiftBy
				}
			} else if function.Name == FunctionNameEWMA3 ||
				function.Name == FunctionNameEWMA5 ||
				function.Name == FunctionNameEWMA7 {
				if len(function.Args) == 0 {
					return fmt.Errorf("alpha param missing in query")
				}
				alpha, ok := function.Args[0].(float64)
				if !ok {
					// if string, attempt to convert to float
					alpha, err := strconv.ParseFloat(function.Args[0].(string), 64)
					if err != nil {
						return fmt.Errorf("alpha param should be a float")
					}
					function.Args[0] = alpha
				}
				if alpha < 0 || alpha > 1 {
					return fmt.Errorf("alpha param should be between 0 and 1")
				}
			} else if function.Name == FunctionNameCutOffMax ||
				function.Name == FunctionNameCutOffMin ||
				function.Name == FunctionNameClampMax ||
				function.Name == FunctionNameClampMin {
				if len(function.Args) == 0 {
					return fmt.Errorf("threshold param missing in query")
				}
				_, ok := function.Args[0].(float64)
				if !ok {
					// if string, attempt to convert to float
					threshold, err := strconv.ParseFloat(function.Args[0].(string), 64)
					if err != nil {
						return fmt.Errorf("threshold param should be a float")
					}
					function.Args[0] = threshold
				}
			}
		}
	}

	return nil
}

type FilterSet struct {
	Operator string       `json:"op,omitempty"`
	Items    []FilterItem `json:"items"`
}

func (f *FilterSet) Clone() *FilterSet {
	if f == nil {
		return nil
	}
	return &FilterSet{
		Operator: f.Operator,
		Items:    f.Items,
	}
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

// For serializing to and from db
func (f *FilterSet) Scan(src interface{}) error {
	if data, ok := src.([]byte); ok {
		return json.Unmarshal(data, &f)
	}
	return nil
}

func (f *FilterSet) Value() (driver.Value, error) {
	filterSetJson, err := json.Marshal(f)
	if err != nil {
		return nil, errors.Wrap(err, "could not serialize FilterSet to JSON")
	}
	return filterSetJson, nil
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
	// (I)LIKE is faster than REGEX
	// ilike doesn't support index so internally we use lower(body) like for query
	FilterOperatorLike    FilterOperator = "like"
	FilterOperatorNotLike FilterOperator = "nlike"

	FilterOperatorExists    FilterOperator = "exists"
	FilterOperatorNotExists FilterOperator = "nexists"

	FilterOperatorHas    FilterOperator = "has"
	FilterOperatorNotHas FilterOperator = "nhas"
)

type FilterItem struct {
	Key      AttributeKey   `json:"key"`
	Value    interface{}    `json:"value"`
	Operator FilterOperator `json:"op"`
}

func (f *FilterItem) CacheKey() string {
	return fmt.Sprintf("key:%s,op:%s,value:%v", f.Key.CacheKey(), f.Operator, f.Value)
}

type Direction string

const (
	DirectionAsc  Direction = "asc"
	DirectionDesc Direction = "desc"
)

type OrderBy struct {
	ColumnName string               `json:"columnName"`
	Order      Direction            `json:"order"`
	Key        string               `json:"-"`
	DataType   AttributeKeyDataType `json:"-"`
	Type       AttributeKeyType     `json:"-"`
	IsColumn   bool                 `json:"-"`
}

func (o OrderBy) CacheKey() string {
	return fmt.Sprintf("%s-%s", o.ColumnName, o.Order)
}

// See HAVING_OPERATORS in queryBuilder.ts

type HavingOperator string

const (
	HavingOperatorEqual           HavingOperator = "="
	HavingOperatorNotEqual        HavingOperator = "!="
	HavingOperatorGreaterThan     HavingOperator = ">"
	HavingOperatorGreaterThanOrEq HavingOperator = ">="
	HavingOperatorLessThan        HavingOperator = "<"
	HavingOperatorLessThanOrEq    HavingOperator = "<="
	HavingOperatorIn              HavingOperator = "IN"
	HavingOperatorNotIn           HavingOperator = "NOT_IN"
)

func (h HavingOperator) Validate() error {
	switch h {
	case HavingOperatorEqual,
		HavingOperatorNotEqual,
		HavingOperatorGreaterThan,
		HavingOperatorGreaterThanOrEq,
		HavingOperatorLessThan,
		HavingOperatorLessThanOrEq,
		HavingOperatorIn,
		HavingOperatorNotIn,
		HavingOperator(strings.ToLower(string(HavingOperatorIn))),
		HavingOperator(strings.ToLower(string(HavingOperatorNotIn))):
		return nil
	default:
		return fmt.Errorf("invalid having operator: %s", h)
	}
}

type Having struct {
	ColumnName string         `json:"columnName"`
	Operator   HavingOperator `json:"op"`
	Value      interface{}    `json:"value"`
}

func (h *Having) CacheKey() string {
	return fmt.Sprintf("column:%s,op:%s,value:%v", h.ColumnName, h.Operator, h.Value)
}

type QueryRangeResponse struct {
	ContextTimeout        bool      `json:"contextTimeout,omitempty"`
	ContextTimeoutMessage string    `json:"contextTimeoutMessage,omitempty"`
	ResultType            string    `json:"resultType"`
	Result                []*Result `json:"result"`
}

type TableColumn struct {
	Name string `json:"name"`
	// QueryName is the name of the query that this column belongs to
	QueryName string `json:"queryName"`
	// IsValueColumn is true if this column is a value column
	// i.e it is the column that contains the actual value that is being plotted
	IsValueColumn bool `json:"isValueColumn"`
}

type TableRow struct {
	Data      map[string]interface{} `json:"data"`
	QueryName string                 `json:"-"`
}

type Table struct {
	Columns []*TableColumn `json:"columns"`
	Rows    []*TableRow    `json:"rows"`
}

type Result struct {
	QueryName        string    `json:"queryName,omitempty"`
	Series           []*Series `json:"series,omitempty"`
	PredictedSeries  []*Series `json:"predictedSeries,omitempty"`
	UpperBoundSeries []*Series `json:"upperBoundSeries,omitempty"`
	LowerBoundSeries []*Series `json:"lowerBoundSeries,omitempty"`
	AnomalyScores    []*Series `json:"anomalyScores,omitempty"`
	List             []*Row    `json:"list,omitempty"`
	Table            *Table    `json:"table,omitempty"`
}

type Series struct {
	Labels      map[string]string   `json:"labels"`
	LabelsArray []map[string]string `json:"labelsArray"`
	Points      []Point             `json:"values"`
}

func (s *Series) SortPoints() {
	sort.Slice(s.Points, func(i, j int) bool {
		return s.Points[i].Timestamp < s.Points[j].Timestamp
	})
}

func (s *Series) RemoveDuplicatePoints() {
	if len(s.Points) == 0 {
		return
	}

	// priortize the last point
	// this is to handle the case where the same point is sent twice
	// the last point is the most recent point adjusted for the flux interval

	newPoints := make([]Point, 0)
	for i := len(s.Points) - 1; i >= 0; i-- {
		if len(newPoints) == 0 {
			newPoints = append(newPoints, s.Points[i])
			continue
		}
		if newPoints[len(newPoints)-1].Timestamp != s.Points[i].Timestamp {
			newPoints = append(newPoints, s.Points[i])
		}
	}

	// reverse the points
	for i := len(newPoints)/2 - 1; i >= 0; i-- {
		opp := len(newPoints) - 1 - i
		newPoints[i], newPoints[opp] = newPoints[opp], newPoints[i]
	}

	s.Points = newPoints
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

// UnmarshalJSON implements json.Unmarshaler.
func (p *Point) UnmarshalJSON(data []byte) error {
	var v struct {
		Timestamp int64  `json:"timestamp"`
		Value     string `json:"value"`
	}
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}
	p.Timestamp = v.Timestamp
	var err error
	p.Value, err = strconv.ParseFloat(v.Value, 64)
	return err
}

// SavedView is a saved query for the explore page
// It is a composite query with a source page name and user defined tags
// The source page name is used to identify the page that initiated the query
// The source page could be "traces", "logs", "metrics".
type SavedView struct {
	UUID           string          `json:"uuid,omitempty"`
	Name           string          `json:"name"`
	Category       string          `json:"category"`
	CreatedAt      time.Time       `json:"createdAt"`
	CreatedBy      string          `json:"createdBy"`
	UpdatedAt      time.Time       `json:"updatedAt"`
	UpdatedBy      string          `json:"updatedBy"`
	SourcePage     string          `json:"sourcePage"`
	Tags           []string        `json:"tags"`
	CompositeQuery *CompositeQuery `json:"compositeQuery"`
	// ExtraData is JSON encoded data used by frontend to store additional data
	ExtraData string `json:"extraData"`
}

func (eq *SavedView) Validate() error {

	if eq.CompositeQuery == nil {
		return fmt.Errorf("composite query is required")
	}

	if eq.UUID == "" {
		eq.UUID = uuid.New().String()
	}
	return eq.CompositeQuery.Validate()
}

type LatencyMetricMetadataResponse struct {
	Delta bool      `json:"delta"`
	Le    []float64 `json:"le"`
}

type MetricMetadataResponse struct {
	Delta       bool      `json:"delta"`
	Le          []float64 `json:"le"`
	Description string    `json:"description"`
	Unit        string    `json:"unit"`
	Type        string    `json:"type"`
	IsMonotonic bool      `json:"isMonotonic"`
	Temporality string    `json:"temporality"`
}

type URLShareableTimeRange struct {
	Start    int64 `json:"start"`
	End      int64 `json:"end"`
	PageSize int64 `json:"pageSize"`
}

type URLShareableBuilderQuery struct {
	QueryData     []BuilderQuery `json:"queryData"`
	QueryFormulas []string       `json:"queryFormulas"`
}

type URLShareableCompositeQuery struct {
	QueryType string                   `json:"queryType"`
	Builder   URLShareableBuilderQuery `json:"builder"`
}

type URLShareableOptions struct {
	MaxLines      int            `json:"maxLines"`
	Format        string         `json:"format"`
	SelectColumns []AttributeKey `json:"selectColumns"`
}

type QBOptions struct {
	GraphLimitQtype string
	IsLivetailQuery bool
	PreferRPM       bool
}
