package integrationtypes

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

// NOTE:
// - When Account keyword is used in struct names, it refers cloud integration account. CloudIntegration refers to DB schema.
// - When Account Config keyword is used in struct names, it refers to configuration for cloud integration accounts
// - When Service keyword is used in struct names, it refers to cloud integration service. CloudIntegrationService refers to DB schema.
// 		where `service` is services provided by each cloud provider like AWS S3, Azure BlobStorage etc.
// - When Service Config keyword is used in struct names, it refers to configuration for cloud integration services

// Generic utility functions for JSON serialization/deserialization
// this is helpful to return right errors from a common place and avoid repeating the same code in multiple places.
// UnmarshalJSON is a generic function to unmarshal JSON data into any type
func UnmarshalJSON[T any](src []byte, target *T) error {
	err := json.Unmarshal(src, target)
	if err != nil {
		return errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't deserialize JSON",
		)
	}
	return nil
}

// MarshalJSON is a generic function to marshal any type to JSON
func MarshalJSON[T any](source *T) ([]byte, error) {
	if source == nil {
		return nil, errors.NewInternalf(errors.CodeInternal, "source is nil")
	}

	serialized, err := json.Marshal(source)
	if err != nil {
		return nil, errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't serialize to JSON",
		)
	}
	return serialized, nil
}

// CloudProvider defines the interface to be implemented by different cloud providers.
// This is generic interface so it will be accepting and returning generic types instead of concrete.
// It's the cloud provider's responsibility to cast them to appropriate types and validate
type CloudProvider interface {
	GetName() CloudProviderType

	// AgentCheckIn is called by agent to heartbeat and get latest config in response.
	AgentCheckIn(ctx context.Context, req *PostableAgentCheckInPayload) (any, error)
	GenerateConnectionArtifact(ctx context.Context, req *PostableConnectionArtifact) (any, error)
	GetAccountStatus(ctx context.Context, orgID, accountID string) (*GettableAccountStatus, error)

	ListServices(ctx context.Context, orgID string, accountID *string) (any, error) // returns either GettableAWSServices or GettableAzureServices
	GetServiceDetails(ctx context.Context, req *GetServiceDetailsReq) (any, error)
	ListConnectedAccounts(ctx context.Context, orgID string) (*GettableConnectedAccountsList, error)
	GetDashboard(ctx context.Context, id string, orgID valuer.UUID) (*dashboardtypes.Dashboard, error)
	GetAvailableDashboards(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error)

	UpdateAccountConfig(ctx context.Context, orgId valuer.UUID, accountId string, config []byte) (any, error)
	UpdateServiceConfig(ctx context.Context, serviceId string, orgID valuer.UUID, config []byte) (any, error)

	DisconnectAccount(ctx context.Context, orgID, accountID string) (*CloudIntegration, error)
}

// GettableConnectedAccountsList is the response for listing connected accounts for a cloud provider.
type GettableConnectedAccountsList struct {
	Accounts []*Account `json:"accounts"`
}

// SigNozAgentConfig represents parameters required for agent deployment in cloud provider accounts
// these represent parameters passed during agent deployment, how they are passed might change for each cloud provider but the purpose is same.
type SigNozAgentConfig struct {
	Region string `json:"region,omitempty"` // AWS-specific: The region in which SigNoz agent should be installed

	IngestionUrl string `json:"ingestion_url"`
	IngestionKey string `json:"ingestion_key"`
	SigNozAPIUrl string `json:"signoz_api_url"`
	SigNozAPIKey string `json:"signoz_api_key"`

	Version string `json:"version,omitempty"`
}

// PostableConnectionArtifact represent request body for generating connection artifact API.
// Data is request body raw bytes since each cloud provider will have have different request body structure and generics hardly help in such cases.
// Artifact is a generic name for different types of connection methods like connection URL for AWS, connection command for Azure etc.
type PostableConnectionArtifact struct {
	OrgID string
	Data  []byte // either PostableAWSConnectionUrl or PostableAzureConnectionCommand
}

// PostableAWSConnectionUrl is request body for AWS connection artifact API
type PostableAWSConnectionUrl struct {
	AgentConfig   *SigNozAgentConfig `json:"agent_config"`
	AccountConfig *AWSAccountConfig  `json:"account_config"`
}

