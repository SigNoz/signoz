package gatewaytypes

import (
	"time"
)

type IngestionKey struct {
	ID          string    `json:"id,omitempty"`
	Name        string    `json:"name,omitempty"`
	Value       string    `json:"value,omitempty"`
	ExpiresAt   time.Time `json:"expires_at,omitempty"`
	Tags        []string  `json:"tags,omitempty"`
	CreatedAt   time.Time `json:"created_at,omitempty"`
	UpdatedAt   time.Time `json:"updated_at,omitempty"`
	WorkspaceID string    `json:"workspace_id,omitempty"`
	Limits      []struct {
		ID     string `json:"id,omitempty"`
		Signal string `json:"signal,omitempty"`
		Config struct {
			Day struct {
				Size int `json:"size,omitempty"`
			} `json:"day,omitempty"`
			Second struct {
				Size int `json:"size,omitempty"`
			} `json:"second,omitempty"`
		} `json:"config,omitempty"`
		Tags      []any     `json:"tags,omitempty"`
		CreatedAt time.Time `json:"created_at,omitempty"`
		UpdatedAt time.Time `json:"updated_at,omitempty"`
		KeyID     string    `json:"key_id,omitempty"`
		Metric    struct {
			Day struct {
				Count int `json:"count,omitempty"`
				Size  int `json:"size,omitempty"`
			} `json:"day,omitempty"`
			Second struct {
				Count int `json:"count,omitempty"`
				Size  int `json:"size,omitempty"`
			} `json:"second,omitempty"`
		} `json:"metric,omitempty"`
	} `json:"limits,omitempty"`
}
