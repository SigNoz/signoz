package types

import "github.com/uptrace/bun"

type TraceFunnels struct {
	bun.BaseModel `bun:"table:trace_funnel"`

	TimeAuditable
	UserAuditable
	Identifiable
	OrgID       string `json:"orgId" bun:"org_id,notnull"`
	Name        string `json:"name" bun:"name,type:text,notnull"`
	Description string `json:"description" bun:"description,type:text"`
	Data        string `json:"data" bun:"data,type:text,notnull"`
}