// PostableAzureConnectionCommand is request body for Azure connection artifact API
type PostableAzureConnectionCommand struct {
	AgentConfig   *SigNozAgentConfig  `json:"agent_config"`
	AccountConfig *AzureAccountConfig `json:"account_config"`
}

// GettableAzureConnectionArtifact is Azure specific connection artifact which contains connection commands for agent deployment
type GettableAzureConnectionArtifact struct {
	AzureShellConnectionCommand string `json:"az_shell_connection_command"`
	AzureCliConnectionCommand   string `json:"az_cli_connection_command"`
}

// GettableAWSConnectionUrl is AWS specific connection artifact which contains connection url for agent deployment
type GettableAWSConnectionUrl struct {
	AccountId     string `json:"account_id"`
	ConnectionUrl string `json:"connection_url"`
}

// GettableAzureConnectionCommand is Azure specific connection artifact which contains connection commands for agent deployment
type GettableAzureConnectionCommand struct {
	AccountId                   string `json:"account_id"`
	AzureShellConnectionCommand string `json:"az_shell_connection_command"`
	AzureCliConnectionCommand   string `json:"az_cli_connection_command"`
}

// GettableAccountStatus is cloud integration account status response
type GettableAccountStatus struct {
	Id             string        `json:"id"`
	CloudAccountId *string       `json:"cloud_account_id,omitempty"`
	Status         AccountStatus `json:"status"`
}

// PostableAgentCheckInPayload is request body for agent check-in API.
// This is used by agent to send heartbeat.
type PostableAgentCheckInPayload struct {
	ID        string `json:"account_id"`
	AccountID string `json:"cloud_account_id"`
	// Arbitrary cloud specific Agent data
	Data  map[string]any `json:"data,omitempty"`
	OrgID string         `json:"-"`
}

// AWSAgentIntegrationConfig is used by agent for deploying infra to send telemetry to SigNoz
type AWSAgentIntegrationConfig struct {
	EnabledRegions              []string               `json:"enabled_regions"`
	TelemetryCollectionStrategy *AWSCollectionStrategy `json:"telemetry,omitempty"`
}

// AzureAgentIntegrationConfig is used by agent for deploying infra to send telemetry to SigNoz
type AzureAgentIntegrationConfig struct {
	DeploymentRegion      string   `json:"deployment_region"` // will not be changed once set
	EnabledResourceGroups []string `json:"resource_groups"`
	// TelemetryCollectionStrategy is map of service to telemetry config
	TelemetryCollectionStrategy map[string]*AzureCollectionStrategy `json:"telemetry,omitempty"`
}

// GettableAgentCheckInRes is generic response from agent check-in API.
// AWSAgentIntegrationConfig and AzureAgentIntegrationConfig these configs are used by agent to deploy the infra and send telemetry to SigNoz
type GettableAgentCheckInRes[AgentConfigT any] struct {
	AccountId         string       `json:"account_id"`
	CloudAccountId    string       `json:"cloud_account_id"`
	RemovedAt         *time.Time   `json:"removed_at"`
	IntegrationConfig AgentConfigT `json:"integration_config"`
}

// UpdatableServiceConfig is generic
type UpdatableServiceConfig[ServiceConfigT any] struct {
	CloudAccountId string         `json:"cloud_account_id"`
	Config         ServiceConfigT `json:"config"`
}

// ServiceConfigTyped is a generic interface for cloud integration service's configuration
// this is generic interface to define helper functions for CloudIntegrationService.Config field.
type ServiceConfigTyped[definition Definition] interface {
	Validate(def definition) error
	IsMetricsEnabled() bool
	IsLogsEnabled() bool
}

type AWSServiceConfig struct {
	Logs    *AWSServiceLogsConfig    `json:"logs,omitempty"`
	Metrics *AWSServiceMetricsConfig `json:"metrics,omitempty"`
}

type AWSServiceLogsConfig struct {
	Enabled   bool                `json:"enabled"`
	S3Buckets map[string][]string `json:"s3_buckets,omitempty"`
}

type AWSServiceMetricsConfig struct {
	Enabled bool `json:"enabled"`
}

// IsMetricsEnabled returns true if metrics collection is configured and enabled
func (a *AWSServiceConfig) IsMetricsEnabled() bool {
	return a.Metrics != nil && a.Metrics.Enabled
}

