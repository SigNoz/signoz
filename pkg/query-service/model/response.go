package model

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"time"

	"github.com/pkg/errors"
	"github.com/prometheus/prometheus/promql/parser"
	"github.com/prometheus/prometheus/util/stats"
	"k8s.io/apimachinery/pkg/labels"
)

type BaseApiError interface {
	Type() ErrorType
	ToError() error
	Error() string
	IsNil() bool
}

type ApiError struct {
	Typ ErrorType
	Err error
}

func (a *ApiError) Type() ErrorType {
	return a.Typ
}

func (a *ApiError) ToError() error {
	if a != nil {
		return a.Err
	}
	return a
}

func (a *ApiError) Error() string {
	if a == nil || a.Err == nil {
		return ""
	}
	return a.Err.Error()
}

func (a *ApiError) IsNil() bool {
	return a == nil || a.Err == nil
}

type ErrorType string

const (
	ErrorNone                     ErrorType = ""
	ErrorTimeout                  ErrorType = "timeout"
	ErrorCanceled                 ErrorType = "canceled"
	ErrorExec                     ErrorType = "execution"
	ErrorBadData                  ErrorType = "bad_data"
	ErrorInternal                 ErrorType = "internal"
	ErrorUnavailable              ErrorType = "unavailable"
	ErrorNotFound                 ErrorType = "not_found"
	ErrorNotImplemented           ErrorType = "not_implemented"
	ErrorUnauthorized             ErrorType = "unauthorized"
	ErrorForbidden                ErrorType = "forbidden"
	ErrorConflict                 ErrorType = "conflict"
	ErrorStreamingNotSupported    ErrorType = "streaming is not supported"
	ErrorStatusServiceUnavailable ErrorType = "service unavailable"
)

// BadRequest returns a ApiError object of bad request
func BadRequest(err error) *ApiError {
	return &ApiError{
		Typ: ErrorBadData,
		Err: err,
	}
}

// BadRequestStr returns a ApiError object of bad request
func BadRequestStr(s string) *ApiError {
	return &ApiError{
		Typ: ErrorBadData,
		Err: errors.New(s),
	}
}

// InternalError returns a ApiError object of internal type
func InternalError(err error) *ApiError {
	return &ApiError{
		Typ: ErrorInternal,
		Err: err,
	}
}

func NotFoundError(err error) *ApiError {
	return &ApiError{
		Typ: ErrorNotFound,
		Err: err,
	}
}

func UnauthorizedError(err error) *ApiError {
	return &ApiError{
		Typ: ErrorUnauthorized,
		Err: err,
	}
}

func UnavailableError(err error) *ApiError {
	return &ApiError{
		Typ: ErrorUnavailable,
		Err: err,
	}
}

func ForbiddenError(err error) *ApiError {
	return &ApiError{
		Typ: ErrorForbidden,
		Err: err,
	}
}

func ExecutionError(err error) *ApiError {
	return &ApiError{
		Typ: ErrorExec,
		Err: err,
	}
}

func WrapApiError(err *ApiError, msg string) *ApiError {
	return &ApiError{
		Typ: err.Type(),
		Err: errors.Wrap(err.ToError(), msg),
	}
}

type QueryDataV2 struct {
	ResultType parser.ValueType `json:"resultType"`
	Result     parser.Value     `json:"result"`
}

type QueryData struct {
	ResultType parser.ValueType  `json:"resultType"`
	Result     parser.Value      `json:"result"`
	Stats      *stats.QueryStats `json:"stats,omitempty"`
}

type RuleResponseItem struct {
	Id        int       `json:"id" db:"id"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	Data      string    `json:"data" db:"data"`
}

type TTLStatusItem struct {
	Id             int       `json:"id" db:"id"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	TableName      string    `json:"table_name" db:"table_name"`
	TTL            int       `json:"ttl" db:"ttl"`
	Status         string    `json:"status" db:"status"`
	ColdStorageTtl int       `json:"cold_storage_ttl" db:"cold_storage_ttl"`
}

