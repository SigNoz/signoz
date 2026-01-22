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
	Day    *LimitValue `json:"day,omitempty"`
	Second *LimitValue `json:"second,omitempty"`
}

type LimitValue struct {
	Size  int64 `json:"size,omitempty"`
	Count int64 `json:"count,omitempty"`
}

type LimitMetric struct {
	Day    *LimitMetricValue `json:"day,omitempty"`
	Second *LimitMetricValue `json:"second,omitempty"`
}

type LimitMetricValue struct {
	Count int64 `json:"count"`
	Size  int64 `json:"size"`
}

type Pagination struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Pages   int `json:"pages"`
	Total   int `json:"total"`
}

type GettableIngestionKeys struct {
	Keys       []IngestionKey `json:"keys"`
	Pagination Pagination     `json:"_pagination"`
}

type PostableIngestionKey struct {
	Name      string    `json:"name"`
	Tags      []string  `json:"tags"`
	ExpiresAt time.Time `json:"expires_at"`
}

type GettableCreatedIngestionKey struct {
	ID    string `json:"id"`
	Value string `json:"value"`
}

type PostableIngestionKeyLimit struct {
	Signal string      `json:"signal"`
	Config LimitConfig `json:"config"`
	Tags   []string    `json:"tags"`
}

type GettableCreatedIngestionKeyLimit struct {
	ID string `json:"id"`
}

type UpdatableIngestionKeyLimit struct {
	Config LimitConfig `json:"config"`
	Tags   []string    `json:"tags"`
}
