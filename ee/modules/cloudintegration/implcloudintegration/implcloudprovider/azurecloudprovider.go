package implcloudprovider

import (
	"context"
	"sort"

	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

type azurecloudprovider struct {
	serviceDefinitions cloudintegrationtypes.ServiceDefinitionStore
}

func NewAzureCloudProvider(defStore cloudintegrationtypes.ServiceDefinitionStore) cloudintegration.CloudProviderModule {
	return &azurecloudprovider{
		serviceDefinitions: defStore,
	}
}

func (provider *azurecloudprovider) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.GetConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	connectionArtifact, err := cloudintegrationtypes.NewAzureConnectionArtifact(account.ID, req.Config.AgentVersion, req.Credentials, req.Config.Azure)
	if err != nil {
		return nil, err
	}
	return &cloudintegrationtypes.ConnectionArtifact{
		Azure: connectionArtifact,
	}, nil
}

func (provider *azurecloudprovider) ListServiceDefinitions(ctx context.Context) ([]*cloudintegrationtypes.ServiceDefinition, error) {
	return provider.serviceDefinitions.List(ctx, cloudintegrationtypes.CloudProviderTypeAzure)
}

func (provider *azurecloudprovider) GetServiceDefinition(ctx context.Context, serviceID cloudintegrationtypes.ServiceID) (*cloudintegrationtypes.ServiceDefinition, error) {
	serviceDef, err := provider.serviceDefinitions.Get(ctx, cloudintegrationtypes.CloudProviderTypeAzure, serviceID)
	if err != nil {
		return nil, err
	}

	// override cloud integration dashboard id.
	for index, dashboard := range serviceDef.Assets.Dashboards {
		serviceDef.Assets.Dashboards[index].ID = cloudintegrationtypes.GetCloudIntegrationDashboardID(cloudintegrationtypes.CloudProviderTypeAzure, serviceID.StringValue(), dashboard.ID)
	}

	return serviceDef, nil
}

func (provider *azurecloudprovider) BuildIntegrationConfig(
	ctx context.Context,
	account *cloudintegrationtypes.Account,
	services []*cloudintegrationtypes.StorableCloudIntegrationService,
) (*cloudintegrationtypes.ProviderIntegrationConfig, error) {
	sort.Slice(services, func(i, j int) bool {
		return services[i].Type.StringValue() < services[j].Type.StringValue()
	})

	var strategies []*cloudintegrationtypes.AzureTelemetryCollectionStrategy

	for _, storedSvc := range services {
		svcCfg, err := cloudintegrationtypes.NewServiceConfigFromJSON(cloudintegrationtypes.CloudProviderTypeAzure, storedSvc.Config)
		if err != nil {
			return nil, err
		}

		svcDef, err := provider.GetServiceDefinition(ctx, storedSvc.Type)
		if err != nil {
			return nil, err
		}

		strategy := svcDef.TelemetryCollectionStrategy.Azure
		if strategy == nil {
			continue
		}

		logsEnabled := svcCfg.IsLogsEnabled(cloudintegrationtypes.CloudProviderTypeAzure)
		metricsEnabled := svcCfg.IsMetricsEnabled(cloudintegrationtypes.CloudProviderTypeAzure)

		if !logsEnabled && !metricsEnabled {
			continue
		}

		entry := &cloudintegrationtypes.AzureTelemetryCollectionStrategy{
			ResourceProvider: strategy.ResourceProvider,
			ResourceType:     strategy.ResourceType,
		}

		if metricsEnabled && strategy.Metrics != nil {
			entry.Metrics = strategy.Metrics
		}

		if logsEnabled && strategy.Logs != nil {
			entry.Logs = strategy.Logs
		}

		strategies = append(strategies, entry)
	}

	return &cloudintegrationtypes.ProviderIntegrationConfig{
		Azure: cloudintegrationtypes.NewAzureIntegrationConfig(
			account.Config.Azure.DeploymentRegion,
			account.Config.Azure.ResourceGroups,
			strategies,
		),
	}, nil
}
