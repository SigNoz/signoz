package types

import (
	"time"

	"github.com/uptrace/bun"
)

type License struct {
	bun.BaseModel `bun:"table:licenses"`

	Key               string    `bun:"key,pk,type:text"`
	CreatedAt         time.Time `bun:"createdAt,default:current_timestamp"`
	UpdatedAt         time.Time `bun:"updatedAt,default:current_timestamp"`
	PlanDetails       string    `bun:"planDetails,type:text"`
	ActivationID      string    `bun:"activationId,type:text"`
	ValidationMessage string    `bun:"validationMessage,type:text"`
	LastValidated     time.Time `bun:"lastValidated,default:current_timestamp"`
}

type Site struct {
	bun.BaseModel `bun:"table:sites"`

	UUID      string    `bun:"uuid,pk,type:text"`
	Alias     string    `bun:"alias,type:varchar(180),default:'PROD'"`
	URL       string    `bun:"url,type:varchar(300)"`
	CreatedAt time.Time `bun:"createdAt,default:current_timestamp"`
}

type FeatureStatus struct {
	bun.BaseModel `bun:"table:feature_status"`

	Name       string `bun:"name,pk,type:text" json:"name"`
	Active     bool   `bun:"active" json:"active"`
	Usage      int    `bun:"usage,default:0" json:"usage"`
	UsageLimit int    `bun:"usage_limit,default:0" json:"usage_limit"`
	Route      string `bun:"route,type:text" json:"route"`
}

type LicenseV3 struct {
	bun.BaseModel `bun:"table:licenses_v3"`

	ID   string `bun:"id,pk,type:text"`
	Key  string `bun:"key,type:text,notnull,unique"`
	Data string `bun:"data,type:text"`
}