// IsLogsEnabled returns true if logs collection is configured and enabled
func (a *AWSServiceConfig) IsLogsEnabled() bool {
	return a.Logs != nil && a.Logs.Enabled
}

type AzureServiceConfig struct {
	Logs    []*AzureServiceLogsConfig    `json:"logs,omitempty"`
	Metrics []*AzureServiceMetricsConfig `json:"metrics,omitempty"`
}

// AzureServiceLogsConfig is Azure specific service config for logs
type AzureServiceLogsConfig struct {
	Enabled bool   `json:"enabled"`
	Name    string `json:"name"`
}

// AzureServiceMetricsConfig is Azure specific service config for metrics
type AzureServiceMetricsConfig struct {
	Enabled bool   `json:"enabled"`
	Name    string `json:"name"`
}

// IsMetricsEnabled returns true if any metric is configured and enabled
func (a *AzureServiceConfig) IsMetricsEnabled() bool {
	if a.Metrics == nil {
		return false
	}
	for _, m := range a.Metrics {
		if m.Enabled {
			return true
		}
	}
	return false
}

// IsLogsEnabled returns true if any log is configured and enabled
func (a *AzureServiceConfig) IsLogsEnabled() bool {
	if a.Logs == nil {
		return false
	}
	for _, l := range a.Logs {
		if l.Enabled {
			return true
		}
	}
	return false
}

