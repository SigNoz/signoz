package cloudintegrations

import (
	"log/slog"

	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/implawsprovider"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/implazureprovider"
	integrationstore "github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
)

func NewCloudProviderRegistry(
	logger *slog.Logger,
	store sqlstore.SQLStore,
	querier querier.Querier,
) (map[integrationtypes.CloudProviderType]integrationtypes.CloudProvider, error) {
	registry := make(map[integrationtypes.CloudProviderType]integrationtypes.CloudProvider)

	accountsRepo := integrationstore.NewCloudProviderAccountsRepository(store)
	serviceConfigRepo := integrationstore.NewServiceConfigRepository(store)

	awsProviderImpl, err := implawsprovider.NewAWSCloudProvider(logger, accountsRepo, serviceConfigRepo, querier)
	if err != nil {
		return nil, err
	}
	registry[integrationtypes.CloudProviderAWS] = awsProviderImpl

	azureProviderImpl, err := implazureprovider.NewAzureCloudProvider(logger, accountsRepo, serviceConfigRepo, querier)
	if err != nil {
		return nil, err
	}
	registry[integrationtypes.CloudProviderAzure] = azureProviderImpl

	return registry, nil
}
