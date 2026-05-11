package retentiontypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

const (
	DefaultLogsRetentionDays    = 15
	DefaultMetricsRetentionDays = 30
	DefaultTracesRetentionDays  = 15
)

const (
	TraceTTL   = "traces"
	MetricsTTL = "metrics"
	LogsTTL    = "logs"
)

const (
	TTLSettingStatusPending = "pending"
	TTLSettingStatusFailed  = "failed"
	TTLSettingStatusSuccess = "success"
)

// RetentionPolicySegment is a half-open time range using one retention policy.
type RetentionPolicySegment struct {
	StartMs     int64
	EndMs       int64
	Rules       []CustomRetentionRule
	DefaultDays int
}

// CustomRetentionRule is one custom retention rule as stored in ttl_setting.condition.
// Rules are evaluated in declaration order; the first matching rule wins.
type CustomRetentionRule struct {
	Filters []FilterCondition `json:"conditions"`
	TTLDays int               `json:"ttlDays"`
}

// FilterCondition is one label-key, allowed-values condition inside a retention rule.
type FilterCondition struct {
	Key    string   `json:"key"`
	Values []string `json:"values"`
}

type TTLSetting struct {
	bun.BaseModel `bun:"table:ttl_setting"`
	types.Identifiable
	types.TimeAuditable
	TransactionID  string `bun:"transaction_id,type:text,notnull"`
	TableName      string `bun:"table_name,type:text,notnull"`
	TTL            int    `bun:"ttl,notnull,default:0"`
	ColdStorageTTL int    `bun:"cold_storage_ttl,notnull,default:0"`
	Status         string `bun:"status,type:text,notnull"`
	OrgID          string `json:"-" bun:"org_id,notnull"`
	Condition      string `bun:"condition,type:text"`
}

type TTLParams struct {
	Type                  string
	ColdStorageVolume     string
	ToColdStorageDuration int64
	DelDuration           int64
}

type CustomRetentionTTLParams struct {
	Type                      string                `json:"type"`
	DefaultTTLDays            int                   `json:"defaultTTLDays"`
	TTLConditions             []CustomRetentionRule `json:"ttlConditions"`
	ColdStorageVolume         string                `json:"coldStorageVolume,omitempty"`
	ToColdStorageDurationDays int64                 `json:"coldStorageDurationDays,omitempty"`
}

type GetTTLParams struct {
	Type string
}

type GetCustomRetentionTTLResponse struct {
	Version string `json:"version"`
	Status  string `json:"status"`

	ExpectedLogsTime     int `json:"expected_logs_ttl_duration_hrs,omitempty"`
	ExpectedLogsMoveTime int `json:"expected_logs_move_ttl_duration_hrs,omitempty"`

	DefaultTTLDays     int                   `json:"default_ttl_days,omitempty"`
	TTLConditions      []CustomRetentionRule `json:"ttl_conditions,omitempty"`
	ColdStorageVolume  string                `json:"cold_storage_volume,omitempty"`
	ColdStorageTTLDays int                   `json:"cold_storage_ttl_days,omitempty"`
}

type CustomRetentionTTLResponse struct {
	Message string `json:"message"`
}

type TTLStatusItem struct {
	Id             int       `json:"id" db:"id"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	TableName      string    `json:"table_name" db:"table_name"`
	TTL            int       `json:"ttl" db:"ttl"`
	Status         string    `json:"status" db:"status"`
	ColdStorageTtl int       `json:"cold_storage_ttl" db:"cold_storage_ttl"`
}

type SetTTLResponseItem struct {
	Message string `json:"message"`
}

type DBResponseTTL struct {
	EngineFull string `ch:"engine_full"`
}

type GetTTLResponseItem struct {
	MetricsTime             int    `json:"metrics_ttl_duration_hrs,omitempty"`
	MetricsMoveTime         int    `json:"metrics_move_ttl_duration_hrs,omitempty"`
	TracesTime              int    `json:"traces_ttl_duration_hrs,omitempty"`
	TracesMoveTime          int    `json:"traces_move_ttl_duration_hrs,omitempty"`
	LogsTime                int    `json:"logs_ttl_duration_hrs,omitempty"`
	LogsMoveTime            int    `json:"logs_move_ttl_duration_hrs,omitempty"`
	ExpectedMetricsTime     int    `json:"expected_metrics_ttl_duration_hrs,omitempty"`
	ExpectedMetricsMoveTime int    `json:"expected_metrics_move_ttl_duration_hrs,omitempty"`
	ExpectedTracesTime      int    `json:"expected_traces_ttl_duration_hrs,omitempty"`
	ExpectedTracesMoveTime  int    `json:"expected_traces_move_ttl_duration_hrs,omitempty"`
	ExpectedLogsTime        int    `json:"expected_logs_ttl_duration_hrs,omitempty"`
	ExpectedLogsMoveTime    int    `json:"expected_logs_move_ttl_duration_hrs,omitempty"`
	Status                  string `json:"status"`
}
