package model

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

type (
	ResponseType string
)

const (
	ResponseTypeList        ResponseType = "list"
	ResponseTypeGroupedList ResponseType = "grouped_list"
)

type HostListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type HostListRecord struct {
	HostName         string            `json:"hostName"`
	Active           bool              `json:"active"`
	OS               string            `json:"os"`
	CPU              float64           `json:"cpu"`
	CPUTimeSeries    *v3.Series        `json:"cpuTimeSeries"`
	Memory           float64           `json:"memory"`
	MemoryTimeSeries *v3.Series        `json:"memoryTimeSeries"`
	Wait             float64           `json:"wait"`
	WaitTimeSeries   *v3.Series        `json:"waitTimeSeries"`
	Load15           float64           `json:"load15"`
	Load15TimeSeries *v3.Series        `json:"load15TimeSeries"`
	Meta             map[string]string `json:"meta"`
}

type HostListGroup struct {
	GroupValues    []string `json:"groupValues"`
	Active         int      `json:"active"`
	Inactive       int      `json:"inactive"`
	GroupCPUAvg    float64  `json:"groupCPUAvg"`
	GroupMemoryAvg float64  `json:"groupMemoryAvg"`
	GroupWaitAvg   float64  `json:"groupWaitAvg"`
	GroupLoad15Avg float64  `json:"groupLoad15Avg"`
	HostNames      []string `json:"hostNames"`
}

type HostListResponse struct {
	Type    ResponseType     `json:"type"`
	Records []HostListRecord `json:"records"`
	Groups  []HostListGroup  `json:"groups"`
	Total   int              `json:"total"`
}

type ProcessListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type ProcessListResponse struct {
	Type    ResponseType        `json:"type"`
	Records []ProcessListRecord `json:"records"`
	Groups  []ProcessListGroup  `json:"groups"`
	Total   int                 `json:"total"`
}

type ProcessListRecord struct {
	ProcessName             string            `json:"processName"`
	ProcessID               string            `json:"processID"`
	ProcessCMD              string            `json:"processCMD"`
	ProcessCMDLine          string            `json:"processCMDLine"`
	ProcessCPU              float64           `json:"processCPU"`
	ProcessCPUTimeSeries    *v3.Series        `json:"processCPUTimeSeries"`
	ProcessMemory           float64           `json:"processMemory"`
	ProcessMemoryTimeSeries *v3.Series        `json:"processMemoryTimeSeries"`
	Meta                    map[string]string `json:"meta"`
}

type ProcessListGroup struct {
	GroupValues    []string `json:"groupValues"`
	GroupCPUAvg    float64  `json:"groupCPUAvg"`
	GroupMemoryAvg float64  `json:"groupMemoryAvg"`
	ProcessNames   []string `json:"processNames"`
}

type PodListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type PodListResponse struct {
	Type    ResponseType    `json:"type"`
	Records []PodListRecord `json:"records"`
	Groups  []PodListGroup  `json:"groups"`
	Total   int             `json:"total"`
}

type PodListRecord struct {
	PodName                    string            `json:"podName"`
	PodUID                     string            `json:"podUID"`
	PodCPU                     float64           `json:"podCPU"`
	PodCPUTimeSeries           *v3.Series        `json:"podCPUTimeSeries"`
	PodCPURequest              float64           `json:"podCPURequest"`
	PodCPURequestTimeSeries    *v3.Series        `json:"podCPURequestTimeSeries"`
	PodCPULimit                float64           `json:"podCPULimit"`
	PodCPULimitTimeSeries      *v3.Series        `json:"podCPULimitTimeSeries"`
	PodMemory                  float64           `json:"podMemory"`
	PodMemoryTimeSeries        *v3.Series        `json:"podMemoryTimeSeries"`
	PodMemoryRequest           float64           `json:"podMemoryRequest"`
	PodMemoryRequestTimeSeries *v3.Series        `json:"podMemoryRequestTimeSeries"`
	PodMemoryLimit             float64           `json:"podMemoryLimit"`
	PodMemoryLimitTimeSeries   *v3.Series        `json:"podMemoryLimitTimeSeries"`
	Meta                       map[string]string `json:"meta"`
}

type PodListGroup struct {
	GroupValues           []string `json:"groupValues"`
	GroupCPUAvg           float64  `json:"groupCPUAvg"`
	GroupMemoryAvg        float64  `json:"groupMemoryAvg"`
	GroupCPURequestAvg    float64  `json:"groupCPURequestAvg"`
	GroupCPULimitAvg      float64  `json:"groupCPULimitAvg"`
	GroupMemoryRequestAvg float64  `json:"groupMemoryRequestAvg"`
	GroupMemoryLimitAvg   float64  `json:"groupMemoryLimitAvg"`
	PodNames              []string `json:"podNames"`
}

type NodeListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type NodeListResponse struct {
	Type    ResponseType     `json:"type"`
	Records []NodeListRecord `json:"records"`
	Groups  []NodeListGroup  `json:"groups"`
	Total   int              `json:"total"`
}

type NodeListRecord struct {
	NodeName                    string            `json:"nodeName"`
	NodeUID                     string            `json:"nodeUID"`
	NodeCPU                     float64           `json:"nodeCPU"`
	NodeCPUTimeSeries           *v3.Series        `json:"nodeCPUTimeSeries"`
	NodeCPURequest              float64           `json:"nodeCPURequest"`
	NodeCPURequestTimeSeries    *v3.Series        `json:"nodeCPURequestTimeSeries"`
	NodeCPULimit                float64           `json:"nodeCPULimit"`
	NodeCPULimitTimeSeries      *v3.Series        `json:"nodeCPULimitTimeSeries"`
	NodeMemory                  float64           `json:"nodeMemory"`
	NodeMemoryTimeSeries        *v3.Series        `json:"nodeMemoryTimeSeries"`
	NodeMemoryRequest           float64           `json:"nodeMemoryRequest"`
	NodeMemoryRequestTimeSeries *v3.Series        `json:"nodeMemoryRequestTimeSeries"`
	NodeMemoryLimit             float64           `json:"nodeMemoryLimit"`
	NodeMemoryLimitTimeSeries   *v3.Series        `json:"nodeMemoryLimitTimeSeries"`
	Meta                        map[string]string `json:"meta"`
}

type NodeListGroup struct {
	GroupValues    []string `json:"groupValues"`
	GroupCPUAvg    float64  `json:"groupCPUAvg"`
	GroupMemoryAvg float64  `json:"groupMemoryAvg"`
	NodeNames      []string `json:"nodeNames"`
}
