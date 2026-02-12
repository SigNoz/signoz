package integrationstypes

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"
)

// CloudProvider defines the interface to be implemented by different cloud providers.
// This is generic interface so it will be accepting and returning generic types instead of concrete.
// It's the cloud provider's responsibility to cast them to appropriate types and validate
type CloudProvider interface {
	GetName() CloudProviderType

	AgentCheckIn(ctx context.Context, req *PostableAgentCheckInPayload) (any, error)
	GenerateConnectionArtifact(ctx context.Context, req *PostableConnectionArtifact) (any, error)
	GetAccountStatus(ctx context.Context, orgID, accountID string) (*GettableAccountStatus, error)

	ListServices(ctx context.Context, orgID string, accountID *string) (any, error) // returns either GettableAWSServices
	GetServiceDetails(ctx context.Context, req *GetServiceDetailsReq) (any, error)
	ListConnectedAccounts(ctx context.Context, orgID string) (*GettableConnectedAccountsList, error)
	GetDashboard(ctx context.Context, req *GettableDashboard) (*dashboardtypes.Dashboard, error)
	GetAvailableDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	UpdateAccountConfig(ctx context.Context, req *PatchableAccountConfig) (any, error) // req can be either PatchableAWSAccountConfig
	UpdateServiceConfig(ctx context.Context, req *PatchableServiceConfig) (any, error)

	DisconnectAccount(ctx context.Context, orgID, accountID string) (*CloudIntegration, error)
}

type GettableDashboard struct {
	ID    string
	OrgID valuer.UUID
}

type GettableCloudIntegrationConnectionParams struct {
	IngestionUrl string `json:"ingestion_url,omitempty"`
	IngestionKey string `json:"ingestion_key,omitempty"`
	SigNozAPIUrl string `json:"signoz_api_url,omitempty"`
	SigNozAPIKey string `json:"signoz_api_key,omitempty"`
}

type GettableIngestionKey struct {
	Name  string `json:"name"`
	Value string `json:"value"`
	// other attributes from gateway response not included here since they are not being used.
}

type GettableIngestionKeysSearch struct {
	Status string                 `json:"status"`
	Data   []GettableIngestionKey `json:"data"`
	Error  string                 `json:"error"`
}

type GettableCreateIngestionKey struct {
	Status string               `json:"status"`
	Data   GettableIngestionKey `json:"data"`
	Error  string               `json:"error"`
}

type GettableDeployment struct {
	Name        string `json:"name"`
	ClusterInfo struct {
		Region struct {
			DNS string `json:"dns"`
		} `json:"region"`
	} `json:"cluster"`
}

type GettableConnectedAccountsList struct {
	Accounts []*Account `json:"accounts"`
}

// SigNozAWSAgentConfig represents requirements for agent deployment in user's AWS account
type SigNozAWSAgentConfig struct {
	// The region in which SigNoz agent should be installed.
	Region string `json:"region"`

	IngestionUrl string `json:"ingestion_url"`
	IngestionKey string `json:"ingestion_key"`
	SigNozAPIUrl string `json:"signoz_api_url"`
	SigNozAPIKey string `json:"signoz_api_key"`

	Version string `json:"version,omitempty"`
}

type PostableConnectionArtifact struct {
	OrgID string
	Data  []byte // either PostableAWSConnectionUrl
}

type PostableAWSConnectionUrl struct {
	// Optional. To be specified for updates.
	// TODO: evaluate and remove if not needed.
	AccountId     *string               `json:"account_id,omitempty"`
	AccountConfig *AWSAccountConfig     `json:"account_config"`
	AgentConfig   *SigNozAWSAgentConfig `json:"agent_config"`
}

func (p *PostableAWSConnectionUrl) Unmarshal(src any) error {
	var data []byte
	switch src := src.(type) {
	case []byte:
		data = src
	case string:
		data = []byte(src)
	default:
		return errors.NewInternalf(errors.CodeInternal, "tried to scan from %T instead of string or bytes", src)
	}

	err := json.Unmarshal(data, p)
	if err != nil {
		return errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't deserialize aws connection url request from JSON",
		)
	}

	return nil
}

type GettableAWSConnectionUrl struct {
	AccountId     string `json:"account_id"`
	ConnectionUrl string `json:"connection_url"`
}

type GettableAccountStatus struct {
	Id             string        `json:"id"`
	CloudAccountId *string       `json:"cloud_account_id,omitempty"`
	Status         AccountStatus `json:"status"`
}

