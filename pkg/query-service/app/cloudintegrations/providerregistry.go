package cloudintegrations

import (
	"log/slog"

	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/implawsprovider"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/implazureprovider"
	integrationstore "github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/integrationstypes"
)

func NewCloudProviderRegistry(logger *slog.Logger, store sqlstore.SQLStore, querier querier.Querier) map[integrationstypes.CloudProviderType]integrationstypes.CloudProvider {
	registry := make(map[integrationstypes.CloudProviderType]integrationstypes.CloudProvider)

	accountsRepo := integrationstore.NewCloudProviderAccountsRepository(store)
	serviceConfigRepo := integrationstore.NewServiceConfigRepository(store)

	awsProviderImpl := implawsprovider.NewAWSCloudProvider(logger, accountsRepo, serviceConfigRepo, querier)
	registry[integrationstypes.CloudProviderAWS] = awsProviderImpl
	azureProviderImpl := implazureprovider.NewAzureCloudProvider(logger, accountsRepo, serviceConfigRepo, querier)
	registry[integrationstypes.CloudProviderAzure] = azureProviderImpl

	return registry
}
