package types

import (
	"github.com/uptrace/bun"
)

// TODO: check constraints are not working
type Organization struct {
	bun.BaseModel `bun:"table:organizations"`

	TimeAuditable
	ID              string `bun:"id,pk,type:text" json:"id"`
	Name            string `bun:"name,type:text,notnull" json:"name"`
	IsAnonymous     bool   `bun:"is_anonymous,notnull,default:0,CHECK(is_anonymous IN (0,1))" json:"isAnonymous"`
	HasOptedUpdates bool   `bun:"has_opted_updates,notnull,default:1,CHECK(has_opted_updates IN (0,1))" json:"hasOptedUpdates"`
}

type ApdexSettings struct {
	OrgID              string  `bun:"org_id,pk,type:text" json:"orgId"`
	ServiceName        string  `bun:"service_name,pk,type:text" json:"serviceName"`
	Threshold          float64 `bun:"threshold,type:float,notnull" json:"threshold"`
	ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull" json:"excludeStatusCodes"`
}