type ChannelItem struct {
	Id        int       `json:"id" db:"id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	Name      string    `json:"name" db:"name"`
	Type      string    `json:"type" db:"type"`
	Data      string    `json:"data" db:"data"`
}

// AlertDiscovery has info for all active alerts.
type AlertDiscovery struct {
	Alerts []*AlertingRuleResponse `json:"rules"`
}

// Alert has info for an alert.
type AlertingRuleResponse struct {
	Labels      labels.Labels `json:"labels"`
	Annotations labels.Labels `json:"annotations"`
	State       string        `json:"state"`
	Name        string        `json:"name"`
	Id          int           `json:"id"`
	// ActiveAt    *time.Time    `json:"activeAt,omitempty"`
	// Value       float64       `json:"value"`
}

type DataWarning struct {
	TopLevelOps []string `json:"topLevelOps"`
}

type ServiceItem struct {
	ServiceName  string      `json:"serviceName" ch:"serviceName"`
	Percentile99 float64     `json:"p99" ch:"p99"`
	AvgDuration  float64     `json:"avgDuration" ch:"avgDuration"`
	NumCalls     uint64      `json:"numCalls" ch:"numCalls"`
	CallRate     float64     `json:"callRate" ch:"callRate"`
	NumErrors    uint64      `json:"numErrors" ch:"numErrors"`
	ErrorRate    float64     `json:"errorRate" ch:"errorRate"`
	Num4XX       uint64      `json:"num4XX" ch:"num4xx"`
	FourXXRate   float64     `json:"fourXXRate" ch:"fourXXRate"`
	DataWarning  DataWarning `json:"dataWarning"`
}
type ServiceErrorItem struct {
	Time      time.Time `json:"time" ch:"time"`
	Timestamp int64     `json:"timestamp" ch:"timestamp"`
	NumErrors uint64    `json:"numErrors" ch:"numErrors"`
}
type ServiceOverviewItem struct {
	Time         time.Time `json:"time" ch:"time"`
	Timestamp    int64     `json:"timestamp" ch:"timestamp"`
	Percentile50 float64   `json:"p50" ch:"p50"`
	Percentile95 float64   `json:"p95" ch:"p95"`
	Percentile99 float64   `json:"p99" ch:"p99"`
	NumCalls     uint64    `json:"numCalls" ch:"numCalls"`
	CallRate     float64   `json:"callRate" ch:"callRate"`
	NumErrors    uint64    `json:"numErrors" ch:"numErrors"`
	ErrorRate    float64   `json:"errorRate" ch:"errorRate"`
}

type SearchSpansResult struct {
	StartTimestampMillis uint64          `json:"startTimestampMillis"`
	EndTimestampMillis   uint64          `json:"endTimestampMillis"`
	Columns              []string        `json:"columns"`
	Events               [][]interface{} `json:"events"`
	IsSubTree            bool            `json:"isSubTree"`
}

type GetFilterSpansResponseItem struct {
	Timestamp          time.Time `ch:"timestamp" json:"timestamp"`
	SpanID             string    `ch:"spanID" json:"spanID"`
	TraceID            string    `ch:"traceID" json:"traceID"`
	ServiceName        string    `ch:"serviceName" json:"serviceName"`
	Operation          string    `ch:"name" json:"operation"`
	DurationNano       uint64    `ch:"durationNano" json:"durationNano"`
	HttpMethod         string    `ch:"httpMethod"`
	Method             string    `json:"method"`
	ResponseStatusCode string    `ch:"responseStatusCode" json:"statusCode"`
	RPCMethod          string    `ch:"rpcMethod"`
}

type GetFilterSpansResponse struct {
	Spans      []GetFilterSpansResponseItem `json:"spans"`
	TotalSpans uint64                       `json:"totalSpans"`
}

type SearchSpanDBResponseItem struct {
	Timestamp time.Time `ch:"timestamp"`
	TraceID   string    `ch:"traceID"`
	Model     string    `ch:"model"`
}

type Event struct {
	Name         string                 `json:"name,omitempty"`
	TimeUnixNano uint64                 `json:"timeUnixNano,omitempty"`
	AttributeMap map[string]interface{} `json:"attributeMap,omitempty"`
	IsError      bool                   `json:"isError,omitempty"`
}

//easyjson:json
type SearchSpanResponseItem struct {
	TimeUnixNano     uint64            `json:"timestamp"`
	DurationNano     int64             `json:"durationNano"`
	SpanID           string            `json:"spanId"`
	RootSpanID       string            `json:"rootSpanId"`
	TraceID          string            `json:"traceId"`
	HasError         bool              `json:"hasError"`
	Kind             int32             `json:"kind"`
	ServiceName      string            `json:"serviceName"`
	Name             string            `json:"name"`
	References       []OtelSpanRef     `json:"references,omitempty"`
	TagMap           map[string]string `json:"tagMap"`
	Events           []string          `json:"event"`
	RootName         string            `json:"rootName"`
	StatusMessage    string            `json:"statusMessage"`
	StatusCodeString string            `json:"statusCodeString"`
	SpanKind         string            `json:"spanKind"`
}

type Span struct {
	TimeUnixNano     uint64            `json:"timestamp"`
	DurationNano     uint64            `json:"durationNano"`
	SpanID           string            `json:"spanId"`
	RootSpanID       string            `json:"rootSpanId"`
	TraceID          string            `json:"traceId"`
	HasError         bool              `json:"hasError"`
	Kind             int32             `json:"kind"`
	ServiceName      string            `json:"serviceName"`
	Name             string            `json:"name"`
	References       []OtelSpanRef     `json:"references,omitempty"`
	TagMap           map[string]string `json:"tagMap"`
	Events           []string          `json:"event"`
	RootName         string            `json:"rootName"`
	StatusMessage    string            `json:"statusMessage"`
	StatusCodeString string            `json:"statusCodeString"`
	SpanKind         string            `json:"spanKind"`
	Children         []*Span           `json:"children"`

	// the below two fields are for frontend to render the spans
	SubTreeNodeCount uint64 `json:"subTreeNodeCount"`
	HasChildren      bool   `json:"hasChildren"`
	HasSiblings      bool   `json:"hasSiblings"`
	Level            uint64 `json:"level"`
}

type FlamegraphSpan struct {
	TimeUnixNano uint64            `json:"timestamp"`
	DurationNano uint64            `json:"durationNano"`
	SpanID       string            `json:"spanId"`
	TraceID      string            `json:"traceId"`
	HasError     bool              `json:"hasError"`
	ServiceName  string            `json:"serviceName"`
	Name         string            `json:"name"`
	Level        int64             `json:"level"`
	References   []OtelSpanRef     `json:"references,omitempty"`
	Children     []*FlamegraphSpan `json:"children"`
}

type GetWaterfallSpansForTraceWithMetadataResponse struct {
	StartTimestampMillis          uint64            `json:"startTimestampMillis"`
	EndTimestampMillis            uint64            `json:"endTimestampMillis"`
	DurationNano                  uint64            `json:"durationNano"`
	RootServiceName               string            `json:"rootServiceName"`
	RootServiceEntryPoint         string            `json:"rootServiceEntryPoint"`
	TotalSpansCount               uint64            `json:"totalSpansCount"`
	TotalErrorSpansCount          uint64            `json:"totalErrorSpansCount"`
	ServiceNameToTotalDurationMap map[string]uint64 `json:"serviceNameToTotalDurationMap"`
	Spans                         []*Span           `json:"spans"`
	HasMissingSpans               bool              `json:"hasMissingSpans"`
	// this is needed for frontend and query service sync
	UncollapsedSpans []string `json:"uncollapsedSpans"`
}

type GetFlamegraphSpansForTraceResponse struct {
	StartTimestampMillis uint64              `json:"startTimestampMillis"`
	EndTimestampMillis   uint64              `json:"endTimestampMillis"`
	DurationNano         uint64              `json:"durationNano"`
	Spans                [][]*FlamegraphSpan `json:"spans"`
}

type OtelSpanRef struct {
	TraceId string `json:"traceId,omitempty"`
	SpanId  string `json:"spanId,omitempty"`
	RefType string `json:"refType,omitempty"`
}

func (ref *OtelSpanRef) ToString() string {

	retString := fmt.Sprintf(`{TraceId=%s, SpanId=%s, RefType=%s}`, ref.TraceId, ref.SpanId, ref.RefType)

	return retString
}

func (item *SearchSpanResponseItem) GetValues() []interface{} {

	references := []OtelSpanRef{}
	jsonbody, _ := json.Marshal(item.References)
	json.Unmarshal(jsonbody, &references)

	referencesStringArray := []string{}
	for _, item := range references {
		referencesStringArray = append(referencesStringArray, item.ToString())
	}

	if item.Events == nil {
		item.Events = []string{}
	}
	keys := make([]string, 0, len(item.TagMap))
	values := make([]string, 0, len(item.TagMap))

	for k, v := range item.TagMap {
		keys = append(keys, k)
		values = append(values, v)
	}
	returnArray := []interface{}{item.TimeUnixNano, item.SpanID, item.TraceID, item.ServiceName, item.Name, strconv.Itoa(int(item.Kind)), strconv.FormatInt(item.DurationNano, 10), keys, values, referencesStringArray, item.Events, item.HasError, item.StatusMessage, item.StatusCodeString, item.SpanKind}

	return returnArray
}

type UsageItem struct {
	Time      time.Time `json:"time,omitempty" ch:"time"`
	Timestamp uint64    `json:"timestamp" ch:"timestamp"`
	Count     uint64    `json:"count" ch:"count"`
}

type TopOperationsItem struct {
	Percentile50 float64 `json:"p50" ch:"p50"`
	Percentile95 float64 `json:"p95" ch:"p95"`
	Percentile99 float64 `json:"p99" ch:"p99"`
	NumCalls     uint64  `json:"numCalls" ch:"numCalls"`
	ErrorCount   uint64  `json:"errorCount" ch:"errorCount"`
	Name         string  `json:"name" ch:"name"`
}

type TagFilters struct {
	StringTagKeys []string `json:"stringTagKeys" ch:"stringTagKeys"`
	NumberTagKeys []string `json:"numberTagKeys" ch:"numberTagKeys"`
	BoolTagKeys   []string `json:"boolTagKeys" ch:"boolTagKeys"`
}

type TagValues struct {
	StringTagValues []string  `json:"stringTagValues" ch:"stringTagValues"`
	BoolTagValues   []bool    `json:"boolTagValues" ch:"boolTagValues"`
	NumberTagValues []float64 `json:"numberTagValues" ch:"numberTagValues"`
}

type ServiceMapDependencyResponseItem struct {
	Parent    string  `json:"parent" ch:"parent"`
	Child     string  `json:"child" ch:"child"`
	CallCount uint64  `json:"callCount" ch:"callCount"`
	CallRate  float64 `json:"callRate" ch:"callRate"`
	ErrorRate float64 `json:"errorRate" ch:"errorRate"`
	P99       float64 `json:"p99" ch:"p99"`
	P95       float64 `json:"p95" ch:"p95"`
	P90       float64 `json:"p90" ch:"p90"`
	P75       float64 `json:"p75" ch:"p75"`
	P50       float64 `json:"p50" ch:"p50"`
}

type GetFilteredSpansAggregatesResponse struct {
	Items map[int64]SpanAggregatesResponseItem `json:"items"`
}
type SpanAggregatesResponseItem struct {
	Timestamp int64              `json:"timestamp,omitempty" `
	Value     float32            `json:"value,omitempty"`
	GroupBy   map[string]float32 `json:"groupBy,omitempty"`
}
type SpanAggregatesDBResponseItem struct {
	Timestamp    int64     `ch:"timestamp" `
	Time         time.Time `ch:"time"`
	Value        uint64    `ch:"value"`
	FloatValue   float32   `ch:"floatValue"`
	Float64Value float64   `ch:"float64Value"`
	GroupBy      string    `ch:"groupBy"`
}

type SetTTLResponseItem struct {
	Message string `json:"message"`
}

type DiskItem struct {
	Name string `json:"name,omitempty" ch:"name"`
	Type string `json:"type,omitempty" ch:"type"`
}

type DBResponseTTL struct {
	EngineFull string `ch:"engine_full"`
}

type GetTTLResponseItem struct {
	MetricsTime             int    `json:"metrics_ttl_duration_hrs,omitempty"`
	MetricsMoveTime         int    `json:"metrics_move_ttl_duration_hrs,omitempty"`
	TracesTime              int    `json:"traces_ttl_duration_hrs,omitempty"`
	TracesMoveTime          int    `json:"traces_move_ttl_duration_hrs,omitempty"`
	LogsTime                int    `json:"logs_ttl_duration_hrs,omitempty"`
	LogsMoveTime            int    `json:"logs_move_ttl_duration_hrs,omitempty"`
	ExpectedMetricsTime     int    `json:"expected_metrics_ttl_duration_hrs,omitempty"`
	ExpectedMetricsMoveTime int    `json:"expected_metrics_move_ttl_duration_hrs,omitempty"`
	ExpectedTracesTime      int    `json:"expected_traces_ttl_duration_hrs,omitempty"`
	ExpectedTracesMoveTime  int    `json:"expected_traces_move_ttl_duration_hrs,omitempty"`
	ExpectedLogsTime        int    `json:"expected_logs_ttl_duration_hrs,omitempty"`
	ExpectedLogsMoveTime    int    `json:"expected_logs_move_ttl_duration_hrs,omitempty"`
	Status                  string `json:"status"`
}

type DBResponseServiceName struct {
	ServiceName string `ch:"serviceName"`
	Count       uint64 `ch:"count"`
}

type DBResponseHttpRoute struct {
	HttpRoute string `ch:"httpRoute"`
	Count     uint64 `ch:"count"`
}

type DBResponseHttpUrl struct {
	HttpUrl string `ch:"httpUrl"`
	Count   uint64 `ch:"count"`
}

type DBResponseHttpMethod struct {
	HttpMethod string `ch:"httpMethod"`
	Count      uint64 `ch:"count"`
}

type DBResponseStatusCodeMethod struct {
	ResponseStatusCode string `ch:"responseStatusCode"`
	Count              uint64 `ch:"count"`
}

type DBResponseRPCMethod struct {
	RPCMethod string `ch:"rpcMethod"`
	Count     uint64 `ch:"count"`
}

type DBResponseHttpHost struct {
	HttpHost string `ch:"httpHost"`
	Count    uint64 `ch:"count"`
}

type DBResponseOperation struct {
	Operation string `ch:"name"`
	Count     uint64 `ch:"count"`
}

type DBResponseComponent struct {
	Component string `ch:"component"`
	Count     uint64 `ch:"count"`
}

type DBResponseTotal struct {
	NumTotal uint64 `ch:"numTotal"`
}

type DBResponseMinMax struct {
	Min uint64 `ch:"min"`
	Max uint64 `ch:"max"`
}

type SpanFiltersResponse struct {
	ServiceName        map[string]uint64 `json:"serviceName"`
	Status             map[string]uint64 `json:"status"`
	Duration           map[string]uint64 `json:"duration"`
	Operation          map[string]uint64 `json:"operation"`
	ResponseStatusCode map[string]uint64 `json:"responseStatusCode"`
	RPCMethod          map[string]uint64 `json:"rpcMethod"`
	HttpUrl            map[string]uint64 `json:"httpUrl"`
	HttpMethod         map[string]uint64 `json:"httpMethod"`
	HttpRoute          map[string]uint64 `json:"httpRoute"`
	HttpHost           map[string]uint64 `json:"httpHost"`
}
type Error struct {
	ExceptionType  string    `json:"exceptionType" ch:"exceptionType"`
	ExceptionMsg   string    `json:"exceptionMessage" ch:"exceptionMessage"`
	ExceptionCount uint64    `json:"exceptionCount" ch:"exceptionCount"`
	LastSeen       time.Time `json:"lastSeen" ch:"lastSeen"`
	FirstSeen      time.Time `json:"firstSeen" ch:"firstSeen"`
	ServiceName    string    `json:"serviceName" ch:"serviceName"`
	GroupID        string    `json:"groupID" ch:"groupID"`
}

type ErrorWithSpan struct {
	ErrorID             string    `json:"errorId" ch:"errorID"`
	ExceptionType       string    `json:"exceptionType" ch:"exceptionType"`
	ExceptionStacktrace string    `json:"exceptionStacktrace" ch:"exceptionStacktrace"`
	ExceptionEscaped    bool      `json:"exceptionEscaped" ch:"exceptionEscaped"`
	ExceptionMsg        string    `json:"exceptionMessage" ch:"exceptionMessage"`
	Timestamp           time.Time `json:"timestamp" ch:"timestamp"`
	SpanID              string    `json:"spanID" ch:"spanID"`
	TraceID             string    `json:"traceID" ch:"traceID"`
	ServiceName         string    `json:"serviceName" ch:"serviceName"`
	GroupID             string    `json:"groupID" ch:"groupID"`
}

type NextPrevErrorIDsDBResponse struct {
	NextErrorID   string    `ch:"nextErrorID"`
	NextTimestamp time.Time `ch:"nextTimestamp"`
	PrevErrorID   string    `ch:"prevErrorID"`
	PrevTimestamp time.Time `ch:"prevTimestamp"`
	Timestamp     time.Time `ch:"timestamp"`
}

type NextPrevErrorIDs struct {
	NextErrorID   string    `json:"nextErrorID"`
	NextTimestamp time.Time `json:"nextTimestamp"`
	PrevErrorID   string    `json:"prevErrorID"`
	PrevTimestamp time.Time `json:"prevTimestamp"`
	GroupID       string    `json:"groupID"`
}

type MetricStatus struct {
	MetricName           string
	LastReceivedTsMillis int64
	LastReceivedLabels   map[string]string
}

type ShowCreateTableStatement struct {
	Statement string `json:"statement" ch:"statement"`
}

type Field struct {
	Name     string `json:"name" ch:"name"`
	DataType string `json:"dataType" ch:"datatype"`
	Type     string `json:"type"`
}

type GetFieldsResponse struct {
	Selected    []Field `json:"selected"`
	Interesting []Field `json:"interesting"`
}

// Represents a log record in query service requests and responses.
type SignozLog struct {
	Timestamp          uint64             `json:"timestamp" ch:"timestamp"`
	ID                 string             `json:"id" ch:"id"`
	TraceID            string             `json:"trace_id" ch:"trace_id"`
	SpanID             string             `json:"span_id" ch:"span_id"`
	TraceFlags         uint32             `json:"trace_flags" ch:"trace_flags"`
	SeverityText       string             `json:"severity_text" ch:"severity_text"`
	SeverityNumber     uint8              `json:"severity_number" ch:"severity_number"`
	Body               string             `json:"body" ch:"body"`
	Resources_string   map[string]string  `json:"resources_string" ch:"resources_string"`
	Attributes_string  map[string]string  `json:"attributes_string" ch:"attributes_string"`
	Attributes_int64   map[string]int64   `json:"attributes_int" ch:"attributes_int64"`
	Attributes_float64 map[string]float64 `json:"attributes_float" ch:"attributes_float64"`
	Attributes_bool    map[string]bool    `json:"attributes_bool" ch:"attributes_bool"`
}

type SignozLogV2 struct {
	Timestamp         uint64             `json:"timestamp" ch:"timestamp"`
	ID                string             `json:"id" ch:"id"`
	TraceID           string             `json:"trace_id" ch:"trace_id"`
	SpanID            string             `json:"span_id" ch:"span_id"`
	TraceFlags        uint32             `json:"trace_flags" ch:"trace_flags"`
	SeverityText      string             `json:"severity_text" ch:"severity_text"`
	SeverityNumber    uint8              `json:"severity_number" ch:"severity_number"`
	Body              string             `json:"body" ch:"body"`
	ScopeName         string             `json:"scope_name" ch:"scope_name"`
	ScopeVersion      string             `json:"scope_version" ch:"scope_version"`
	ScopeString       map[string]string  `json:"scope_string" ch:"scope_string"`
	Resources_string  map[string]string  `json:"resources_string" ch:"resources_string"`
	Attributes_string map[string]string  `json:"attributes_string" ch:"attributes_string"`
	Attributes_number map[string]float64 `json:"attributes_float" ch:"attributes_number"`
	Attributes_bool   map[string]bool    `json:"attributes_bool" ch:"attributes_bool"`
}

type LogsTailClient struct {
	Name   string
	Logs   chan *SignozLog
	Done   chan *bool
	Error  chan error
	Filter LogsFilterParams
}

type GetLogsAggregatesResponse struct {
	Items map[int64]LogsAggregatesResponseItem `json:"items"`
}

type LogsAggregatesResponseItem struct {
	Timestamp int64                  `json:"timestamp,omitempty" `
	Value     interface{}            `json:"value,omitempty"`
	GroupBy   map[string]interface{} `json:"groupBy,omitempty"`
}

type LogsAggregatesDBResponseItem struct {
	Timestamp int64   `ch:"ts_start_interval"`
	Value     float64 `ch:"value"`
	GroupBy   string  `ch:"groupBy"`
}

// MarshalJSON implements json.Marshaler.
func (s *ServiceItem) MarshalJSON() ([]byte, error) {
	// If a service didn't not send any data in the last interval duration
	// it's values such as 99th percentile will return as NaN and
	// json encoding doesn't support NaN
	// We still want to show it in the UI, so we'll replace NaN with 0
	type Alias ServiceItem
	if math.IsInf(s.AvgDuration, 0) || math.IsNaN(s.AvgDuration) {
		s.AvgDuration = 0
	}
	if math.IsInf(s.CallRate, 0) || math.IsNaN(s.CallRate) {
		s.CallRate = 0
	}
	if math.IsInf(s.ErrorRate, 0) || math.IsNaN(s.ErrorRate) {
		s.ErrorRate = 0
	}
	if math.IsInf(s.Percentile99, 0) || math.IsNaN(s.Percentile99) {
		s.Percentile99 = 0
	}

	return json.Marshal(&struct {
		*Alias
	}{
		Alias: (*Alias)(s),
	})
}

type DashboardVar struct {
	VariableValues []interface{} `json:"variableValues"`
}

type TagsInfo struct {
	Languages map[string]interface{} `json:"languages"`
	Env       string                 `json:"env"`
	Services  map[string]interface{} `json:"services"`
}

type AlertsInfo struct {
	TotalAlerts                  int      `json:"totalAlerts"`
	TotalActiveAlerts            int      `json:"totalActiveAlerts"`
	LogsBasedAlerts              int      `json:"logsBasedAlerts"`
	MetricBasedAlerts            int      `json:"metricBasedAlerts"`
	AnomalyBasedAlerts           int      `json:"anomalyBasedAlerts"`
	TracesBasedAlerts            int      `json:"tracesBasedAlerts"`
	TotalChannels                int      `json:"totalChannels"`
	SlackChannels                int      `json:"slackChannels"`
	WebHookChannels              int      `json:"webHookChannels"`
	PagerDutyChannels            int      `json:"pagerDutyChannels"`
	OpsGenieChannels             int      `json:"opsGenieChannels"`
	EmailChannels                int      `json:"emailChannels"`
	MSTeamsChannels              int      `json:"microsoftTeamsChannels"`
	MetricsBuilderQueries        int      `json:"metricsBuilderQueries"`
	MetricsClickHouseQueries     int      `json:"metricsClickHouseQueries"`
	MetricsPrometheusQueries     int      `json:"metricsPrometheusQueries"`
	SpanMetricsPrometheusQueries int      `json:"spanMetricsPrometheusQueries"`
	AlertNames                   []string `json:"alertNames"`
	AlertsWithTSV2               int      `json:"alertsWithTSv2"`
	AlertsWithLogsChQuery        int      `json:"alertsWithLogsChQuery"`
	AlertsWithTraceChQuery       int      `json:"alertsWithTraceChQuery"`
	AlertsWithLogsContainsOp     int      `json:"alertsWithLogsContainsOp"`
}

type SavedViewsInfo struct {
	TotalSavedViews  int `json:"totalSavedViews"`
	TracesSavedViews int `json:"tracesSavedViews"`
	LogsSavedViews   int `json:"logsSavedViews"`

	LogsSavedViewWithContainsOp int `json:"logsSavedViewWithContainsOp"`
}

type DashboardsInfo struct {
	TotalDashboards                 int      `json:"totalDashboards"`
	TotalDashboardsWithPanelAndName int      `json:"totalDashboardsWithPanelAndName"` // dashboards with panel and name without sample title
	LogsBasedPanels                 int      `json:"logsBasedPanels"`
	MetricBasedPanels               int      `json:"metricBasedPanels"`
	TracesBasedPanels               int      `json:"tracesBasedPanels"`
	DashboardNames                  []string `json:"dashboardNames"`
	QueriesWithTSV2                 int      `json:"queriesWithTSV2"`
	QueriesWithTagAttrs             int      `json:"queriesWithTagAttrs"`
	DashboardsWithLogsChQuery       int      `json:"dashboardsWithLogsChQuery"`
	DashboardsWithTraceChQuery      int      `json:"dashboardsWithTraceChQuery"`
	DashboardNamesWithTraceChQuery  []string `json:"dashboardNamesWithTraceChQuery"`
	LogsPanelsWithAttrContainsOp    int      `json:"logsPanelsWithAttrContainsOp"`
}

type TagTelemetryData struct {
	ServiceName string `json:"serviceName" ch:"serviceName"`
	Env         string `json:"env" ch:"env"`
	Language    string `json:"language" ch:"language"`
}

type ClusterInfo struct {
	ShardNum              uint32 `json:"shard_num" ch:"shard_num"`
	ShardWeight           uint32 `json:"shard_weight" ch:"shard_weight"`
	ReplicaNum            uint32 `json:"replica_num" ch:"replica_num"`
	ErrorsCount           uint32 `json:"errors_count" ch:"errors_count"`
	SlowdownsCount        uint32 `json:"slowdowns_count" ch:"slowdowns_count"`
	EstimatedRecoveryTime uint32 `json:"estimated_recovery_time" ch:"estimated_recovery_time"`
}

func (ci *ClusterInfo) GetMapFromStruct() map[string]interface{} {
	var clusterInfoMap map[string]interface{}
	data, _ := json.Marshal(*ci)
	json.Unmarshal(data, &clusterInfoMap)
	return clusterInfoMap
}

type GetVersionResponse struct {
	Version        string `json:"version"`
	EE             string `json:"ee"`
	SetupCompleted bool   `json:"setupCompleted"`
}
