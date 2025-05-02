package thirdPartyApi

import v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"

type ThirdPartyApis struct {
	Start    int64             `json:"start"`
	End      int64             `json:"end"`
	ShowIp   bool              `json:"show_ip,omitempty"`
	Domain   int64             `json:"domain,omitempty"`
	Endpoint string            `json:"endpoint,omitempty"`
	Filters  v3.FilterSet      `json:"filters,omitempty"`
	GroupBy  []v3.AttributeKey `json:"groupBy,omitempty"`
}
