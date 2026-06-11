package cloudintegrationtypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type CloudIntegrationService struct {
	types.Identifiable
	types.TimeAuditable
	Type               ServiceID      `json:"type"`
	Config             *ServiceConfig `json:"config"`
	CloudIntegrationID valuer.UUID    `json:"cloudIntegrationId"`
}

type ServiceConfig struct {
	AWS   *AWSServiceConfig   `json:"aws,omitempty" required:"false" nullable:"false"`
	Azure *AzureServiceConfig `json:"azure,omitempty" required:"false" nullable:"false"`
}

// ServiceMetadata helps to quickly list available services and whether it is enabled or not.
// As getting complete service definition is a heavy operation and the response is also large,
// initial integration page load can be very slow.
type ServiceMetadata struct {
	ServiceDefinitionMetadata
	// if the service is enabled for the account
	Enabled bool `json:"enabled" required:"true"`
}

// ServiceDefinitionMetadata represents service definition metadata. This is useful for showing service tab in frontend.
type ServiceDefinitionMetadata struct {
	ID    string `json:"id" required:"true"`
	Title string `json:"title" required:"true"`
	Icon  string `json:"icon" required:"true"`
}

type GettableServicesMetadata struct {
	Services []*ServiceMetadata `json:"services" required:"true" nullable:"false"`
}

type ListServicesMetadataParams struct {
	CloudIntegrationID valuer.UUID `query:"cloud_integration_id" required:"false"`
}

// Service represents a cloud integration service with its definition,
// cloud integration service is non nil only when the service entry exists in DB with ANY config (enabled or disabled).
type Service struct {
	ServiceDefinitionMetadata
	Overview                string                   `json:"overview" required:"true"` // markdown
	ServiceAssets           ServiceAssets            `json:"assets" required:"true"`
	SupportedSignals        SupportedSignals         `json:"supportedSignals" required:"true"`
	DataCollected           DataCollected            `json:"dataCollected" required:"true"`
	CloudIntegrationService *CloudIntegrationService `json:"cloudIntegrationService" required:"true" nullable:"true"`
}

type ServiceAssets struct {
	Dashboards []*ServiceDashboard `json:"dashboards" required:"true" nullable:"false"`
}

type GetServiceParams struct {
	CloudIntegrationID valuer.UUID `query:"cloud_integration_id" required:"false"`
}

type UpdatableService struct {
	Config *ServiceConfig `json:"config" required:"true" nullable:"false"`
}

type ServiceDefinition struct {
	ServiceDefinitionMetadata
	Overview                    string                       `json:"overview" required:"true"` // markdown
	Assets                      Assets                       `json:"assets" required:"true"`
	SupportedSignals            SupportedSignals             `json:"supportedSignals" required:"true"`
	DataCollected               DataCollected                `json:"dataCollected" required:"true"`
	TelemetryCollectionStrategy *TelemetryCollectionStrategy `json:"telemetryCollectionStrategy" required:"true" nullable:"false"`
}

// SupportedSignals for cloud provider's service.
type SupportedSignals struct {
	Logs    bool `json:"logs"`
	Metrics bool `json:"metrics"`
}

// DataCollected is curated static list of metrics and logs, this is shown as part of service overview.
type DataCollected struct {
	Logs    []CollectedLogAttribute `json:"logs"`
	Metrics []CollectedMetric       `json:"metrics"`
}

// TelemetryCollectionStrategy is cloud provider specific configuration for signal collection,
// this is used by agent to understand the nitty-gritty for collecting telemetry for the cloud provider.
type TelemetryCollectionStrategy struct {
	AWS   *AWSTelemetryCollectionStrategy   `json:"aws,omitempty" required:"false" nullable:"false"`
	Azure *AzureTelemetryCollectionStrategy `json:"azure,omitempty" required:"false" nullable:"false"`
}

// Assets represents the collection of dashboards.
type Assets struct {
	Dashboards []Dashboard `json:"dashboards"`
}

// CollectedLogAttribute represents a log attribute that is present in all log entries for a service,
// this is shown as part of service overview.
type CollectedLogAttribute struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
}

// CollectedMetric represents a metric that is collected for a service, this is shown as part of service overview.
type CollectedMetric struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Unit        string `json:"unit"`
	Description string `json:"description"`
}

