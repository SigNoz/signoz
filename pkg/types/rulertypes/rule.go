package ruletypes

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

type Rule struct {
	bun.BaseModel `bun:"table:rule"`
	types.Identifiable
	types.TimeAuditable
	types.UserAuditable
	Deleted int    `bun:"deleted,notnull,default:0"`
	Data    string `bun:"data,type:text,notnull"`
	OrgID   string `bun:"org_id,type:text"`
}
