package model

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

type HostListRequest struct {
	Start   int64             `json:"start"` // epoch time in ms
	End     int64             `json:"end"`   // epoch time in ms
	Filters *v3.FilterSet     `json:"filters"`
	GroupBy []v3.AttributeKey `json:"groupBy"`
}

type HostListRecord struct {
	HostName string            `json:"hostName"`
	Active   bool              `json:"active"`
	OS       string            `json:"os"`
	CPU      float64           `json:"cpu"`
	Memory   float64           `json:"memory"`
	Wait     float64           `json:"wait"`
	Storage  float64           `json:"storage"`
	Meta     map[string]string `json:"-"`
}

type HostListGroup struct {
	GroupValues     []string         `json:"groupValues"`
	Active          int              `json:"active"`
	Inactive        int              `json:"inactive"`
	GroupCPUAvg     float64          `json:"groupCPUAvg"`
	GroupMemoryAvg  float64          `json:"groupMemoryAvg"`
	GroupWaitAvg    float64          `json:"groupWaitAvg"`
	GroupStorageAvg float64          `json:"groupStorageAvg"`
	Records         []HostListRecord `json:"records"`
}

type HostListResponse struct {
	Type    string           `json:"type"`
	Records []HostListRecord `json:"records"`
	Groups  []HostListGroup  `json:"groups"`
}
