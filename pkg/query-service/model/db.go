package model

import (
	"time"
)

// InvitationObject represents the token object stored in the db
type InvitationObject struct {
	Id        string `json:"id" db:"id"`
	Email     string `json:"email" db:"email"`
	Name      string `json:"name" db:"name"`
	Token     string `json:"token" db:"token"`
	CreatedAt int64  `json:"createdAt" db:"created_at"`
	Role      string `json:"role" db:"role"`
	OrgId     string `json:"orgId" db:"org_id"`
}

type ApdexSettings struct {
	ServiceName        string  `json:"serviceName" db:"service_name"`
	Threshold          float64 `json:"threshold" db:"threshold"`
	ExcludeStatusCodes string  `json:"excludeStatusCodes" db:"exclude_status_codes"` // sqlite doesn't support array type
}

type IngestionKey struct {
	KeyId        string    `json:"keyId" db:"key_id"`
	Name         string    `json:"name" db:"name"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	IngestionKey string    `json:"ingestionKey" db:"ingestion_key"`
	IngestionURL string    `json:"ingestionURL" db:"ingestion_url"`
	DataRegion   string    `json:"dataRegion" db:"data_region"`
}

type ResetPasswordRequest struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}
