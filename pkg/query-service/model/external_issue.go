package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/pkg/errors"
)

// ExternalIssueSystem represents the external system type
type ExternalIssueSystem string

const (
	ExternalIssueSystemJira   ExternalIssueSystem = "jira"
	ExternalIssueSystemGitHub ExternalIssueSystem = "github"
)

// SyncStatus represents the sync status of an external issue
type SyncStatus string

const (
	SyncStatusSynced  SyncStatus = "synced"
	SyncStatusPending SyncStatus = "pending"
	SyncStatusError   SyncStatus = "error"
)

// ExternalIssue represents a mapping between a SigNoz alert and an external issue tracker issue
type ExternalIssue struct {
	ID               string              `json:"id" db:"id"`
	AlertFingerprint uint64              `json:"alertFingerprint" db:"alert_fingerprint"`
	RuleID           string              `json:"ruleId" db:"rule_id"`
	RuleName         string              `json:"ruleName" db:"rule_name"`
	ExternalSystem   ExternalIssueSystem `json:"externalSystem" db:"external_system"`
	ExternalIssueID  string              `json:"externalIssueId" db:"external_issue_id"`
	ExternalIssueURL string              `json:"externalIssueUrl" db:"external_issue_url"`
	SyncStatus       SyncStatus          `json:"syncStatus" db:"sync_status"`
	LastSyncedAt     time.Time           `json:"lastSyncedAt" db:"last_synced_at"`
	SyncError        string              `json:"syncError,omitempty" db:"sync_error"`
	Metadata         ExternalIssueMetadata `json:"metadata" db:"metadata"`
	CreatedAt        time.Time           `json:"createdAt" db:"created_at"`
	UpdatedAt        time.Time           `json:"updatedAt" db:"updated_at"`
	OrgID            string              `json:"orgId" db:"org_id"`
}

// ExternalIssueMetadata stores additional system-specific data
type ExternalIssueMetadata map[string]interface{}

func (m ExternalIssueMetadata) Value() (driver.Value, error) {
	if m == nil {
		return "{}", nil
	}
	b, err := json.Marshal(m)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (m *ExternalIssueMetadata) Scan(value interface{}) error {
	if value == nil {
		*m = make(ExternalIssueMetadata)
		return nil
	}

	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.New("invalid metadata type")
	}

	return json.Unmarshal(data, m)
}

// CreateExternalIssueRequest represents a request to create an external issue mapping
type CreateExternalIssueRequest struct {
	AlertFingerprint uint64              `json:"alertFingerprint"`
	RuleID           string              `json:"ruleId"`
	ExternalSystem   ExternalIssueSystem `json:"externalSystem"`
	ExternalIssueID  string              `json:"externalIssueId"`
	ExternalIssueURL string              `json:"externalIssueUrl"`
	Metadata         ExternalIssueMetadata `json:"metadata,omitempty"`
}

// UpdateExternalIssueRequest represents a request to update an external issue mapping
type UpdateExternalIssueRequest struct {
	SyncStatus   SyncStatus            `json:"syncStatus,omitempty"`
	SyncError    string                `json:"syncError,omitempty"`
	Metadata     ExternalIssueMetadata `json:"metadata,omitempty"`
}

// ExternalIssueListResponse represents a list of external issues
type ExternalIssueListResponse struct {
	Items []ExternalIssue `json:"items"`
	Total int             `json:"total"`
}

// QueryExternalIssuesRequest represents a request to query external issues
type QueryExternalIssuesRequest struct {
	RuleID         string              `json:"ruleId,omitempty"`
	ExternalSystem ExternalIssueSystem `json:"externalSystem,omitempty"`
	SyncStatus     SyncStatus          `json:"syncStatus,omitempty"`
	Limit          int                 `json:"limit,omitempty"`
	Offset         int                 `json:"offset,omitempty"`
}
