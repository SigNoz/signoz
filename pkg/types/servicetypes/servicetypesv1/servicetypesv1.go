package servicetypesv1

// Request mirrors the /services API input shape
type Request struct {
	// Start and End are epoch nanoseconds encoded as strings
	Start string          `json:"start"`
	End   string          `json:"end"`
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

// TopOperationsRequest is the request for /v2/service/top_operations
type TopOperationsRequest struct {
	Start   string          `json:"start"`
	End     string          `json:"end"`
	Service string          `json:"service"`
	Tags    []TagFilterItem `json:"tags"`
	Limit   int             `json:"limit,omitempty"`
}

// TopOperationItem is the response item for top operations
type TopOperationItem struct {
	Name       string  `json:"name"`
	P50        float64 `json:"p50"`
	P95        float64 `json:"p95"`
	P99        float64 `json:"p99"`
	NumCalls   uint64  `json:"numCalls"`
	ErrorCount uint64  `json:"errorCount"`
}
