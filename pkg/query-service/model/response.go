package model

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"
)

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

	returnArray := []interface{}{int64(timeObj.UnixNano() / 1000000), item.SpanID, item.TraceID, item.ServiceName, item.Name, strconv.Itoa(int(item.Kind)), strconv.FormatInt(item.DurationNano, 10), item.TagsKeys, item.TagsValues, referencesStringArray}

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
