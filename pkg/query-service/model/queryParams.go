package model

import (
	"time"
)

type InstantQueryMetricsParams struct {
	Time  time.Time
	Query string
	Stats string
}

type QueryRangeParams struct {
	Start time.Time
	End   time.Time
	Step  time.Duration
	Query string
	Stats string
}

const (
	StringTagMapCol   = "stringTagMap"
	NumberTagMapCol   = "numberTagMap"
	BoolTagMapCol     = "boolTagMap"
	ResourceTagMapCol = "resourceTagsMap"
)

type DashboardVars struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// Metric auto complete types
type metricTags map[string]string

type MetricAutocompleteTagParams struct {
	MetricName string
	MetricTags metricTags
	Match      string
	TagKey     string
}

type GetTopOperationsParams struct {
	StartTime   string `json:"start"`
	EndTime     string `json:"end"`
	ServiceName string `json:"service"`
	Start       *time.Time
	End         *time.Time
	Tags        []TagQueryParam `json:"tags"`
	Limit       int             `json:"limit"`
}

type RegisterEventParams struct {
	EventName   string                 `json:"eventName"`
	Attributes  map[string]interface{} `json:"attributes"`
	RateLimited bool                   `json:"rateLimited"`
}

type GetUsageParams struct {
	StartTime   string
	EndTime     string
	ServiceName string
	Period      string
	StepHour    int
	Start       *time.Time
	End         *time.Time
}

type GetServicesParams struct {
	StartTime string `json:"start"`
	EndTime   string `json:"end"`
	Period    int
	Start     *time.Time
	End       *time.Time
	Tags      []TagQueryParam `json:"tags"`
}

type GetServiceOverviewParams struct {
	StartTime   string `json:"start"`
	EndTime     string `json:"end"`
	Period      string
	Start       *time.Time
	End         *time.Time
	Tags        []TagQueryParam `json:"tags"`
	ServiceName string          `json:"service"`
	StepSeconds int             `json:"step"`
}

type TagQueryParam struct {
	Key          string    `json:"key"`
	TagType      TagType   `json:"tagType"`
	StringValues []string  `json:"stringValues"`
	BoolValues   []bool    `json:"boolValues"`
	NumberValues []float64 `json:"numberValues"`
	Operator     Operator  `json:"operator"`
}

type Operator string

const (
	InOperator               Operator = "In"
	NotInOperator            Operator = "NotIn"
	EqualOperator            Operator = "Equals"
	NotEqualOperator         Operator = "NotEquals"
	ExistsOperator           Operator = "Exists"
	NotExistsOperator        Operator = "NotExists"
	ContainsOperator         Operator = "Contains"
	NotContainsOperator      Operator = "NotContains"
	LessThanOperator         Operator = "LessThan"
	GreaterThanOperator      Operator = "GreaterThan"
	LessThanEqualOperator    Operator = "LessThanEquals"
	GreaterThanEqualOperator Operator = "GreaterThanEquals"
	StartsWithOperator       Operator = "StartsWith"
	NotStartsWithOperator    Operator = "NotStartsWith"
)

type TagType string

const (
	ResourceAttributeTagType TagType = "ResourceAttribute"
	SpanAttributeTagType     TagType = "SpanAttribute"
)

type TagQuery interface {
	GetKey() string
	GetValues() []interface{}
	GetOperator() Operator
	GetTagType() TagType
	GetTagMapColumn() string
}

type TagQueryString struct {
	key      string
	values   []string
	operator Operator
	tagType  TagType
}

func NewTagQueryString(tag TagQueryParam) TagQueryString {
	return TagQueryString{
		key:      tag.Key,
		values:   tag.StringValues,
		operator: tag.Operator,
		tagType:  tag.TagType,
	}
}

func (tqn TagQueryNumber) GetKey() string {
	return tqn.key
}

func (tqs TagQueryString) GetValues() []interface{} {
	values := make([]interface{}, len(tqs.values))
	for i, v := range tqs.values {
		values[i] = v
	}
	return values
}

func (tqs TagQueryString) GetOperator() Operator {
	return tqs.operator
}

func (tqs TagQueryString) GetTagType() TagType {
	return tqs.tagType
}

func (tqs TagQueryString) GetTagMapColumn() string {
	if tqs.GetTagType() == ResourceAttributeTagType {
		return ResourceTagMapCol
	} else {
		return StringTagMapCol
	}
}

type TagQueryBool struct {
	key      string
	values   []bool
	operator Operator
	tagType  TagType
}

func NewTagQueryBool(tag TagQueryParam) TagQueryBool {
	return TagQueryBool{
		key:      tag.Key,
		values:   tag.BoolValues,
		operator: tag.Operator,
		tagType:  tag.TagType,
	}
}

