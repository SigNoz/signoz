package model

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"
	"k8s.io/apimachinery/pkg/labels"
)

type ApiError struct {
	Typ ErrorType
	Err error
}
type ErrorType string

const (
	ErrorNone           ErrorType = ""
	ErrorTimeout        ErrorType = "timeout"
	ErrorCanceled       ErrorType = "canceled"
	ErrorExec           ErrorType = "execution"
	ErrorBadData        ErrorType = "bad_data"
	ErrorInternal       ErrorType = "internal"
	ErrorUnavailable    ErrorType = "unavailable"
	ErrorNotFound       ErrorType = "not_found"
	ErrorNotImplemented ErrorType = "not_implemented"
)

type QueryData struct {
	ResultType promql.ValueType  `json:"resultType"`
	Result     promql.Value      `json:"result"`
	Stats      *stats.QueryStats `json:"stats,omitempty"`
}

type RuleResponseItem struct {
	Id        int       `json:"id" db:"id"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	Data      string    `json:"data" db:"data"`
}

type ChannelItem struct {
	Id        int       `json:"id" db:"id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	Name      string    `json:"name" db:"name"`
	Type      string    `json:"type" db:"type"`
	Data      string    `json:"data" db:"data"`
}

// Receiver configuration provides configuration on how to contact a receiver.
type Receiver struct {
	// A unique identifier for this receiver.
	Name string `yaml:"name" json:"name"`

	EmailConfigs     interface{} `yaml:"email_configs,omitempty" json:"email_configs,omitempty"`
	PagerdutyConfigs interface{} `yaml:"pagerduty_configs,omitempty" json:"pagerduty_configs,omitempty"`
	SlackConfigs     interface{} `yaml:"slack_configs,omitempty" json:"slack_configs,omitempty"`
	WebhookConfigs   interface{} `yaml:"webhook_configs,omitempty" json:"webhook_configs,omitempty"`
	OpsGenieConfigs  interface{} `yaml:"opsgenie_configs,omitempty" json:"opsgenie_configs,omitempty"`
	WechatConfigs    interface{} `yaml:"wechat_configs,omitempty" json:"wechat_configs,omitempty"`
	PushoverConfigs  interface{} `yaml:"pushover_configs,omitempty" json:"pushover_configs,omitempty"`
	VictorOpsConfigs interface{} `yaml:"victorops_configs,omitempty" json:"victorops_configs,omitempty"`
	SNSConfigs       interface{} `yaml:"sns_configs,omitempty" json:"sns_configs,omitempty"`
}

