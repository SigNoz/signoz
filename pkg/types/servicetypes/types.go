package servicetypes

import "time"

// Request mirrors the /services API input shape
type Request struct {
	Start uint64          `json:"start"`
	End   uint64          `json:"end"`
	Tags  []TagFilterItem `json:"tags"`
}

type TagFilterItem struct {
	Key          string    `json:"Key"`
	Operator     string    `json:"Operator"`
	StringValues []string  `json:"StringValues"`
	NumberValues []float64 `json:"NumberValues"`
	BoolValues   []bool    `json:"BoolValues"`
	TagType      string    `json:"TagType"`
}

// ResponseItem mirrors model.ServiceItem
type ResponseItem struct {
	ServiceName  string      `json:"serviceName"`
	Percentile99 float64     `json:"p99"`
	AvgDuration  float64     `json:"avgDuration"`
	NumCalls     uint64      `json:"numCalls"`
	CallRate     float64     `json:"callRate"`
	NumErrors    uint64      `json:"numErrors"`
	ErrorRate    float64     `json:"errorRate"`
	Num4XX       uint64      `json:"num4XX"`
	FourXXRate   float64     `json:"fourXXRate"`
	DataWarning  DataWarning `json:"dataWarning"`
}

type DataWarning struct {
	TopLevelOps []string `json:"topLevelOps"`
}

// For completeness with downstream potential usage
type ServiceErrorItem struct {
	Time      time.Time `json:"time"`
	Timestamp int64     `json:"timestamp"`
	NumErrors uint64    `json:"numErrors"`
}
