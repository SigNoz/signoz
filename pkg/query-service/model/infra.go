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
	ClusterNames             []string         `json:"clusterNames"`
	NodeNames                []string         `json:"nodeNames"`
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

func (r *PodListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].PodCPU > r.Records[j].PodCPU
		})
	case "cpu_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].PodCPURequest > r.Records[j].PodCPURequest
		})
	case "cpu_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].PodCPULimit > r.Records[j].PodCPULimit
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].PodMemory > r.Records[j].PodMemory
		})
	case "memory_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].PodMemoryRequest > r.Records[j].PodMemoryRequest
		})
	case "memory_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].PodMemoryLimit > r.Records[j].PodMemoryLimit
		})
	case "restarts":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].RestartCount > r.Records[j].RestartCount
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

func (r *NodeListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].NodeCPUUsage > r.Records[j].NodeCPUUsage
		})
	case "cpu_allocatable":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].NodeCPUAllocatable > r.Records[j].NodeCPUAllocatable
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].NodeMemoryUsage > r.Records[j].NodeMemoryUsage
		})
	case "memory_allocatable":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].NodeMemoryAllocatable > r.Records[j].NodeMemoryAllocatable
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

type NodeCountByCondition struct {
	Ready    int `json:"ready"`
	NotReady int `json:"notReady"`
	Unknown  int `json:"unknown"`
}

type NodeListRecord struct {
	NodeUID               string               `json:"nodeUID,omitempty"`
	NodeCPUUsage          float64              `json:"nodeCPUUsage"`
	NodeCPUAllocatable    float64              `json:"nodeCPUAllocatable"`
	NodeMemoryUsage       float64              `json:"nodeMemoryUsage"`
	NodeMemoryAllocatable float64              `json:"nodeMemoryAllocatable"`
	CountByCondition      NodeCountByCondition `json:"countByCondition"`
	Meta                  map[string]string    `json:"meta"`
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

func (r *NamespaceListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPUUsage > r.Records[j].CPUUsage
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryUsage > r.Records[j].MemoryUsage
		})
	case "pod_phase":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CountByPhase.Pending > r.Records[j].CountByPhase.Pending
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

type NamespaceListRecord struct {
	NamespaceName string            `json:"namespaceName"`
	CPUUsage      float64           `json:"cpuUsage"`
	MemoryUsage   float64           `json:"memoryUsage"`
	CountByPhase  PodCountByPhase   `json:"countByPhase"`
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

func (r *ClusterListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPUUsage > r.Records[j].CPUUsage
		})
	case "cpu_allocatable":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPUAllocatable > r.Records[j].CPUAllocatable
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryUsage > r.Records[j].MemoryUsage
		})
	case "memory_allocatable":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryAllocatable > r.Records[j].MemoryAllocatable
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

func (r *DeploymentListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPUUsage > r.Records[j].CPUUsage
		})
	case "cpu_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPURequest > r.Records[j].CPURequest
		})
	case "cpu_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPULimit > r.Records[j].CPULimit
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryUsage > r.Records[j].MemoryUsage
		})
	case "memory_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryRequest > r.Records[j].MemoryRequest
		})
	case "memory_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryLimit > r.Records[j].MemoryLimit
		})
	case "desired_pods":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].DesiredPods > r.Records[j].DesiredPods
		})
	case "available_pods":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].AvailablePods > r.Records[j].AvailablePods
		})
	case "restarts":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].Restarts > r.Records[j].Restarts
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

func (r *DaemonSetListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPUUsage > r.Records[j].CPUUsage
		})
	case "cpu_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPURequest > r.Records[j].CPURequest
		})
	case "cpu_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPULimit > r.Records[j].CPULimit
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryUsage > r.Records[j].MemoryUsage
		})
	case "memory_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryRequest > r.Records[j].MemoryRequest
		})
	case "memory_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryLimit > r.Records[j].MemoryLimit
		})
	case "restarts":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].Restarts > r.Records[j].Restarts
		})
	case "desired_nodes":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].DesiredNodes > r.Records[j].DesiredNodes
		})
	case "available_nodes":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].AvailableNodes > r.Records[j].AvailableNodes
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

