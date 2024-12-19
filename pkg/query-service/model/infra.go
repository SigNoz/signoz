package model

import (
	"sort"

	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

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
	Type                     ResponseType     `json:"type"`
	Records                  []HostListRecord `json:"records"`
	Total                    int              `json:"total"`
	SentAnyHostMetricsData   bool             `json:"sentAnyHostMetricsData"`
	IsSendingK8SAgentMetrics bool             `json:"isSendingK8SAgentMetrics"`
}

func (r *HostListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPU > r.Records[j].CPU
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].Memory > r.Records[j].Memory
		})
	case "load15":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].Load15 > r.Records[j].Load15
		})
	case "wait":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].Wait > r.Records[j].Wait
		})
	}
	// the default is descending
	if orderBy.Order == v3.DirectionAsc {
		// reverse the list
		for i, j := 0, len(r.Records)-1; i < j; i, j = i+1, j-1 {
			r.Records[i], r.Records[j] = r.Records[j], r.Records[i]
		}
	}
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

type DeploymentListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type DeploymentListResponse struct {
	Type    ResponseType           `json:"type"`
	Records []DeploymentListRecord `json:"records"`
	Total   int                    `json:"total"`
}

type DeploymentListRecord struct {
	DeploymentName string            `json:"deploymentName"`
	CPUUsage       float64           `json:"cpuUsage"`
	MemoryUsage    float64           `json:"memoryUsage"`
	DesiredPods    int               `json:"desiredPods"`
	AvailablePods  int               `json:"availablePods"`
	CPURequest     float64           `json:"cpuRequest"`
	MemoryRequest  float64           `json:"memoryRequest"`
	CPULimit       float64           `json:"cpuLimit"`
	MemoryLimit    float64           `json:"memoryLimit"`
	Restarts       int               `json:"restarts"`
	Meta           map[string]string `json:"meta"`
}

type DaemonSetListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type DaemonSetListResponse struct {
	Type    ResponseType          `json:"type"`
	Records []DaemonSetListRecord `json:"records"`
	Total   int                   `json:"total"`
}

type DaemonSetListRecord struct {
	DaemonSetName  string            `json:"daemonSetName"`
	CPUUsage       float64           `json:"cpuUsage"`
	MemoryUsage    float64           `json:"memoryUsage"`
	CPURequest     float64           `json:"cpuRequest"`
	MemoryRequest  float64           `json:"memoryRequest"`
	CPULimit       float64           `json:"cpuLimit"`
	MemoryLimit    float64           `json:"memoryLimit"`
	Restarts       int               `json:"restarts"`
	DesiredNodes   int               `json:"desiredNodes"`
	AvailableNodes int               `json:"availableNodes"`
	Meta           map[string]string `json:"meta"`
}

type StatefulSetListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type StatefulSetListResponse struct {
	Type    ResponseType            `json:"type"`
	Records []StatefulSetListRecord `json:"records"`
	Total   int                     `json:"total"`
}

type StatefulSetListRecord struct {
	StatefulSetName string            `json:"statefulSetName"`
	CPUUsage        float64           `json:"cpuUsage"`
	MemoryUsage     float64           `json:"memoryUsage"`
	CPURequest      float64           `json:"cpuRequest"`
	MemoryRequest   float64           `json:"memoryRequest"`
	CPULimit        float64           `json:"cpuLimit"`
	MemoryLimit     float64           `json:"memoryLimit"`
	Restarts        int               `json:"restarts"`
	DesiredPods     int               `json:"desiredPods"`
	AvailablePods   int               `json:"availablePods"`
	Meta            map[string]string `json:"meta"`
}

type JobListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type JobListResponse struct {
	Type    ResponseType    `json:"type"`
	Records []JobListRecord `json:"records"`
	Total   int             `json:"total"`
}

type JobListRecord struct {
	JobName               string            `json:"jobName"`
	CPUUsage              float64           `json:"cpuUsage"`
	MemoryUsage           float64           `json:"memoryUsage"`
	CPURequest            float64           `json:"cpuRequest"`
	MemoryRequest         float64           `json:"memoryRequest"`
	CPULimit              float64           `json:"cpuLimit"`
	MemoryLimit           float64           `json:"memoryLimit"`
	Restarts              int               `json:"restarts"`
	DesiredSuccessfulPods int               `json:"desiredSuccessfulPods"`
	ActivePods            int               `json:"activePods"`
	FailedPods            int               `json:"failedPods"`
	SuccessfulPods        int               `json:"successfulPods"`
	Meta                  map[string]string `json:"meta"`
}
