package model

import v3 "go.signoz.io/signoz/pkg/query-service/model/v3"

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
	Meta             map[string]string `json:"-"`
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
	Type    string           `json:"type"`
	Records []HostListRecord `json:"records"`
	Groups  []HostListGroup  `json:"groups"`
	Total   int              `json:"total"`
}