func (r *StatefulSetListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPUUsage > r.Records[j].CPUUsage
		})
	case "cpu_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPURequest > r.Records[j].CPURequest
		})
	case "cpu_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPULimit > r.Records[j].CPULimit
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryUsage > r.Records[j].MemoryUsage
		})
	case "memory_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryRequest > r.Records[j].MemoryRequest
		})
	case "memory_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryLimit > r.Records[j].MemoryLimit
		})
	case "restarts":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].Restarts > r.Records[j].Restarts
		})
	case "desired_pods":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].DesiredPods > r.Records[j].DesiredPods
		})
	case "available_pods":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].AvailablePods > r.Records[j].AvailablePods
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

func (r *JobListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "cpu":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPUUsage > r.Records[j].CPUUsage
		})
	case "cpu_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPURequest > r.Records[j].CPURequest
		})
	case "cpu_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].CPULimit > r.Records[j].CPULimit
		})
	case "memory":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryUsage > r.Records[j].MemoryUsage
		})
	case "memory_request":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryRequest > r.Records[j].MemoryRequest
		})
	case "memory_limit":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].MemoryLimit > r.Records[j].MemoryLimit
		})
	case "restarts":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].Restarts > r.Records[j].Restarts
		})
	case "desired_successful_pods":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].DesiredSuccessfulPods > r.Records[j].DesiredSuccessfulPods
		})
	case "active_pods":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].ActivePods > r.Records[j].ActivePods
		})
	case "failed_pods":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].FailedPods > r.Records[j].FailedPods
		})
	case "successful_pods":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].SuccessfulPods > r.Records[j].SuccessfulPods
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

type VolumeListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
	OrderBy *v3.OrderBy       `json:"orderBy"`
	Offset  int               `json:"offset"`
	Limit   int               `json:"limit"`
}

type VolumeListResponse struct {
	Type    ResponseType       `json:"type"`
	Records []VolumeListRecord `json:"records"`
	Total   int                `json:"total"`
}

func (r *VolumeListResponse) SortBy(orderBy *v3.OrderBy) {
	switch orderBy.ColumnName {
	case "available":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].VolumeAvailable > r.Records[j].VolumeAvailable
		})
	case "capacity":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].VolumeCapacity > r.Records[j].VolumeCapacity
		})
	case "usage":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].VolumeUsage > r.Records[j].VolumeUsage
		})
	case "inodes":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].VolumeInodes > r.Records[j].VolumeInodes
		})
	case "inodes_free":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].VolumeInodesFree > r.Records[j].VolumeInodesFree
		})
	case "inodes_used":
		sort.Slice(r.Records, func(i, j int) bool {
			return r.Records[i].VolumeInodesUsed > r.Records[j].VolumeInodesUsed
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

type VolumeListRecord struct {
	PersistentVolumeClaimName string            `json:"persistentVolumeClaimName"`
	VolumeAvailable           float64           `json:"volumeAvailable"`
	VolumeCapacity            float64           `json:"volumeCapacity"`
	VolumeInodes              float64           `json:"volumeInodes"`
	VolumeInodesFree          float64           `json:"volumeInodesFree"`
	VolumeInodesUsed          float64           `json:"volumeInodesUsed"`
	VolumeUsage               float64           `json:"volumeUsage"`
	Meta                      map[string]string `json:"meta"`
}

type PodOnboardingStatus struct {
	ClusterName        string `json:"clusterName"`
	NodeName           string `json:"nodeName"`
	NamespaceName      string `json:"namespaceName"`
	PodName            string `json:"podName"`
	HasClusterName     bool   `json:"hasClusterName"`
	HasNodeName        bool   `json:"hasNodeName"`
	HasNamespaceName   bool   `json:"hasNamespaceName"`
	HasDeploymentName  bool   `json:"hasDeploymentName"`
	HasStatefulsetName bool   `json:"hasStatefulsetName"`
	HasDaemonsetName   bool   `json:"hasDaemonsetName"`
	HasCronjobName     bool   `json:"hasCronjobName"`
	HasJobName         bool   `json:"hasJobName"`
}

type OnboardingStatus struct {
	DidSendPodMetrics           bool                  `json:"didSendPodMetrics"`
	DidSendNodeMetrics          bool                  `json:"didSendNodeMetrics"`
	DidSendClusterMetrics       bool                  `json:"didSendClusterMetrics"`
	IsSendingOptionalPodMetrics bool                  `json:"isSendingOptionalPodMetrics"`
	IsSendingRequiredMetadata   []PodOnboardingStatus `json:"isSendingRequiredMetadata"`
}
