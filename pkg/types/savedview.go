package types

import (
	"github.com/uptrace/bun"
)

type SavedView struct {
	bun.BaseModel `bun:"table:saved_views"`

	TimeAuditable
	UserAuditable
	OrgID      string `json:"orgId" bun:"org_id,notnull"`
	UUID       string `json:"uuid" bun:"uuid,pk,type:text"`
	Name       string `json:"name" bun:"name,type:text,notnull"`
	Category   string `json:"category" bun:"category,type:text,notnull"`
	SourcePage string `json:"sourcePage" bun:"source_page,type:text,notnull"`
	Tags       string `json:"tags" bun:"tags,type:text"`
	Data       string `json:"data" bun:"data,type:text,notnull"`
	ExtraData  string `json:"extraData" bun:"extra_data,type:text"`
}
