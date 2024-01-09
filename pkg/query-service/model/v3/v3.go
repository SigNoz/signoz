package v3

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.signoz.io/signoz/pkg/query-service/model"
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
		case AttributeKeyTypeResource, AttributeKeyTypeTag, AttributeKeyTypeUnspecified:
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
}

type PromQuery struct {
	Query    string `json:"query"`
	Stats    string `json:"stats,omitempty"`
	Disabled bool   `json:"disabled"`
	Legend   string `json:"legend,omitempty"`
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
	Unit              string                      `json:"unit,omitempty"`
}

func (c *CompositeQuery) Validate() error {
	if c == nil {
		return nil
	}

	if c.BuilderQueries == nil && c.ClickHouseQueries == nil && c.PromQueries == nil {
		return fmt.Errorf("composite query must contain at least one query")
	}

	for name, query := range c.BuilderQueries {
		if err := query.Validate(); err != nil {
			return fmt.Errorf("builder query %s is invalid: %w", name, err)
		}
	}

	for name, query := range c.ClickHouseQueries {
		if err := query.Validate(); err != nil {
			return fmt.Errorf("clickhouse query %s is invalid: %w", name, err)
		}
	}

	for name, query := range c.PromQueries {
		if err := query.Validate(); err != nil {
			return fmt.Errorf("prom query %s is invalid: %w", name, err)
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

type SpaceAggregation string

const (
	SpaceAggregationUnspecified SpaceAggregation = ""
	SpaceAggregationSum         SpaceAggregation = "sum"
	SpaceAggregationAvg         SpaceAggregation = "avg"
	SpaceAggregationMin         SpaceAggregation = "min"
	SpaceAggregationMax         SpaceAggregation = "max"
	SpaceAggregationCount       SpaceAggregation = "count"
)

type Function struct {
	Category string        `json:"category"`
	Name     string        `json:"name"`
	Args     []interface{} `json:"args,omitempty"`
}

type BuilderQuery struct {
	QueryName          string            `json:"queryName"`
	StepInterval       int64             `json:"stepInterval"`
	DataSource         DataSource        `json:"dataSource"`
	AggregateOperator  AggregateOperator `json:"aggregateOperator"`
	AggregateAttribute AttributeKey      `json:"aggregateAttribute,omitempty"`
	Temporality        Temporality       `json:"temporality,omitempty"`
	Filters            *FilterSet        `json:"filters,omitempty"`
	GroupBy            []AttributeKey    `json:"groupBy,omitempty"`
	Expression         string            `json:"expression"`
	Disabled           bool              `json:"disabled"`
	Having             []Having          `json:"having,omitempty"`
	Legend             string            `json:"legend,omitempty"`
	Limit              uint64            `json:"limit"`
	Offset             uint64            `json:"offset"`
	PageSize           uint64            `json:"pageSize"`
	OrderBy            []OrderBy         `json:"orderBy,omitempty"`
	ReduceTo           ReduceToOperator  `json:"reduceTo,omitempty"`
	SelectColumns      []AttributeKey    `json:"selectColumns,omitempty"`
	TimeAggregation    TimeAggregation   `json:"timeAggregation,omitempty"`
	SpaceAggregation   SpaceAggregation  `json:"spaceAggregation,omitempty"`
	Functions          []Function        `json:"functions,omitempty"`
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

	for _, selectColumn := range b.SelectColumns {
		if err := selectColumn.Validate(); err != nil {
			return fmt.Errorf("select column is invalid %w", err)
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
	// (I)LIKE is faster than REGEX and supports index
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

type OrderBy struct {
	ColumnName string               `json:"columnName"`
	Order      string               `json:"order"`
	Key        string               `json:"-"`
	DataType   AttributeKeyDataType `json:"-"`
	Type       AttributeKeyType     `json:"-"`
	IsColumn   bool                 `json:"-"`
}

type Having struct {
	ColumnName string      `json:"columnName"`
	Operator   string      `json:"op"`
	Value      interface{} `json:"value"`
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

type Result struct {
	QueryName string    `json:"queryName"`
	Series    []*Series `json:"series"`
	List      []*Row    `json:"list"`
}

type LogsLiveTailClient struct {
	Name  string
	Logs  chan *model.SignozLog
	Done  chan *bool
	Error chan error
}

type Series struct {
	Labels            map[string]string   `json:"labels"`
	LabelsArray       []map[string]string `json:"labelsArray"`
	Points            []Point             `json:"values"`
	GroupingSetsPoint *Point              `json:"-"`
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