// Dashboard represents a dashboard definition for cloud integration.
// This is used to show available pre-made dashboards for a service,
// hence has additional fields like id, title and description.
type Dashboard struct {
	ID          string                               `json:"id"`
	Title       string                               `json:"title"`
	Description string                               `json:"description"`
	Definition  dashboardtypes.StorableDashboardData `json:"definition,omitempty"`
}

type ServiceDashboard struct {
	Title                string                `json:"title" required:"true"`
	Description          string                `json:"description" required:"true"`
	IntegrationDashboard *IntegrationDashboard `json:"integrationDashboard,omitempty" required:"false"`
}

func NewCloudIntegrationService(serviceID ServiceID, cloudIntegrationID valuer.UUID, provider CloudProviderType, config *ServiceConfig) (*CloudIntegrationService, error) {
	switch provider {
	case CloudProviderTypeAWS:
		if config.AWS == nil {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "AWS config is required for AWS service")
		}
	case CloudProviderTypeAzure:
		if config.Azure == nil {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "Azure config is required for Azure service")
		}
	}

	return &CloudIntegrationService{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Type:               serviceID,
		Config:             config,
		CloudIntegrationID: cloudIntegrationID,
	}, nil
}

func NewCloudIntegrationServiceFromStorable(stored *StorableCloudIntegrationService, config *ServiceConfig) *CloudIntegrationService {
	return &CloudIntegrationService{
		Identifiable:       stored.Identifiable,
		TimeAuditable:      stored.TimeAuditable,
		Type:               stored.Type,
		Config:             config,
		CloudIntegrationID: stored.CloudIntegrationID,
	}
}

func NewServiceMetadata(definition ServiceDefinition, enabled bool) *ServiceMetadata {
	return &ServiceMetadata{
		ServiceDefinitionMetadata: definition.ServiceDefinitionMetadata,
		Enabled:                   enabled,
	}
}

func NewService(provider CloudProviderType, def *ServiceDefinition, integrationService *CloudIntegrationService, integrationDashboards []*StorableIntegrationDashboard) *Service {
	service := &Service{
		ServiceDefinitionMetadata: def.ServiceDefinitionMetadata,
		Overview:                  def.Overview,
		SupportedSignals:          def.SupportedSignals,
		DataCollected:             def.DataCollected,
		CloudIntegrationService:   integrationService,
		ServiceAssets:             ServiceAssets{Dashboards: make([]*ServiceDashboard, 0, len(def.Assets.Dashboards))},
	}

	integrationDashboardsMap := make(map[string]*IntegrationDashboard)
	for _, d := range integrationDashboards {
		integrationDashboardsMap[d.Slug] = d
	}

	for _, d := range def.Assets.Dashboards {
		dashboard := &ServiceDashboard{
			Title:       d.Title,
			Description: d.Description,
		}

		if integrationService != nil {
			slug := CloudIntegrationDashboardSlug(provider, integrationService.Type, d.ID)

			if integrationDashboard, exists := integrationDashboardsMap[slug]; exists {
				if integrationDashboard != nil {
					dashboard.IntegrationDashboard = integrationDashboard
				}
			}
		}

		service.ServiceAssets.Dashboards = append(service.ServiceAssets.Dashboards, dashboard)
	}

	return service
}

func NewGettableServicesMetadata(services []*ServiceMetadata) *GettableServicesMetadata {
	return &GettableServicesMetadata{
		Services: services,
	}
}

