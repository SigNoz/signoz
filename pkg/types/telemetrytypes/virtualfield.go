package telemetrytypes

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

type VirtualField struct {
	bun.BaseModel `bun:"table:virtual_fields"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	OrgID       string `bun:"org_id,type:text,notnull" json:"orgId"`
	Name        string `bun:"name,type:text,notnull" json:"name"`
	Expression  string `bun:"expression,type:text,notnull" json:"expression"`
	Signal      Signal `bun:"signal,type:text,notnull" json:"signal"`
	Description string `bun:"description,type:text" json:"description"`
}