type ReceiverResponse struct {
	Status string   `json:"status"`
	Data   Receiver `json:"data"`
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

type ServiceItem struct {
	ServiceName  string  `json:"serviceName" ch:"serviceName"`
	Percentile99 float64 `json:"p99" ch:"p99"`
	AvgDuration  float64 `json:"avgDuration" ch:"avgDuration"`
	NumCalls     uint64  `json:"numCalls" ch:"numCalls"`
	CallRate     float64 `json:"callRate" ch:"callRate"`
	NumErrors    uint64  `json:"numErrors" ch:"numErrors"`
	ErrorRate    float64 `json:"errorRate" ch:"errorRate"`
	Num4XX       uint64  `json:"num4XX" ch:"num4xx"`
	FourXXRate   float64 `json:"fourXXRate" ch:"fourXXRate"`
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
	Columns []string        `json:"columns"`
	Events  [][]interface{} `json:"events"`
}

type GetFilterSpansResponseItem struct {
	Timestamp    string `ch:"timestamp" json:"timestamp"`
	SpanID       string `ch:"spanID" json:"spanID"`
	TraceID      string `ch:"traceID" json:"traceID"`
	ServiceName  string `ch:"serviceName" json:"serviceName"`
	Operation    string `ch:"name" json:"operation"`
	DurationNano int64  `ch:"durationNano" json:"durationNano"`
	HttpCode     string `ch:"httpCode" json:"httpCode"`
	HttpMethod   string `ch:"httpMethod" json:"httpMethod"`
}

type GetFilterSpansResponse struct {
	Spans      []GetFilterSpansResponseItem `json:"spans"`
	TotalSpans int                          `json:"totalSpans"`
}

type SearchSpanDBReponseItem struct {
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

type SearchSpanReponseItem struct {
	TimeUnixNano uint64        `json:"timestamp"`
	SpanID       string        `json:"spanID"`
	TraceID      string        `json:"traceID"`
	ServiceName  string        `json:"serviceName"`
	Name         string        `json:"name"`
	Kind         int32         `json:"kind"`
	References   []OtelSpanRef `json:"references,omitempty"`
	DurationNano int64         `json:"durationNano"`
	TagsKeys     []string      `json:"tagsKeys"`
	TagsValues   []string      `json:"tagsValues"`
	Events       []string      `json:"event"`
	HasError     int32         `json:"hasError"`
}

type OtelSpanRef struct {
	TraceId string `json:"traceId,omitempty"`
	SpanId  string `json:"spanId,omitempty"`
	RefType string `json:"refType,omitempty"`
}

func (ref *OtelSpanRef) toString() string {

	retString := fmt.Sprintf(`{TraceId=%s, SpanId=%s, RefType=%s}`, ref.TraceId, ref.SpanId, ref.RefType)

	return retString
}

func (item *SearchSpanReponseItem) GetValues() []interface{} {

	references := []OtelSpanRef{}
	jsonbody, _ := json.Marshal(item.References)
	json.Unmarshal(jsonbody, &references)

	referencesStringArray := []string{}
	for _, item := range references {
		referencesStringArray = append(referencesStringArray, item.toString())
	}

	if item.Events == nil {
		item.Events = []string{}
	}
	returnArray := []interface{}{item.TimeUnixNano, item.SpanID, item.TraceID, item.ServiceName, item.Name, strconv.Itoa(int(item.Kind)), strconv.FormatInt(item.DurationNano, 10), item.TagsKeys, item.TagsValues, referencesStringArray, item.Events, item.HasError}

	return returnArray
}

type ServiceMapDependencyItem struct {
	SpanId       string `json:"spanId,omitempty" db:"spanID,omitempty"`
	ParentSpanId string `json:"parentSpanId,omitempty" db:"parentSpanID,omitempty"`
	ServiceName  string `json:"serviceName,omitempty" db:"serviceName,omitempty"`
}

type UsageItem struct {
	Time      string `json:"time,omitempty" db:"time,omitempty"`
	Timestamp int64  `json:"timestamp" db:"timestamp"`
	Count     int64  `json:"count" db:"count"`
}

type TopEndpointsItem struct {
	Percentile50 float64 `json:"p50" ch:"p50"`
	Percentile95 float64 `json:"p95" ch:"p95"`
	Percentile99 float64 `json:"p99" ch:"p99"`
	NumCalls     uint64  `json:"numCalls" ch:"numCalls"`
	Name         string  `json:"name" ch:"name"`
}

type TagFilters struct {
	TagKeys string `json:"tagKeys" db:"tagKeys"`
}

type TagValues struct {
	TagValues string `json:"tagValues" db:"tagValues"`
}
type ServiceMapDependencyResponseItem struct {
	Parent    string `json:"parent,omitempty" db:"parent,omitempty"`
	Child     string `json:"child,omitempty" db:"child,omitempty"`
	CallCount int    `json:"callCount,omitempty" db:"callCount,omitempty"`
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
	Timestamp int64          `json:"timestamp,omitempty" db:"timestamp" `
	Time      string         `json:"time,omitempty" db:"time"`
	Value     float32        `json:"value,omitempty" db:"value"`
	GroupBy   sql.NullString `json:"groupBy,omitempty" db:"groupBy"`
}

type SetTTLResponseItem struct {
	Message string `json:"message"`
}

type DBResponseTTL struct {
	EngineFull string `db:"engine_full"`
}

type GetTTLResponseItem struct {
	MetricsTime int `json:"metrics_ttl_duration_hrs"`
	TracesTime  int `json:"traces_ttl_duration_hrs"`
}

type DBResponseMinMaxDuration struct {
	MinDuration int `db:"min(durationNano)"`
	MaxDuration int `db:"max(durationNano)"`
}

type DBResponseServiceName struct {
	ServiceName string `db:"serviceName"`
	Count       int    `db:"count"`
}

type DBResponseHttpCode struct {
	HttpCode string `db:"httpCode"`
	Count    int    `db:"count"`
}

type DBResponseHttpRoute struct {
	HttpRoute string `db:"httpRoute"`
	Count     int    `db:"count"`
}

type DBResponseHttpUrl struct {
	HttpUrl string `db:"httpUrl"`
	Count   int    `db:"count"`
}

type DBResponseHttpMethod struct {
	HttpMethod string `db:"httpMethod"`
	Count      int    `db:"count"`
}

type DBResponseHttpHost struct {
	HttpHost string `db:"httpHost"`
	Count    int    `db:"count"`
}

type DBResponseOperation struct {
	Operation string `db:"name"`
	Count     int    `db:"count"`
}

type DBResponseComponent struct {
	Component sql.NullString `db:"component"`
	Count     int            `db:"count"`
}

type DBResponseErrors struct {
	NumErrors int `db:"numErrors"`
}

type DBResponseTotal struct {
	NumTotal int `db:"numTotal"`
}

type SpanFiltersResponse struct {
	ServiceName map[string]int `json:"serviceName"`
	Status      map[string]int `json:"status"`
	Duration    map[string]int `json:"duration"`
	Operation   map[string]int `json:"operation"`
	HttpCode    map[string]int `json:"httpCode"`
	HttpUrl     map[string]int `json:"httpUrl"`
	HttpMethod  map[string]int `json:"httpMethod"`
	HttpRoute   map[string]int `json:"httpRoute"`
	HttpHost    map[string]int `json:"httpHost"`
	Component   map[string]int `json:"component"`
}
type Error struct {
	ExceptionType  string    `json:"exceptionType" db:"exceptionType"`
	ExceptionMsg   string    `json:"exceptionMessage" db:"exceptionMessage"`
	ExceptionCount int64     `json:"exceptionCount" db:"exceptionCount"`
	LastSeen       time.Time `json:"lastSeen" db:"lastSeen"`
	FirstSeen      time.Time `json:"firstSeen" db:"firstSeen"`
	ServiceName    string    `json:"serviceName" db:"serviceName"`
}

type ErrorWithSpan struct {
	ErrorID            string    `json:"errorId" db:"errorID"`
	ExceptionType      string    `json:"exceptionType" db:"exceptionType"`
	ExcepionStacktrace string    `json:"excepionStacktrace" db:"excepionStacktrace"`
	ExceptionEscaped   string    `json:"exceptionEscaped" db:"exceptionEscaped"`
	ExceptionMsg       string    `json:"exceptionMessage" db:"exceptionMessage"`
	Timestamp          time.Time `json:"timestamp" db:"timestamp"`
	SpanID             string    `json:"spanID" db:"spanID"`
	TraceID            string    `json:"traceID" db:"traceID"`
	ServiceName        string    `json:"serviceName" db:"serviceName"`
	NewerErrorID       string    `json:"newerErrorId" db:"newerErrorId"`
	OlderErrorID       string    `json:"olderErrorId" db:"olderErrorId"`
}