func (a *AWSServiceConfig) Validate(def *AWSDefinition) error {
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

func (a *AzureServiceConfig) Validate(def *AzureDefinition) error {
	logsMap := make(map[string]bool)
	metricsMap := make(map[string]bool)

	if def.Strategy != nil && def.Strategy.Logs != nil {
		for _, log := range def.Strategy.Logs {
			logsMap[log.Name] = true
		}
	}

	if def.Strategy != nil && def.Strategy.Metrics != nil {
		for _, metric := range def.Strategy.Metrics {
			metricsMap[metric.Name] = true
		}
	}

	for _, log := range a.Logs {
		if _, found := logsMap[log.Name]; !found {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid log name: %s", log.Name)
		}
	}

	for _, metric := range a.Metrics {
		if _, found := metricsMap[metric.Name]; !found {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid metric name: %s", metric.Name)
		}
	}

	return nil
}

// UpdatableServiceConfigRes is response for UpdateServiceConfig API
// TODO: find a better way to name this
type UpdatableServiceConfigRes struct {
	ServiceId string `json:"id"`
	Config    any    `json:"config"`
}

// UpdatableAccountConfigTyped is a generic struct for updating cloud integration account config used in UpdateAccountConfig API
type UpdatableAccountConfigTyped[AccountConfigT any] struct {
	Config *AccountConfigT `json:"config"`
}

type UpdatableAWSAccountConfig = UpdatableAccountConfigTyped[AWSAccountConfig]
type UpdatableAzureAccountConfig = UpdatableAccountConfigTyped[AzureAccountConfig]

// AWSAccountConfig is the configuration for AWS cloud integration account
type AWSAccountConfig struct {
	EnabledRegions []string `json:"regions"`
}

// AzureAccountConfig is the configuration for Azure cloud integration account
type AzureAccountConfig struct {
	DeploymentRegion      string   `json:"deployment_region,omitempty"`
	EnabledResourceGroups []string `json:"resource_groups,omitempty"`
}

// GettableServices is a generic struct for listing services of a cloud integration account used in ListServices API
type GettableServices[ServiceSummaryT any] struct {
	Services []ServiceSummaryT `json:"services"`
}

type GettableAWSServices = GettableServices[AWSServiceSummary]
type GettableAzureServices = GettableServices[AzureServiceSummary]

// GetServiceDetailsReq is a req struct for getting service definition details
type GetServiceDetailsReq struct {
	OrgID          valuer.UUID
	ServiceId      string
	CloudAccountID *string
}

// ServiceSummary is a generic struct for service summary used in ListServices API
type ServiceSummary[ServiceConfigT any] struct {
	DefinitionMetadata
	Config *ServiceConfigT `json:"config"`
}

type AWSServiceSummary = ServiceSummary[AWSServiceConfig]
type AzureServiceSummary = ServiceSummary[AzureServiceConfig]

// GettableServiceDetails is a generic struct for service details used in GetServiceDetails API
type GettableServiceDetails[DefinitionT any, ServiceConfigT any] struct {
	Definition       DefinitionT              `json:",inline"`
	Config           ServiceConfigT           `json:"config"`
	ConnectionStatus *ServiceConnectionStatus `json:"status,omitempty"`
}

type GettableAWSServiceDetails = GettableServiceDetails[AWSDefinition, *AWSServiceConfig]
type GettableAzureServiceDetails = GettableServiceDetails[AzureDefinition, *AzureServiceConfig]

// Account represents a cloud integration account, this is used for business logic and API responses.
type Account struct {
	Id             string        `json:"id"`
	CloudAccountId string        `json:"cloud_account_id"`
	Config         any           `json:"config"` // AWSAccountConfig or AzureAccountConfig
	Status         AccountStatus `json:"status"`
}

// AccountStatus is generic struct for cloud integration account status
type AccountStatus struct {
	Integration AccountIntegrationStatus `json:"integration"`
}

// AccountIntegrationStatus stores heartbeat information from agent check in
type AccountIntegrationStatus struct {
	LastHeartbeatTsMillis *int64 `json:"last_heartbeat_ts_ms"`
}

// ServiceConnectionStatus represents integration connection status for a particular service
// this struct helps to check ingested data and determines connection status by whether data was ingested or not.
// this is composite struct for both metrics and logs
type ServiceConnectionStatus struct {
	Logs    []*SignalConnectionStatus `json:"logs"`
	Metrics []*SignalConnectionStatus `json:"metrics"`
}

// SignalConnectionStatus represents connection status for a particular signal type (logs or metrics) for a service
// this struct is used in API responses for clients to show relevant information about the connection status.
type SignalConnectionStatus struct {
	CategoryID           string `json:"category"`
	CategoryDisplayName  string `json:"category_display_name"`
	LastReceivedTsMillis int64  `json:"last_received_ts_ms"` // epoch milliseconds
	LastReceivedFrom     string `json:"last_received_from"`  // resource identifier
}

// GettableCloudIntegrationConnectionParams is response for connection params API
type GettableCloudIntegrationConnectionParams struct {
	IngestionUrl string `json:"ingestion_url,omitempty"`
	IngestionKey string `json:"ingestion_key,omitempty"`
	SigNozAPIUrl string `json:"signoz_api_url,omitempty"`
	SigNozAPIKey string `json:"signoz_api_key,omitempty"`
}

// GettableIngestionKey is a struct for ingestion key returned from gateway
type GettableIngestionKey struct {
	Name  string `json:"name"`
	Value string `json:"value"`
	// other attributes from gateway response not included here since they are not being used.
}

// GettableIngestionKeysSearch is a struct for response of ingestion keys search API on gateway
type GettableIngestionKeysSearch struct {
	Status string                 `json:"status"`
	Data   []GettableIngestionKey `json:"data"`
	Error  string                 `json:"error"`
}

// GettableCreateIngestionKey is a struct for response of create ingestion key API on gateway
type GettableCreateIngestionKey struct {
	Status string               `json:"status"`
	Data   GettableIngestionKey `json:"data"`
	Error  string               `json:"error"`
}

// GettableDeployment is response struct for deployment details fetched from Zeus
type GettableDeployment struct {
	Name        string `json:"name"`
	ClusterInfo struct {
		Region struct {
			DNS string `json:"dns"`
		} `json:"region"`
	} `json:"cluster"`
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
		_ = UnmarshalJSON([]byte(a.Config), config)
		ca.Config = config
	case CloudProviderAzure:
		config := new(AzureAccountConfig)
		_ = UnmarshalJSON([]byte(a.Config), config)
		ca.Config = config
	default:
	}

	return ca
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
	return serialized, nil
}

type CloudIntegrationService struct {
	bun.BaseModel `bun:"table:cloud_integration_service,alias:cis"`

	types.Identifiable
	types.TimeAuditable
	Type               string `bun:"type,type:text,notnull,unique:cloud_integration_id_type"`
	Config             string `bun:"config,type:text"` // json serialized config
	CloudIntegrationID string `bun:"cloud_integration_id,type:text,notnull,unique:cloud_integration_id_type,references:cloud_integrations(id),on_delete:cascade"`
}
