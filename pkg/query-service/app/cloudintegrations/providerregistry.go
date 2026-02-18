package cloudintegrations

import (
	"log/slog"

	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/implawsprovider"
	integrationstore "github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations/store"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/integrationtypes"
)

func NewCloudProviderRegistry(
	logger *slog.Logger,
	store sqlstore.SQLStore,
	reader interfaces.Reader,
	querier interfaces.Querier,
) map[integrationtypes.CloudProviderType]integrationtypes.CloudProvider {
	registry := make(map[integrationtypes.CloudProviderType]integrationtypes.CloudProvider)

	accountsRepo := integrationstore.NewCloudProviderAccountsRepository(store)
	serviceConfigRepo := integrationstore.NewServiceConfigRepository(store)

	awsProviderImpl := implawsprovider.NewAWSCloudProvider(logger, accountsRepo, serviceConfigRepo, reader, querier)
	registry[integrationtypes.CloudProviderAWS] = awsProviderImpl

	return registry
}