func (tqb TagQueryBool) GetKey() string {
	return tqb.key
}

func (tqb TagQueryBool) GetValues() []interface{} {
	values := make([]interface{}, len(tqb.values))
	for i, v := range tqb.values {
		values[i] = v
	}
	return values
}

func (tqb TagQueryBool) GetOperator() Operator {
	return tqb.operator
}

func (tqb TagQueryBool) GetTagType() TagType {
	return tqb.tagType
}

func (tqb TagQueryBool) GetTagMapColumn() string {
	return BoolTagMapCol
}

type TagQueryNumber struct {
	key      string
	values   []float64
	operator Operator
	tagType  TagType
}

func NewTagQueryNumber(tag TagQueryParam) TagQueryNumber {
	return TagQueryNumber{
		key:      tag.Key,
		values:   tag.NumberValues,
		operator: tag.Operator,
		tagType:  tag.TagType,
	}
}

func (tqs TagQueryString) GetKey() string {
	return tqs.key
}

func (tqn TagQueryNumber) GetValues() []interface{} {
	values := make([]interface{}, len(tqn.values))
	for i, v := range tqn.values {
		values[i] = v
	}
	return values
}

func (tqn TagQueryNumber) GetOperator() Operator {
	return tqn.operator
}

func (tqn TagQueryNumber) GetTagType() TagType {
	return tqn.tagType
}

func (tqn TagQueryNumber) GetTagMapColumn() string {
	return NumberTagMapCol
}

type GetFilteredSpansParams struct {
	TraceID            []string        `json:"traceID"`
	ServiceName        []string        `json:"serviceName"`
	Operation          []string        `json:"operation"`
	SpanKind           string          `json:"spanKind"`
	Status             []string        `json:"status"`
	HttpRoute          []string        `json:"httpRoute"`
	HttpUrl            []string        `json:"httpUrl"`
	HttpHost           []string        `json:"httpHost"`
	HttpMethod         []string        `json:"httpMethod"`
	RPCMethod          []string        `json:"rpcMethod"`
	ResponseStatusCode []string        `json:"responseStatusCode"`
	StartStr           string          `json:"start"`
	EndStr             string          `json:"end"`
	MinDuration        string          `json:"minDuration"`
	MaxDuration        string          `json:"maxDuration"`
	Limit              int64           `json:"limit"`
	OrderParam         string          `json:"orderParam"`
	Order              string          `json:"order"`
	Offset             int64           `json:"offset"`
	Tags               []TagQueryParam `json:"tags"`
	Exclude            []string        `json:"exclude"`
	Start              *time.Time
	End                *time.Time
}

type GetFilteredSpanAggregatesParams struct {
	TraceID            []string        `json:"traceID"`
	ServiceName        []string        `json:"serviceName"`
	Operation          []string        `json:"operation"`
	SpanKind           string          `json:"spanKind"`
	Status             []string        `json:"status"`
	HttpRoute          []string        `json:"httpRoute"`
	HttpUrl            []string        `json:"httpUrl"`
	HttpHost           []string        `json:"httpHost"`
	HttpMethod         []string        `json:"httpMethod"`
	RPCMethod          []string        `json:"rpcMethod"`
	ResponseStatusCode []string        `json:"responseStatusCode"`
	MinDuration        string          `json:"minDuration"`
	MaxDuration        string          `json:"maxDuration"`
	Tags               []TagQueryParam `json:"tags"`
	StartStr           string          `json:"start"`
	EndStr             string          `json:"end"`
	StepSeconds        int             `json:"step"`
	Dimension          string          `json:"dimension"`
	AggregationOption  string          `json:"aggregationOption"`
	GroupBy            string          `json:"groupBy"`
	Function           string          `json:"function"`
	Exclude            []string        `json:"exclude"`
	Start              *time.Time
	End                *time.Time
}

type SearchTracesParams struct {
	TraceID          string `json:"traceId"`
	LevelUp          int    `json:"levelUp"`
	LevelDown        int    `json:"levelDown"`
	SpanID           string `json:"spanId"`
	SpansRenderLimit int    `json:"spansRenderLimit"`
	MaxSpansInTrace  int    `json:"maxSpansInTrace"`
}

type GetWaterfallSpansForTraceWithMetadataParams struct {
	SelectedSpanID              string   `json:"selectedSpanId"`
	IsSelectedSpanIDUnCollapsed bool     `json:"isSelectedSpanIDUnCollapsed"`
	UncollapsedSpans            []string `json:"uncollapsedSpans"`
}

type GetFlamegraphSpansForTraceParams struct {
	SelectedSpanID string `json:"selectedSpanId"`
}

