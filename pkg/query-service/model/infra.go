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
	HostName string            `json:"hostName"`
	Active   bool              `json:"active"`
	OS       string            `json:"os"`
	CPU      float64           `json:"cpu"`
	Memory   float64           `json:"memory"`
	Wait     float64           `json:"wait"`
	Load15   float64           `json:"load15"`
	Meta     map[string]string `json:"meta"`
}

type HostListResponse struct {
	Type    ResponseType     `json:"type"`
	Records []HostListRecord `json:"records"`
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
	Total   int                 `json:"total"`
}

type ProcessListRecord struct {
	ProcessName    string            `json:"processName"`
	ProcessID      string            `json:"processID"`
	ProcessCMD     string            `json:"processCMD"`
	ProcessCMDLine string            `json:"processCMDLine"`
	ProcessCPU     float64           `json:"processCPU"`
	ProcessMemory  float64           `json:"processMemory"`
	Meta           map[string]string `json:"meta"`
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
	Total   int             `json:"total"`
}

type PodListRecord struct {
	PodUID           string            `json:"podUID,omitempty"`
	PodCPU           float64           `json:"podCPU"`
	PodCPURequest    float64           `json:"podCPURequest"`
	PodCPULimit      float64           `json:"podCPULimit"`
	PodMemory        float64           `json:"podMemory"`
	PodMemoryRequest float64           `json:"podMemoryRequest"`
	PodMemoryLimit   float64           `json:"podMemoryLimit"`
	RestartCount     int               `json:"restartCount"`
	Meta             map[string]string `json:"meta"`
	CountByPhase     PodCountByPhase   `json:"countByPhase"`
}

type PodCountByPhase struct {
	Pending   int `json:"pending"`
	Running   int `json:"running"`
	Succeeded int `json:"succeeded"`
	Failed    int `json:"failed"`
	Unknown   int `json:"unknown"`
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
	Total   int              `json:"total"`
}

type NodeListRecord struct {
	NodeUID               string            `json:"nodeUID,omitempty"`
	NodeCPUUsage          float64           `json:"nodeCPUUsage"`
	NodeCPUAllocatable    float64           `json:"nodeCPUAllocatable"`
	NodeMemoryUsage       float64           `json:"nodeMemoryUsage"`
	NodeMemoryAllocatable float64           `json:"nodeMemoryAllocatable"`
	Meta                  map[string]string `json:"meta"`
}

type NamespaceListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type NamespaceListResponse struct {
	Type    ResponseType          `json:"type"`
	Records []NamespaceListRecord `json:"records"`
	Total   int                   `json:"total"`
}

type NamespaceListRecord struct {
	NamespaceName string            `json:"namespaceName"`
	CPUUsage      float64           `json:"cpuUsage"`
	MemoryUsage   float64           `json:"memoryUsage"`
	Meta          map[string]string `json:"meta"`
}

type ClusterListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type ClusterListResponse struct {
	Type    ResponseType        `json:"type"`
	Records []ClusterListRecord `json:"records"`
	Total   int                 `json:"total"`
}

type ClusterListRecord struct {
	ClusterUID        string            `json:"clusterUID"`
	CPUUsage          float64           `json:"cpuUsage"`
	CPUAllocatable    float64           `json:"cpuAllocatable"`
	MemoryUsage       float64           `json:"memoryUsage"`
	MemoryAllocatable float64           `json:"memoryAllocatable"`
	Meta              map[string]string `json:"meta"`
}
