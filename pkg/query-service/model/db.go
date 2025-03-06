package model

import "time"

type ResetPasswordRequest struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}

type IngestionKey struct {
	KeyId        string    `json:"keyId" db:"key_id"`
	Name         string    `json:"name" db:"name"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	IngestionKey string    `json:"ingestionKey" db:"ingestion_key"`
	IngestionURL string    `json:"ingestionURL" db:"ingestion_url"`
	DataRegion   string    `json:"dataRegion" db:"data_region"`
}