type PostableAgentCheckInPayload struct {
	ID        string `json:"account_id"`
	AccountID string `json:"cloud_account_id"`
	// Arbitrary cloud specific Agent data
	Data  map[string]any `json:"data,omitempty"`
	OrgID string         `json:"-"`
}

type GettableAWSAgentCheckIn struct {
	AccountId      string     `json:"account_id"`
	CloudAccountId string     `json:"cloud_account_id"`
	RemovedAt      *time.Time `json:"removed_at"`

	IntegrationConfig AWSAgentIntegrationConfig `json:"integration_config"`
}

type AWSAgentIntegrationConfig struct {
	EnabledRegions              []string               `json:"enabled_regions"`
	TelemetryCollectionStrategy *AWSCollectionStrategy `json:"telemetry,omitempty"`
}

type PatchableServiceConfig struct {
	OrgID     string `json:"org_id"`
	ServiceId string `json:"service_id"`
	Config    []byte `json:"config"` // json serialized config
}

type PatchableAWSCloudServiceConfig struct {
	CloudAccountId string                 `json:"cloud_account_id"`
	Config         *AWSCloudServiceConfig `json:"config"`
}

type AWSCloudServiceConfig struct {
	Logs    *AWSCloudServiceLogsConfig    `json:"logs,omitempty"`
	Metrics *AWSCloudServiceMetricsConfig `json:"metrics,omitempty"`
}

// Unmarshal unmarshalls data from src
func (c *PatchableAWSCloudServiceConfig) Unmarshal(src []byte) error {
	err := json.Unmarshal(src, c)
	if err != nil {
		return errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't deserialize aws service config req from JSON",
		)
	}

	return nil
}

// Marshal serializes data to bytes
func (c *PatchableAWSCloudServiceConfig) Marshal() ([]byte, error) {
	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't serialize aws service config req to JSON",
		)
	}
	return serialized, nil
}

// Unmarshal unmarshalls data from src
func (a *AWSCloudServiceConfig) Unmarshal(src []byte) error {
	err := json.Unmarshal(src, a)
	if err != nil {
		return errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't deserialize cloud service config from JSON",
		)
	}

	return nil
}

// Marshal serializes data to bytes
func (a *AWSCloudServiceConfig) Marshal() ([]byte, error) {
	serialized, err := json.Marshal(a)
	if err != nil {
		return nil, errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't serialize cloud service config to JSON",
		)
	}
	return serialized, nil
}

func (a *AWSCloudServiceConfig) Validate(def *AWSServiceDefinition) error {
	if def.Id != S3Sync && a.Logs != nil && a.Logs.S3Buckets != nil {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "s3 buckets can only be added to service-type[%s]", S3Sync)
	} else if def.Id == S3Sync && a.Logs != nil && a.Logs.S3Buckets != nil {
		for region := range a.Logs.S3Buckets {
			if _, found := ValidAWSRegions[region]; !found {
				return errors.NewInvalidInputf(CodeInvalidCloudRegion, "invalid cloud region: %s", region)
			}
		}
	}

	return nil
}

type PatchServiceConfigResponse struct {
	ServiceId string `json:"id"`
	Config    any    `json:"config"`
}

type PatchableAccountConfig struct {
	OrgID     string
	AccountId string
	Data      []byte // can be either AWSAccountConfig
}

type PatchableAWSAccountConfig struct {
	Config *AWSAccountConfig `json:"config"`
}

func (p *PatchableAWSAccountConfig) Unmarshal(src []byte) error {
	err := json.Unmarshal(src, p)
	if err != nil {
		return errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't deserialize patchable account config from JSON",
		)
	}

	return nil
}

func (p *PatchableAWSAccountConfig) Marshal() ([]byte, error) {
	if p == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "patchable account config is nil")
	}

	serialized, err := json.Marshal(p)
	if err != nil {
		return nil, errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't serialize patchable account config to JSON",
		)
	}
	return serialized, nil
}

type AWSAccountConfig struct {
	EnabledRegions []string `json:"regions"`
}

// Unmarshal unmarshalls data from src
func (c *AWSAccountConfig) Unmarshal(src []byte) error {
	err := json.Unmarshal(src, c)
	if err != nil {
		return errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't deserialize AWS account config from JSON",
		)
	}

	return nil
}

// Marshal serializes data to bytes
func (c *AWSAccountConfig) Marshal() ([]byte, error) {
	if c == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "cloud account config is nil")
	}

	serialized, err := json.Marshal(c)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't serialize cloud account config to JSON")
	}
	return serialized, nil
}

