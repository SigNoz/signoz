package types

import (
	"time"

	"github.com/uptrace/bun"
)

type Pipeline struct {
	bun.BaseModel `bun:"table:pipelines"`

	ID          string    `bun:"id,pk,type:text"`
	OrderID     int       `bun:"order_id"`
	Enabled     bool      `bun:"enabled"`
	CreatedBy   string    `bun:"created_by,type:text"`
	CreatedAt   time.Time `bun:"created_at,default:current_timestamp"`
	Name        string    `bun:"name,type:varchar(400),notnull"`
	Alias       string    `bun:"alias,type:varchar(20),notnull"`
	Description string    `bun:"description,type:text"`
	Filter      string    `bun:"filter,type:text,notnull"`
	ConfigJSON  string    `bun:"config_json,type:text"`
}
