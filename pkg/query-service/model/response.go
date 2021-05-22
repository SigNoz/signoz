package model

type ServiceItem struct {
	ServiceName  string  `json:"serviceName"`
	Percentile99 float32 `json:"p99"`
	AvgDuration  float32 `json:"avgDuration"`
	NumCalls     int     `json:"numCalls"`
	CallRate     float32 `json:"callRate"`
	NumErrors    int     `json:"numErrors"`
	ErrorRate    float32 `json:"errorRate"`
	Num4XX       int     `json:"num4XX"`
	FourXXRate   float32 `json:"fourXXRate"`
}
type ServiceListErrorItem struct {
	ServiceName string `json:"serviceName"`
	NumErrors   int    `json:"numErrors"`
	Num4xx      int    `json:"num4xx"`
}

type ServiceErrorItem struct {
	Time      string `json:"time,omitempty"`
	Timestamp int64  `json:"timestamp"`
	NumErrors int    `json:"numErrors"`
}

type ServiceOverviewItem struct {
	Time         string  `json:"time,omitempty"`
	Timestamp    int64   `json:"timestamp"`
	Percentile50 float32 `json:"p50"`
	Percentile95 float32 `json:"p95"`
	Percentile99 float32 `json:"p99"`
	NumCalls     int     `json:"numCalls"`
	CallRate     float32 `json:"callRate"`
	NumErrors    int     `json:"numErrors"`
	ErrorRate    float32 `json:"errorRate"`
}

type ServiceExternalItem struct {
	Time            string  `json:"time,omitempty"`
	Timestamp       int64   `json:"timestamp,omitempty"`
	ExternalHttpUrl string  `json:"externalHttpUrl,omitempty"`
	AvgDuration     float32 `json:"avgDuration,omitempty"`
	NumCalls        int     `json:"numCalls,omitempty"`
	CallRate        float32 `json:"callRate,omitempty"`
	NumErrors       int     `json:"numErrors"`
	ErrorRate       float32 `json:"errorRate"`
}

type ServiceDBOverviewItem struct {
	Time        string  `json:"time,omitempty"`
	Timestamp   int64   `json:"timestamp,omitempty"`
	DBSystem    string  `json:"dbSystem,omitempty"`
	AvgDuration float32 `json:"avgDuration,omitempty"`
	NumCalls    int     `json:"numCalls,omitempty"`
	CallRate    float32 `json:"callRate,omitempty"`
}

type ServiceMapDependencyItem struct {
	SpanId       string `json:"spanId,omitempty"`
	ParentSpanId string `json:"parentSpanId,omitempty"`
	ServiceName  string `json:"serviceName,omitempty"`
}

type UsageItem struct {
	Time      string `json:"time,omitempty"`
	Timestamp int64  `json:"timestamp"`
	Count     int64  `json:"count"`
}

type TopEnpointsItem struct {
	Percentile50 float32 `json:"p50"`
	Percentile90 float32 `json:"p90"`
	Percentile99 float32 `json:"p99"`
	NumCalls     int     `json:"numCalls"`
	Name         string  `json:"name"`
}

type TagItem struct {
	TagKeys  string `json:"tagKeys"`
	TagCount int    `json:"tagCount"`
}

type ServiceMapDependencyResponseItem struct {
	Parent    string `json:"parent,omitempty"`
	Child     string `json:"child,omitempty"`
	CallCount int    `json:"callCount,omitempty"`
}
