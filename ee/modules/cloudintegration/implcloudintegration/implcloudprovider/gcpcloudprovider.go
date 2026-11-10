package implcloudprovider

import (
	"context"

	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

func NewGCPCloudProvider(defStore cloudintegrationtypes.ServiceDefinitionStore) cloudintegration.CloudProviderModule {
	return &gcpcloudprovider{
		serviceDefinitions: defStore,
	}
}

func (g *gcpcloudprovider) BuildIntegrationConfig(
	ctx context.Context,
	account *cloudintegrationtypes.Account,
	services []*cloudintegrationtypes.StorableCloudIntegrationService,
) (*cloudintegrationtypes.ProviderIntegrationConfig, error) {
	if account.Config.GCP.ConnectionMethod != cloudintegrationtypes.GCPConnectionMethodAgent {
		return &cloudintegrationtypes.ProviderIntegrationConfig{}, nil
	}

	var metricNames []string
	var sinkFilters []string

	for _, storedSvc := range services {
		svcCfg, err := cloudintegrationtypes.NewServiceConfigFromJSON(cloudintegrationtypes.CloudProviderTypeGCP, storedSvc.Config)
		if err != nil {
			return nil, err
		}

		svcDef, err := g.GetServiceDefinition(ctx, storedSvc.Type)
		if err != nil {
			return nil, err
		}

		if svcDef.TelemetryCollectionStrategy.GCP == nil {
			continue
		}

		strategy := svcDef.TelemetryCollectionStrategy.GCP
		if svcCfg.IsMetricsEnabled(cloudintegrationtypes.CloudProviderTypeGCP) && strategy.Metrics != nil {
			metricNames = append(metricNames, strategy.Metrics.MetricNames...)
		}

		if svcCfg.IsLogsEnabled(cloudintegrationtypes.CloudProviderTypeGCP) && strategy.Logs != nil {
			sinkFilters = append(sinkFilters, strategy.Logs.SinkFilter)
		}
	}

	return &cloudintegrationtypes.ProviderIntegrationConfig{
		GCP: cloudintegrationtypes.NewGCPIntegrationConfig(account.Config.GCP, metricNames, sinkFilters),
	}, nil
}

func (g *gcpcloudprovider) GetConnectionArtifact(ctx context.Context, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.GetConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	if account.Config.GCP.ConnectionMethod != cloudintegrationtypes.GCPConnectionMethodAgent {
		return &cloudintegrationtypes.ConnectionArtifact{}, nil
	}

	connectionArtifact, err := cloudintegrationtypes.NewGCPConnectionArtifact(account.ID, req.Config.AgentVersion, req.Credentials, account.Config.GCP)
	if err != nil {
		return nil, err
	}
	return &cloudintegrationtypes.ConnectionArtifact{
		GCP: connectionArtifact,
	}, nil
}

func (g *gcpcloudprovider) GetServiceDefinition(ctx context.Context, serviceID cloudintegrationtypes.ServiceID) (*cloudintegrationtypes.ServiceDefinition, error) {
	return g.serviceDefinitions.Get(ctx, cloudintegrationtypes.CloudProviderTypeGCP, serviceID)
}

func (g *gcpcloudprovider) ListServiceDefinitions(ctx context.Context) ([]*cloudintegrationtypes.ServiceDefinition, error) {
	return g.serviceDefinitions.List(ctx, cloudintegrationtypes.CloudProviderTypeGCP)
}

type gcpcloudprovider struct {
	serviceDefinitions cloudintegrationtypes.ServiceDefinitionStore
}