type SpanFilterParams struct {
	TraceID            []string `json:"traceID"`
	Status             []string `json:"status"`
	ServiceName        []string `json:"serviceName"`
	SpanKind           string   `json:"spanKind"`
	HttpRoute          []string `json:"httpRoute"`
	HttpUrl            []string `json:"httpUrl"`
	HttpHost           []string `json:"httpHost"`
	HttpMethod         []string `json:"httpMethod"`
	Operation          []string `json:"operation"`
	RPCMethod          []string `json:"rpcMethod"`
	ResponseStatusCode []string `json:"responseStatusCode"`
	GetFilters         []string `json:"getFilters"`
	Exclude            []string `json:"exclude"`
	MinDuration        string   `json:"minDuration"`
	MaxDuration        string   `json:"maxDuration"`
	StartStr           string   `json:"start"`
	EndStr             string   `json:"end"`
	Start              *time.Time
	End                *time.Time
}

type TagFilterParams struct {
	TraceID            []string `json:"traceID"`
	Status             []string `json:"status"`
	ServiceName        []string `json:"serviceName"`
	HttpRoute          []string `json:"httpRoute"`
	SpanKind           string   `json:"spanKind"`
	HttpUrl            []string `json:"httpUrl"`
	HttpHost           []string `json:"httpHost"`
	HttpMethod         []string `json:"httpMethod"`
	Operation          []string `json:"operation"`
	RPCMethod          []string `json:"rpcMethod"`
	ResponseStatusCode []string `json:"responseStatusCode"`
	Exclude            []string `json:"exclude"`
	MinDuration        string   `json:"minDuration"`
	MaxDuration        string   `json:"maxDuration"`
	StartStr           string   `json:"start"`
	EndStr             string   `json:"end"`
	TagKey             TagKey   `json:"tagKey"`
	Limit              int      `json:"limit"`
	Start              *time.Time
	End                *time.Time
}

type TagDataType string

const (
	TagTypeString TagDataType = "string"
	TagTypeNumber TagDataType = "number"
	TagTypeBool   TagDataType = "bool"
)

type TagKey struct {
	Key  string      `json:"key"`
	Type TagDataType `json:"type"`
}

type TTLParams struct {
	Type                  string // It can be one of {traces, metrics}.
	ColdStorageVolume     string // Name of the cold storage volume.
	ToColdStorageDuration int64  // Seconds after which data will be moved to cold storage.
	DelDuration           int64  // Seconds after which data will be deleted.
}

type GetTTLParams struct {
	Type string
}

type ListErrorsParams struct {
	StartStr      string `json:"start"`
	EndStr        string `json:"end"`
	Start         *time.Time
	End           *time.Time
	Limit         int64           `json:"limit"`
	OrderParam    string          `json:"orderParam"`
	Order         string          `json:"order"`
	Offset        int64           `json:"offset"`
	ServiceName   string          `json:"serviceName"`
	ExceptionType string          `json:"exceptionType"`
	Tags          []TagQueryParam `json:"tags"`
}

type CountErrorsParams struct {
	StartStr      string `json:"start"`
	EndStr        string `json:"end"`
	Start         *time.Time
	End           *time.Time
	ServiceName   string          `json:"serviceName"`
	ExceptionType string          `json:"exceptionType"`
	Tags          []TagQueryParam `json:"tags"`
}

type GetErrorParams struct {
	GroupID   string
	ErrorID   string
	Timestamp *time.Time
}

type FilterItem struct {
	Key      string      `json:"key"`
	Value    interface{} `json:"value"`
	Operator string      `json:"op"`
}

type FilterSet struct {
	Operator string       `json:"op,omitempty"`
	Items    []FilterItem `json:"items"`
}

type UpdateField struct {
	Name             string `json:"name"`
	DataType         string `json:"dataType"`
	Type             string `json:"type"`
	Selected         bool   `json:"selected"`
	IndexType        string `json:"index"`
	IndexGranularity int    `json:"indexGranularity"`
}

type LogsFilterParams struct {
	Limit          int    `json:"limit"`
	OrderBy        string `json:"orderBy"`
	Order          string `json:"order"`
	Query          string `json:"q"`
	TimestampStart uint64 `json:"timestampStart"`
	TimestampEnd   uint64 `json:"timestampEnd"`
	IdGt           string `json:"idGt"`
	IdLT           string `json:"idLt"`
}

type LogsAggregateParams struct {
	Query          string `json:"q"`
	TimestampStart uint64 `json:"timestampStart"`
	TimestampEnd   uint64 `json:"timestampEnd"`
	GroupBy        string `json:"groupBy"`
	Function       string `json:"function"`
	StepSeconds    int    `json:"step"`
}
