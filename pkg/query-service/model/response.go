package model

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/prometheus/prometheus/pkg/labels"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"
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
	ServiceName  string  `json:"serviceName" db:"serviceName"`
	Percentile99 float32 `json:"p99" db:"p99"`
	AvgDuration  float32 `json:"avgDuration" db:"avgDuration"`
	NumCalls     int     `json:"numCalls" db:"numCalls"`
	CallRate     float32 `json:"callRate" db:"callRate"`
	NumErrors    int     `json:"numErrors" db:"numErrors"`
	ErrorRate    float32 `json:"errorRate" db:"errorRate"`
	Num4XX       int     `json:"num4XX" db:"num4xx"`
	FourXXRate   float32 `json:"fourXXRate" db:"fourXXRate"`
}

type ServiceListErrorItem struct {
	ServiceName string `json:"serviceName"`
	NumErrors   int    `json:"numErrors"`
	Num4xx      int    `json:"num4xx"`
}

type ServiceErrorItem struct {
	Time      string `json:"time,omitempty" db:"time,omitempty"`
	Timestamp int64  `json:"timestamp" db:"timestamp"`
	NumErrors int    `json:"numErrors" db:"numErrors"`
}

type ServiceOverviewItem struct {
	Time         string  `json:"time,omitempty" db:"time,omitempty"`
	Timestamp    int64   `json:"timestamp" db:"timestamp"`
	Percentile50 float32 `json:"p50" db:"p50"`
	Percentile95 float32 `json:"p95" db:"p95"`
	Percentile99 float32 `json:"p99" db:"p99"`
	NumCalls     int     `json:"numCalls" db:"numCalls"`
	CallRate     float32 `json:"callRate" db:"callRate"`
	NumErrors    int     `json:"numErrors" db:"numErrors"`
	ErrorRate    float32 `json:"errorRate" db:"errorRate"`
}

type SearchSpansResult struct {
	Columns []string        `json:"columns"`
	Events  [][]interface{} `json:"events"`
}

type GetFilterSpansResponseItem struct {
	Timestamp    string `db:"timestamp" json:"timestamp"`
	SpanID       string `db:"spanID" json:"spanID"`
	TraceID      string `db:"traceID" json:"traceID"`
	ServiceName  string `db:"serviceName" json:"serviceName"`
	Operation    string `db:"name" json:"operation"`
	DurationNano int64  `db:"durationNano" json:"durationNano"`
	HttpCode     string `db:"httpCode" json:"httpCode"`
	HttpMethod   string `db:"httpMethod" json:"httpMethod"`
}

type GetFilterSpansResponse struct {
	Spans      []GetFilterSpansResponseItem `json:"spans"`
	TotalSpans int                          `json:"totalSpans"`
}

type TraceResult struct {
	Data   []interface{} `json:"data" db:"data"`
	Total  int           `json:"total" db:"total"`
	Limit  int           `json:"limit" db:"limit"`
	Offset int           `json:"offset" db:"offset"`
}
type TraceResultItem struct {
	TraceID string
	Spans   []TraceResultSpan
}
type TraceResultSpan struct {
	Timestamp    string   `db:"timestamp"`
	SpanID       string   `db:"spanID"`
	TraceID      string   `db:"traceID"`
	ServiceName  string   `db:"serviceName"`
	Name         string   `db:"name"`
	Kind         int32    `db:"kind"`
	DurationNano int64    `db:"durationNano"`
	TagsKeys     []string `db:"tagsKeys"`
	TagsValues   []string `db:"tagsValues"`
}

type SearchSpanReponseItem struct {
	Timestamp    string   `db:"timestamp"`
	SpanID       string   `db:"spanID"`
	TraceID      string   `db:"traceID"`
	ServiceName  string   `db:"serviceName"`
	Name         string   `db:"name"`
	Kind         int32    `db:"kind"`
	References   string   `db:"references,omitempty"`
	DurationNano int64    `db:"durationNano"`
	TagsKeys     []string `db:"tagsKeys"`
	TagsValues   []string `db:"tagsValues"`
	Events       []string `db:"events"`
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

	timeObj, _ := time.Parse(time.RFC3339Nano, item.Timestamp)
	references := []OtelSpanRef{}
	json.Unmarshal([]byte(item.References), &references)

	referencesStringArray := []string{}
	for _, item := range references {
		referencesStringArray = append(referencesStringArray, item.toString())
	}
	var errorEvent map[string]interface{}
	for _, e := range item.Events {
		json.Unmarshal([]byte(e), &errorEvent)
		if errorEvent["name"] == "exception" {
			break
		} else {
			errorEvent = nil
		}
	}

	returnArray := []interface{}{int64(timeObj.UnixNano() / 1000000), item.SpanID, item.TraceID, item.ServiceName, item.Name, strconv.Itoa(int(item.Kind)), strconv.FormatInt(item.DurationNano, 10), item.TagsKeys, item.TagsValues, referencesStringArray, errorEvent}

	return returnArray
}

type ServiceExternalItem struct {
	Time            string  `json:"time,omitempty" db:"time,omitempty"`
	Timestamp       int64   `json:"timestamp,omitempty" db:"timestamp,omitempty"`
	ExternalHttpUrl string  `json:"externalHttpUrl,omitempty" db:"externalHttpUrl,omitempty"`
	AvgDuration     float32 `json:"avgDuration,omitempty" db:"avgDuration,omitempty"`
	NumCalls        int     `json:"numCalls,omitempty" db:"numCalls,omitempty"`
	CallRate        float32 `json:"callRate,omitempty" db:"callRate,omitempty"`
	NumErrors       int     `json:"numErrors" db:"numErrors"`
	ErrorRate       float32 `json:"errorRate" db:"errorRate"`
}

type ServiceDBOverviewItem struct {
	Time        string  `json:"time,omitempty" db:"time,omitempty"`
	Timestamp   int64   `json:"timestamp,omitempty" db:"timestamp,omitempty"`
	DBSystem    string  `json:"dbSystem,omitempty" db:"dbSystem,omitempty"`
	AvgDuration float32 `json:"avgDuration,omitempty" db:"avgDuration,omitempty"`
	NumCalls    int     `json:"numCalls,omitempty" db:"numCalls,omitempty"`
	CallRate    float32 `json:"callRate,omitempty" db:"callRate,omitempty"`
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
	Percentile50 float32 `json:"p50" db:"p50"`
	Percentile95 float32 `json:"p95" db:"p95"`
	Percentile99 float32 `json:"p99" db:"p99"`
	NumCalls     int     `json:"numCalls" db:"numCalls"`
	Name         string  `json:"name" db:"name"`
}

type TagItem struct {
	TagKeys  string `json:"tagKeys" db:"tagKeys"`
	TagCount int    `json:"tagCount" db:"tagCount"`
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

type SpanSearchAggregatesResponseItem struct {
	Timestamp int64   `json:"timestamp,omitempty" db:"timestamp" `
	Time      string  `json:"time,omitempty" db:"time"`
	Value     float32 `json:"value,omitempty" db:"value"`
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
