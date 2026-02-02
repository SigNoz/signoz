package types

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"
)

type IntegrationUserEmail string

const (
	AWSIntegrationUserEmail IntegrationUserEmail = "aws-integration@signoz.io"
)

var AllIntegrationUserEmails = []IntegrationUserEmail{
	AWSIntegrationUserEmail,
}

// --------------------------------------------------------------------------
// Normal integration uses just the installed_integration table
// --------------------------------------------------------------------------

type InstalledIntegration struct {
	bun.BaseModel `bun:"table:installed_integration"`

	Identifiable
	Type        string                     `json:"type" bun:"type,type:text,unique:org_id_type"`
	Config      InstalledIntegrationConfig `json:"config" bun:"config,type:text"`
	InstalledAt time.Time                  `json:"installed_at" bun:"installed_at,default:current_timestamp"`
	OrgID       string                     `json:"org_id" bun:"org_id,type:text,unique:org_id_type,references:organizations(id),on_delete:cascade"`
}

type InstalledIntegrationConfig map[string]interface{}

// For serializing from db
func (c *InstalledIntegrationConfig) Scan(src interface{}) error {
	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.NewInternalf(errors.CodeInternal, "tried to scan from %T instead of string or bytes", src)
	}

	return json.Unmarshal(data, c)
}

// For serializing to db
func (c *InstalledIntegrationConfig) Value() (driver.Value, error) {
	filterSetJson, err := json.Marshal(c)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "could not serialize integration config to JSON")
	}
	return filterSetJson, nil
}

// --------------------------------------------------------------------------
// Cloud integration uses the cloud_integration table
// and cloud_integrations_service table
// --------------------------------------------------------------------------

type CloudIntegration struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	Identifiable
	TimeAuditable
	Provider        string         `json:"provider" bun:"provider,type:text,unique:provider_id"`
	Config          *AccountConfig `json:"config" bun:"config,type:text"`
	AccountID       *string        `json:"account_id" bun:"account_id,type:text"`
	LastAgentReport *AgentReport   `json:"last_agent_report" bun:"last_agent_report,type:text"`
	RemovedAt       *time.Time     `json:"removed_at" bun:"removed_at,type:timestamp,nullzero"`
	OrgID           string         `bun:"org_id,type:text,unique:provider_id"`
}

func (a *CloudIntegration) Status() AccountStatus {
	status := AccountStatus{}
	if a.LastAgentReport != nil {
		lastHeartbeat := a.LastAgentReport.TimestampMillis
		status.Integration.LastHeartbeatTsMillis = &lastHeartbeat
	}
	return status
}

func (a *CloudIntegration) Account() Account {
	ca := Account{Id: a.ID.StringValue(), Status: a.Status()}

	if a.AccountID != nil {
		ca.CloudAccountId = *a.AccountID
	}

	if a.Config != nil {
		ca.Config = *a.Config
	} else {
		ca.Config = DefaultAccountConfig()
	}
	return ca
}

type Account struct {
	Id             string        `json:"id"`
	CloudAccountId string        `json:"cloud_account_id"`
	Config         AccountConfig `json:"config"`
	Status         AccountStatus `json:"status"`
}

type AccountStatus struct {
	Integration AccountIntegrationStatus `json:"integration"`
}

type AccountIntegrationStatus struct {
	LastHeartbeatTsMillis *int64 `json:"last_heartbeat_ts_ms"`
}

func DefaultAccountConfig() AccountConfig {
	return AccountConfig{
		EnabledRegions: []string{},
	}
}

type AccountConfig struct {
	EnabledRegions []string `json:"regions"`
}

// For serializing from db
func (c *AccountConfig) Scan(src any) error {
	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.NewInternalf(errors.CodeInternal, "tried to scan from %T instead of string or bytes", src)
	}

	return json.Unmarshal(data, c)
}

// For serializing to db
func (c *AccountConfig) Value() (driver.Value, error) {
	if c == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "cloud account config is nil")
	}

	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't serialize cloud account config to JSON")
	}
	return serialized, nil
}

type AgentReport struct {
	TimestampMillis int64          `json:"timestamp_millis"`
	Data            map[string]any `json:"data"`
}

// For serializing from db
func (r *AgentReport) Scan(src any) error {
	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.NewInternalf(errors.CodeInternal, "tried to scan from %T instead of string or bytes", src)
	}

	return json.Unmarshal(data, r)
}

// For serializing to db
func (r *AgentReport) Value() (driver.Value, error) {
	if r == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "agent report is nil")
	}

	serialized, err := json.Marshal(r)
	if err != nil {
		return nil, errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't serialize agent report to JSON",
		)
	}
	return serialized, nil
}

type CloudIntegrationService struct {
	bun.BaseModel `bun:"table:cloud_integration_service,alias:cis"`

	Identifiable
	TimeAuditable
	Type               string             `bun:"type,type:text,notnull,unique:cloud_integration_id_type"`
	Config             CloudServiceConfig `bun:"config,type:text"`
	CloudIntegrationID string             `bun:"cloud_integration_id,type:text,notnull,unique:cloud_integration_id_type,references:cloud_integrations(id),on_delete:cascade"`
}

type CloudServiceLogsConfig struct {
	Enabled   bool                `json:"enabled"`
	S3Buckets map[string][]string `json:"s3_buckets,omitempty"`
}

type CloudServiceMetricsConfig struct {
	Enabled bool `json:"enabled"`
}

type CloudServiceConfig struct {
	Logs    *CloudServiceLogsConfig    `json:"logs,omitempty"`
	Metrics *CloudServiceMetricsConfig `json:"metrics,omitempty"`
}

// For serializing from db
func (c *CloudServiceConfig) Scan(src any) error {
	var data []byte
	switch src := src.(type) {
	case []byte:
		data = src
	case string:
		data = []byte(src)
	default:
		return errors.NewInternalf(errors.CodeInternal, "tried to scan from %T instead of string or bytes", src)
	}

	return json.Unmarshal(data, c)
}

// For serializing to db
func (c *CloudServiceConfig) Value() (driver.Value, error) {
	if c == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "cloud service config is nil")
	}

	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't serialize cloud service config to JSON",
		)
	}
	return serialized, nil
}
