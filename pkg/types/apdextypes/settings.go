package apdextypes

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

type Settings struct {
	bun.BaseModel `bun:"table:apdex_setting"`
	types.Identifiable
	OrgID              string  `bun:"org_id,type:text" json:"orgId"`
	ServiceName        string  `bun:"service_name,type:text" json:"serviceName"`
	Threshold          float64 `bun:"threshold,type:float,notnull" json:"threshold"`
	ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull" json:"excludeStatusCodes"`
}
