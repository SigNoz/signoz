package retentiontypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/uptrace/bun"
)

const secondsPerDay = 24 * 60 * 60

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

// NewRetentionPolicySegment creates a retention policy segment for a half-open time range.
func NewRetentionPolicySegment(startMs int64, endMs int64, rules []CustomRetentionRule, defaultDays int) *RetentionPolicySegment {
	return &RetentionPolicySegment{
		StartMs:     startMs,
		EndMs:       endMs,
		Rules:       rules,
		DefaultDays: defaultDays,
	}
}

// BuildRetentionPolicySegmentsFromRows converts successful TTL settings into retention policy segments.
func BuildRetentionPolicySegmentsFromRows(rows []*TTLSetting, fallbackDefaultDays int, startMs, endMs int64) ([]*RetentionPolicySegment, error) {
	if startMs >= endMs {
		return nil, nil
	}

	var activeAtStart *TTLSetting
	inWindow := make([]*TTLSetting, 0, len(rows))
	for _, row := range rows {
		rowMs := row.CreatedAt.UnixMilli()
		if rowMs <= startMs {
			activeAtStart = row
			continue
		}
		if rowMs >= endMs {
			continue
		}
		inWindow = append(inWindow, row)
	}

	activeRules, activeDefault, err := parseTTLSetting(activeAtStart, fallbackDefaultDays)
	if err != nil {
		return nil, err
	}

	segments := make([]*RetentionPolicySegment, 0, len(inWindow)+1)
	cursor := startMs
	for _, row := range inWindow {
		rowMs := row.CreatedAt.UnixMilli()
		if rowMs <= cursor {
			activeRules, activeDefault, err = parseTTLSetting(row, fallbackDefaultDays)
			if err != nil {
				return nil, err
			}
			continue
		}
		segments = append(segments, NewRetentionPolicySegment(cursor, rowMs, activeRules, activeDefault))
		cursor = rowMs
		activeRules, activeDefault, err = parseTTLSetting(row, fallbackDefaultDays)
		if err != nil {
			return nil, err
		}
	}

	if cursor < endMs {
		segments = append(segments, NewRetentionPolicySegment(cursor, endMs, activeRules, activeDefault))
	}

	return segments, nil
}

func parseTTLSetting(row *TTLSetting, fallbackDefaultDays int) ([]CustomRetentionRule, int, error) {
	if row == nil {
		return nil, fallbackDefaultDays, nil
	}

	defaultDays := row.TTL
	if row.Condition == "" {
		defaultDays = (row.TTL + secondsPerDay - 1) / secondsPerDay
	}
	if defaultDays <= 0 {
		defaultDays = fallbackDefaultDays
	}

	if row.Condition == "" {
		return nil, defaultDays, nil
	}

	var rules []CustomRetentionRule
	if err := json.Unmarshal([]byte(row.Condition), &rules); err != nil {
		return nil, 0, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "parse ttl_setting condition for row %q", row.ID.StringValue())
	}

	return rules, defaultDays, nil
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