type GettableAWSServices struct {
	Services []AWSServiceSummary `json:"services"`
}

type GetServiceDetailsReq struct {
	OrgID          valuer.UUID
	ServiceId      string
	CloudAccountID *string
}

// --------------------------------------------------------------------------
// DATABASE TYPES
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// Cloud integration uses the cloud_integration table
// and cloud_integrations_service table
// --------------------------------------------------------------------------

type CloudIntegration struct {
	bun.BaseModel `bun:"table:cloud_integration"`

	types.Identifiable
	types.TimeAuditable
	Provider        string       `json:"provider" bun:"provider,type:text,unique:provider_id"`
	Config          string       `json:"config" bun:"config,type:text"` // json serialized config
	AccountID       *string      `json:"account_id" bun:"account_id,type:text"`
	LastAgentReport *AgentReport `json:"last_agent_report" bun:"last_agent_report,type:text"`
	RemovedAt       *time.Time   `json:"removed_at" bun:"removed_at,type:timestamp,nullzero"`
	OrgID           string       `bun:"org_id,type:text,unique:provider_id"`
}

func (a *CloudIntegration) Status() AccountStatus {
	status := AccountStatus{}
	if a.LastAgentReport != nil {
		lastHeartbeat := a.LastAgentReport.TimestampMillis
		status.Integration.LastHeartbeatTsMillis = &lastHeartbeat
	}
	return status
}

func (a *CloudIntegration) Account(cloudProvider CloudProviderType) *Account {
	ca := &Account{Id: a.ID.StringValue(), Status: a.Status()}

	if a.AccountID != nil {
		ca.CloudAccountId = *a.AccountID
	}

	ca.Config = map[string]interface{}{}

	if len(a.Config) < 1 {
		return ca
	}

	switch cloudProvider {
	case CloudProviderAWS:
		config := new(AWSAccountConfig)
		_ = config.Unmarshal([]byte(a.Config))
		ca.Config = config
	default:
	}

	return ca
}

type Account struct {
	Id             string        `json:"id"`
	CloudAccountId string        `json:"cloud_account_id"`
	Config         any           `json:"config"` // AWSAccountConfig
	Status         AccountStatus `json:"status"`
}

type AccountStatus struct {
	Integration AccountIntegrationStatus `json:"integration"`
}

type AccountIntegrationStatus struct {
	LastHeartbeatTsMillis *int64 `json:"last_heartbeat_ts_ms"`
}

func DefaultAWSAccountConfig() AWSAccountConfig {
	return AWSAccountConfig{
		EnabledRegions: []string{},
	}
}

type AWSServiceSummary struct {
	DefinitionMetadata
	Config *AWSCloudServiceConfig `json:"config"`
}

type GettableAWSServiceDetails struct {
	AWSServiceDefinition
	Config           *AWSCloudServiceConfig   `json:"config"`
	ConnectionStatus *ServiceConnectionStatus `json:"status,omitempty"`
}

type ServiceConnectionStatus struct {
	Logs    []*SignalConnectionStatus `json:"logs"`
	Metrics []*SignalConnectionStatus `json:"metrics"`
}

type SignalConnectionStatus struct {
	CategoryID           string `json:"category"`
	CategoryDisplayName  string `json:"category_display_name"`
	LastReceivedTsMillis int64  `json:"last_received_ts_ms"` // epoch milliseconds
	LastReceivedFrom     string `json:"last_received_from"`  // resource identifier
}

type AgentReport struct {
	TimestampMillis int64          `json:"timestamp_millis"`
	Data            map[string]any `json:"data"`
}

// Scan scans data from db
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

// Value serializes data to bytes for db insertion
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
	return string(serialized), nil
}

type CloudIntegrationService struct {
	bun.BaseModel `bun:"table:cloud_integration_service,alias:cis"`

	types.Identifiable
	types.TimeAuditable
	Type               string `bun:"type,type:text,notnull,unique:cloud_integration_id_type"`
	Config             string `bun:"config,type:text"` // json serialized config
	CloudIntegrationID string `bun:"cloud_integration_id,type:text,notnull,unique:cloud_integration_id_type,references:cloud_integrations(id),on_delete:cascade"`
}

type AWSCloudServiceLogsConfig struct {
	Enabled   bool                `json:"enabled"`
	S3Buckets map[string][]string `json:"s3_buckets,omitempty"`
}

type AWSCloudServiceMetricsConfig struct {
	Enabled bool `json:"enabled"`
}
