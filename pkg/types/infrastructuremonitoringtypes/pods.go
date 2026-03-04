package infrastructuremonitoringtypes

import (
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type PodsListRequest struct {
	Start   uint64               `json:"start"`
	End     uint64               `json:"end"`
	Filter  *qbtypes.Filter      `json:"filter,omitempty"`
	GroupBy []qbtypes.GroupByKey `json:"groupBy,omitempty"`
	OrderBy []qbtypes.OrderBy    `json:"orderBy,omitempty"`
	Offset  int                  `json:"offset"`
	Limit   int                  `json:"limit"`
}

type PodsListResponse struct {
	Type                     string           `json:"type"`
	Records                  []PodsListRecord `json:"records"`
	Total                    int              `json:"total"`
	SentAnyHostMetricsData   bool             `json:"sentAnyHostMetricsData"`
	IsSendingK8SAgentMetrics bool             `json:"isSendingK8SAgentMetrics"`
}

type PodsListRecord struct {
	PodUID           string            `json:"podUID,omitempty"`
	PodCPU           float64           `json:"podCPU"`
	PodCPURequest    float64           `json:"podCPURequest"`
	PodCPULimit      float64           `json:"podCPULimit"`
	PodMemory        float64           `json:"podMemory"`
	PodMemoryRequest float64           `json:"podMemoryRequest"`
	PodMemoryLimit   float64           `json:"podMemoryLimit"`
	RestartCount     int               `json:"restartCount"`
	Meta             map[string]string `json:"meta"`
}
