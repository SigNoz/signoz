package types

import (
	"fmt"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type ThirdPartyApiRequest struct {
	Start    uint64               `json:"start"`
	End      uint64               `json:"end"`
	ShowIp   bool                 `json:"show_ip,omitempty"`
	Domain   string               `json:"domain,omitempty"`
	Endpoint string               `json:"endpoint,omitempty"`
	Filter   *qbtypes.Filter      `json:"filters,omitempty"`
	GroupBy  []qbtypes.GroupByKey `json:"groupBy,omitempty"`
}

// Validate validates the ThirdPartyApiRequest
func (req *ThirdPartyApiRequest) Validate() error {
	if req.Start >= req.End {
		return fmt.Errorf("start time must be before end time")
	}

	if req.Filter != nil && req.Filter.Expression == "" {
		return fmt.Errorf("filter expression cannot be empty when filter is provided")
	}

	return nil
}
