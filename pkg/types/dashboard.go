package types

import (
	"database/sql/driver"
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"

	"github.com/gosimple/slug"
	"github.com/uptrace/bun"
)

type Dashboard struct {
	bun.BaseModel `bun:"table:dashboards"`

	TimeAuditable
	UserAuditable
	OrgID  string        `json:"-" bun:"org_id,notnull"`
	ID     int           `json:"id" bun:"id,pk,autoincrement"`
	UUID   string        `json:"uuid" bun:"uuid,type:text,notnull,unique"`
	Data   DashboardData `json:"data" bun:"data,type:text,notnull"`
	Locked *int          `json:"isLocked" bun:"locked,notnull,default:0"`

	Slug  string `json:"-" bun:"-"`
	Title string `json:"-" bun:"-"`
}

// UpdateSlug updates the slug
func (d *Dashboard) UpdateSlug() {
	var title string

	if val, ok := d.Data["title"]; ok {
		title = val.(string)
	}

	d.Slug = SlugifyTitle(title)
}

func SlugifyTitle(title string) string {
	s := slug.Make(strings.ToLower(title))
	if s == "" {
		// If the dashboard name is only characters outside of the
		// sluggable characters, the slug creation will return an
		// empty string which will mess up URLs. This failsafe picks
		// that up and creates the slug as a base64 identifier instead.
		s = base64.RawURLEncoding.EncodeToString([]byte(title))
		if slug.MaxLength != 0 && len(s) > slug.MaxLength {
			s = s[:slug.MaxLength]
		}
	}
	return s
}

type DashboardData map[string]interface{}

func (c DashboardData) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *DashboardData) Scan(src interface{}) error {
	var data []byte
	if b, ok := src.([]byte); ok {
		data = b
	} else if s, ok := src.(string); ok {
		data = []byte(s)
	}
	return json.Unmarshal(data, c)
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
