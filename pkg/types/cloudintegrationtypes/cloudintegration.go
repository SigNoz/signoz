package cloudintegrationtypes

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeUnsupported                          = errors.MustNewCode("cloud_integration_unsupported")
	ErrCodeInvalidInput                         = errors.MustNewCode("cloud_integration_invalid_input")
	ErrCodeCloudIntegrationNotFound             = errors.MustNewCode("cloud_integration_not_found")
	ErrCodeCloudIntegrationAlreadyExists        = errors.MustNewCode("cloud_integration_already_exists")
	ErrCodeCloudIntegrationAlreadyConnected     = errors.MustNewCode("cloud_integration_already_connected")
	ErrCodeCloudIntegrationInvalidConfig        = errors.MustNewCode("cloud_integration_invalid_config")
	ErrCodeCloudIntegrationRemoved              = errors.MustNewCode("cloud_integration_removed")
	ErrCodeCloudIntegrationServiceNotFound      = errors.MustNewCode("cloud_integration_service_not_found")
	ErrCodeCloudIntegrationServiceAlreadyExists = errors.MustNewCode("cloud_integration_service_already_exists")
	ErrCodeServiceDefinitionNotFound            = errors.MustNewCode("service_definition_not_found")
)

// StorableCloudIntegration represents a cloud integration stored in the database.
// This is also referred as "Account" in the context of cloud integrations.
type StorableCloudIntegration struct {
	bun.BaseModel `bun:"table:cloud_integration"`
	types.Identifiable
	types.TimeAuditable

	Provider        CloudProviderType    `bun:"provider,type:text"`
	Config          string               `bun:"config,type:text"` // Config is provider-specific data in JSON string format
	AccountID       *string              `bun:"account_id,type:text"`
	LastAgentReport *StorableAgentReport `bun:"last_agent_report,type:text"`
	RemovedAt       *time.Time           `bun:"removed_at,type:timestamp,nullzero"`
	OrgID           valuer.UUID          `bun:"org_id,type:text"`
}

// StorableAgentReport represents the last heartbeat and arbitrary data sent by the agent
// as of now there is no use case for Data field, but keeping it for backwards compatibility with older structure.
type StorableAgentReport struct {
	TimestampMillis int64          `json:"timestamp_millis"` // backward compatibility
	Data            map[string]any `json:"data"`
}

// StorableCloudIntegrationService is to store service config for a cloud integration, which is a cloud provider specific configuration.
type StorableCloudIntegrationService struct {
	bun.BaseModel `bun:"table:cloud_integration_service,alias:cis"`
	types.Identifiable
	types.TimeAuditable

	Type               ServiceID   `bun:"type,type:text,notnull"` // Keeping Type field name as is, but it is a service id
	Config             string      `bun:"config,type:text"`       // Config is cloud provider's service specific data in JSON string format
	CloudIntegrationID valuer.UUID `bun:"cloud_integration_id,type:text"`
}

// Following Service config types are only internally used to store service config in DB and use JSON snake case keys for backward compatibility.

type StorableServiceConfig struct {
	AWS *StorableAWSServiceConfig
}

type StorableAWSServiceConfig struct {
	Logs    *StorableAWSLogsServiceConfig    `json:"logs,omitempty"`
	Metrics *StorableAWSMetricsServiceConfig `json:"metrics,omitempty"`
}

type StorableAWSLogsServiceConfig struct {
	Enabled   bool                `json:"enabled"`
	S3Buckets map[string][]string `json:"s3_buckets,omitempty"` // region -> list of buckets in that region
}

type StorableAWSMetricsServiceConfig struct {
	Enabled bool `json:"enabled"`
}

