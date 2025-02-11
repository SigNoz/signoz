package types

import (
	"time"

	"github.com/uptrace/bun"
)

type SavedView struct {
	bun.BaseModel `bun:"table:saved_views"`

	UUID       string    `bun:"uuid,pk,type:text"`
	Name       string    `bun:"name,type:text,notnull"`
	Category   string    `bun:"category,type:text,notnull"`
	CreatedAt  time.Time `bun:"created_at,type:datetime,notnull"`
	CreatedBy  string    `bun:"created_by,type:text"`
	UpdatedAt  time.Time `bun:"updated_at,type:datetime,notnull"`
	UpdatedBy  string    `bun:"updated_by,type:text"`
	SourcePage string    `bun:"source_page,type:text,notnull"`
	Tags       string    `bun:"tags,type:text"`
	Data       string    `bun:"data,type:text,notnull"`
	ExtraData  string    `bun:"extra_data,type:text"`
}