func NewServiceConfigFromJSON(provider CloudProviderType, jsonString string) (*ServiceConfig, error) {
	storableServiceConfig, err := newStorableServiceConfigFromJSON(provider, jsonString)
	if err != nil {
		return nil, err
	}

	switch provider {
	case CloudProviderTypeAWS:
		awsServiceConfig := new(AWSServiceConfig)

		if storableServiceConfig.AWS.Logs != nil {
			awsServiceConfig.Logs = &AWSServiceLogsConfig{
				Enabled:   storableServiceConfig.AWS.Logs.Enabled,
				S3Buckets: storableServiceConfig.AWS.Logs.S3Buckets,
			}
		}

		if storableServiceConfig.AWS.Metrics != nil {
			awsServiceConfig.Metrics = &AWSServiceMetricsConfig{
				Enabled: storableServiceConfig.AWS.Metrics.Enabled,
			}
		}

		return &ServiceConfig{AWS: awsServiceConfig}, nil
	case CloudProviderTypeAzure:
		azureServiceConfig := new(AzureServiceConfig)

		if storableServiceConfig.Azure.Logs != nil {
			azureServiceConfig.Logs = &AzureServiceLogsConfig{
				Enabled: storableServiceConfig.Azure.Logs.Enabled,
			}
		}

		if storableServiceConfig.Azure.Metrics != nil {
			azureServiceConfig.Metrics = &AzureServiceMetricsConfig{
				Enabled: storableServiceConfig.Azure.Metrics.Enabled,
			}
		}

		return &ServiceConfig{Azure: azureServiceConfig}, nil
	default:
		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}

// Update sets the service config.
func (service *CloudIntegrationService) Update(provider CloudProviderType, serviceID ServiceID, config *ServiceConfig) error {
	switch provider {
	case CloudProviderTypeAWS:
		if config.AWS == nil {
			return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "AWS config is required for AWS service")
		}

		if serviceID == AWSServiceS3Sync {
			if config.AWS.Logs == nil || config.AWS.Logs.S3Buckets == nil {
				return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "AWS S3 Sync service requires S3 bucket configuration for logs")
			}
		}

		// other validations happen in newStorableServiceConfig
	case CloudProviderTypeAzure:
		if config.Azure == nil {
			return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "Azure config is required for Azure service")
		}
	default:
		return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}

	service.Config = config
	service.UpdatedAt = time.Now()
	return nil
}

// IsServiceEnabled returns true if the service has at least one signal (logs or metrics) enabled
// for the given cloud provider.
func (config *ServiceConfig) IsServiceEnabled(provider CloudProviderType) bool {
	switch provider {
	case CloudProviderTypeAWS:
		logsEnabled := config.AWS.Logs != nil && config.AWS.Logs.Enabled
		metricsEnabled := config.AWS.Metrics != nil && config.AWS.Metrics.Enabled
		return logsEnabled || metricsEnabled
	case CloudProviderTypeAzure:
		logsEnabled := config.Azure.Logs != nil && config.Azure.Logs.Enabled
		metricsEnabled := config.Azure.Metrics != nil && config.Azure.Metrics.Enabled
		return logsEnabled || metricsEnabled
	default:
		return false
	}
}

// IsMetricsEnabled returns true if metrics are explicitly enabled for the given cloud provider.
// Used to gate dashboard availability — dashboards are only shown when metrics are enabled.
func (config *ServiceConfig) IsMetricsEnabled(provider CloudProviderType) bool {
	switch provider {
	case CloudProviderTypeAWS:
		return config.AWS.Metrics != nil && config.AWS.Metrics.Enabled
	case CloudProviderTypeAzure:
		return config.Azure.Metrics != nil && config.Azure.Metrics.Enabled
	default:
		return false
	}
}

// IsLogsEnabled returns true if logs are explicitly enabled for the given cloud provider.
func (config *ServiceConfig) IsLogsEnabled(provider CloudProviderType) bool {
	switch provider {
	case CloudProviderTypeAWS:
		return config.AWS.Logs != nil && config.AWS.Logs.Enabled
	case CloudProviderTypeAzure:
		return config.Azure.Logs != nil && config.Azure.Logs.Enabled
	default:
		return false
	}
}

func (config *ServiceConfig) ToJSON(provider CloudProviderType, serviceID ServiceID, supportedSignals *SupportedSignals) ([]byte, error) {
	storableServiceConfig, err := newStorableServiceConfig(provider, serviceID, config, supportedSignals)
	if err != nil {
		return nil, err
	}

	return storableServiceConfig.toJSON(provider)
}

func (updatableService *UpdatableService) UnmarshalJSON(data []byte) error {
	type Alias UpdatableService

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Config == nil {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "config is required")
	}

	*updatableService = UpdatableService(temp)
	return nil
}

// IsServiceSharedWithMetricsEnabled returns true if any of the provided services has metrics enabled.
// It is used to determine whether dashboards for a service type should be deprovisioned when
// an account is disconnected or a service is updated.
func IsServiceSharedWithMetricsEnabled(provider CloudProviderType, services []*StorableCloudIntegrationService) bool {
	for _, svc := range services {
		cfg, err := NewServiceConfigFromJSON(provider, svc.Config)
		if err != nil {
			continue
		}
		if cfg.IsMetricsEnabled(provider) {
			return true
		}
	}
	return false
}
