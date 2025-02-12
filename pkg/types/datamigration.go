package types

import (
	"time"

	"github.com/uptrace/bun"
)

type DataMigration struct {
	bun.BaseModel `bun:"table:data_migrations"`
	ID            int       `bun:"id,pk,autoincrement"`
	Version       string    `bun:"version,unique,notnull,type:VARCHAR(255)"`
	CreatedAt     time.Time `bun:"created_at,notnull,default:current_timestamp"`
	Succeeded     bool      `bun:"succeeded,notnull,default:false"`
}
