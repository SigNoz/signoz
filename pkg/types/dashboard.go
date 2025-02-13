package types

import (
	"time"

	"github.com/uptrace/bun"
)

type Dashboard struct {
	bun.BaseModel `bun:"table:dashboards"`

	ID        int       `bun:"id,pk,autoincrement"`
	UUID      string    `bun:"uuid,type:text,notnull,unique"`
	CreatedAt time.Time `bun:"created_at,type:datetime,notnull"`
	CreatedBy string    `bun:"created_by,type:text,notnull"`
	UpdatedAt time.Time `bun:"updated_at,type:datetime,notnull"`
	UpdatedBy string    `bun:"updated_by,type:text,notnull"`
	Data      string    `bun:"data,type:text,notnull"`
	Locked    int       `bun:"locked,notnull,default:0"`
}

type Rule struct {
	bun.BaseModel `bun:"table:rules"`

	ID        int       `bun:"id,pk,autoincrement"`
	CreatedAt time.Time `bun:"created_at,type:datetime,notnull"`
	CreatedBy string    `bun:"created_by,type:text,notnull"`
	UpdatedAt time.Time `bun:"updated_at,type:datetime,notnull"`
	UpdatedBy string    `bun:"updated_by,type:text,notnull"`
	Deleted   int       `bun:"deleted,notnull,default:0"`
	Data      string    `bun:"data,type:text,notnull"`
}

type PlannedMaintenance struct {
	bun.BaseModel `bun:"table:planned_maintenance"`

	ID          int       `bun:"id,pk,autoincrement"`
	Name        string    `bun:"name,type:text,notnull"`
	Description string    `bun:"description,type:text"`
	AlertIDs    string    `bun:"alert_ids,type:text"`
	Schedule    string    `bun:"schedule,type:text,notnull"`
	CreatedAt   time.Time `bun:"created_at,type:datetime,notnull"`
	CreatedBy   string    `bun:"created_by,type:text,notnull"`
	UpdatedAt   time.Time `bun:"updated_at,type:datetime,notnull"`
	UpdatedBy   string    `bun:"updated_by,type:text,notnull"`
}

type TTLStatus struct {
	bun.BaseModel `bun:"table:ttl_status"`

	ID             int       `bun:"id,pk,autoincrement"`
	TransactionID  string    `bun:"transaction_id,type:text,notnull"`
	CreatedAt      time.Time `bun:"created_at,type:datetime,notnull"`
	UpdatedAt      time.Time `bun:"updated_at,type:datetime,notnull"`
	TableName      string    `bun:"table_name,type:text,notnull"`
	TTL            int       `bun:"ttl,notnull,default:0"`
	ColdStorageTTL int       `bun:"cold_storage_ttl,notnull,default:0"`
	Status         string    `bun:"status,type:text,notnull"`
}