// Scan scans value from DB.
func (r *StorableAgentReport) Scan(src any) error {
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

// Value creates value to be stored in DB.
func (r *StorableAgentReport) Value() (driver.Value, error) {
	serialized, err := json.Marshal(r)
	if err != nil {
		return nil, errors.WrapInternalf(
			err, errors.CodeInternal, "couldn't serialize agent report to JSON",
		)
	}
	// Return as string instead of []byte to ensure PostgreSQL stores as text, not bytes
	return string(serialized), nil
}

func NewStorableCloudIntegration(account *Account) (*StorableCloudIntegration, error) {
	configBytes, err := account.Config.ToJSON()
	if err != nil {
		return nil, err
	}

	storableAccount := &StorableCloudIntegration{
		Identifiable:  account.Identifiable,
		TimeAuditable: account.TimeAuditable,
		Provider:      account.Provider,
		Config:        string(configBytes),
		AccountID:     account.ProviderAccountID,
		OrgID:         account.OrgID,
		RemovedAt:     account.RemovedAt,
	}

	if account.AgentReport != nil {
		storableAccount.LastAgentReport = &StorableAgentReport{
			TimestampMillis: account.AgentReport.TimestampMillis,
			Data:            account.AgentReport.Data,
		}
	}

	return storableAccount, nil
}

// NewStorableCloudIntegrationService creates a new StorableCloudIntegrationService with
// generated ID and timestamps from a CloudIntegrationService and its serialized config JSON.
func NewStorableCloudIntegrationService(svc *CloudIntegrationService, configJSON string) *StorableCloudIntegrationService {
	return &StorableCloudIntegrationService{
		Identifiable:       svc.Identifiable,
		TimeAuditable:      svc.TimeAuditable,
		Type:               svc.Type,
		Config:             configJSON,
		CloudIntegrationID: svc.CloudIntegrationID,
	}
}

func (account *StorableCloudIntegration) Update(providerAccountID *string, agentReport *AgentReport) {
	account.AccountID = providerAccountID
	if agentReport != nil {
		account.LastAgentReport = &StorableAgentReport{
			TimestampMillis: agentReport.TimestampMillis,
			Data:            agentReport.Data,
		}
	}
}

// following StorableServiceConfig related functions are helper functions to convert between JSON string and ServiceConfig domain struct.
func newStorableServiceConfig(provider CloudProviderType, serviceID ServiceID, serviceConfig *ServiceConfig, supportedSignals *SupportedSignals) (*StorableServiceConfig, error) {
	switch provider {
	case CloudProviderTypeAWS:
		storableAWSServiceConfig := new(StorableAWSServiceConfig)

		if supportedSignals.Logs {
			if serviceConfig.AWS.Logs == nil {
				return nil, errors.NewInvalidInputf(ErrCodeCloudIntegrationInvalidConfig, "logs config is required for AWS service: %s", serviceID.StringValue())
			}

			storableAWSServiceConfig.Logs = &StorableAWSLogsServiceConfig{
				Enabled: serviceConfig.AWS.Logs.Enabled,
			}

			if serviceID == AWSServiceS3Sync {
				if serviceConfig.AWS.Logs.S3Buckets == nil {
					return nil, errors.NewInvalidInputf(ErrCodeCloudIntegrationInvalidConfig, "s3 buckets config is required for AWS S3 Sync service")
				}

				storableAWSServiceConfig.Logs.S3Buckets = serviceConfig.AWS.Logs.S3Buckets
			}
		}

		if supportedSignals.Metrics {
			if serviceConfig.AWS.Metrics == nil {
				return nil, errors.NewInvalidInputf(ErrCodeCloudIntegrationInvalidConfig, "metrics config is required for AWS service: %s", serviceID.StringValue())
			}

			storableAWSServiceConfig.Metrics = &StorableAWSMetricsServiceConfig{
				Enabled: serviceConfig.AWS.Metrics.Enabled,
			}
		}

		return &StorableServiceConfig{AWS: storableAWSServiceConfig}, nil
	default:
		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}

func newStorableServiceConfigFromJSON(provider CloudProviderType, jsonStr string) (*StorableServiceConfig, error) {
	switch provider {
	case CloudProviderTypeAWS:
		awsConfig := new(StorableAWSServiceConfig)
		err := json.Unmarshal([]byte(jsonStr), awsConfig)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't parse AWS service config JSON")
		}
		return &StorableServiceConfig{AWS: awsConfig}, nil
	default:
		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}

func (config *StorableServiceConfig) toJSON(provider CloudProviderType) ([]byte, error) {
	switch provider {
	case CloudProviderTypeAWS:
		jsonBytes, err := json.Marshal(config.AWS)
		if err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "couldn't serialize AWS service config to JSON")
		}

		return jsonBytes, nil
	default:
		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}
