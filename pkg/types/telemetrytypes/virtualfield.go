package telemetrytypes

import (
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

type VirtualField struct {
	bun.BaseModel `bun:"table:virtual_field"`

	types.Identifiable
	types.TimeAuditable
	types.UserAuditable

	Name        string      `bun:"name,type:text,notnull" json:"name"`
	Expression  string      `bun:"expression,type:text,notnull" json:"expression"`
	Description string      `bun:"description,type:text" json:"description"`
	Signal      Signal      `bun:"signal,type:text,notnull" json:"signal"`
	OrgID       valuer.UUID `bun:"org_id,type:text,notnull" json:"orgId"`
}
