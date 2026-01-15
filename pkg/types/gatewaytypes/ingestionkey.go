package gatewaytypes

import (
	"time"
)

type IngestionKey struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Value       string    `json:"value"`
	ExpiresAt   time.Time `json:"expires_at"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	WorkspaceID string    `json:"workspace_id"`
	Limits      []Limit   `json:"limits"`
}

type Limit struct {
	ID        string      `json:"id"`
	Signal    string      `json:"signal"` // "logs", "traces", "metrics"
	Config    LimitConfig `json:"config"`
	Tags      []string    `json:"tags"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	KeyID     string      `json:"key_id"`
	Metric    LimitMetric `json:"metric"`
}

type LimitConfig struct {
	Day    *LimitThreshold `json:"day,omitempty"`
	Second *LimitThreshold `json:"second,omitempty"`
}

type LimitThreshold struct {
	Size  int64 `json:"size,omitempty"`
	Count int64 `json:"count,omitempty"`
}

type LimitMetric struct {
	Day    *UsageMetric `json:"day,omitempty"`
	Second *UsageMetric `json:"second,omitempty"`
}

type UsageMetric struct {
	Count int64 `json:"count"`
	Size  int64 `json:"size"`
}

type CreateIngestionKeyRequest struct {
	Name      string    `json:"name"`
	Tags      []string  `json:"tags"`
	ExpiresAt time.Time `json:"expires_at"`
}

type CreateIngestionKeyResponse struct {
	ID    string `json:"id"`
	Value string `json:"value"`
}
