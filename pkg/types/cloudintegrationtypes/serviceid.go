package cloudintegrationtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type ServiceID struct{ valuer.String }

var ErrCodeInvalidServiceID = errors.MustNewCode("invalid_service_id")

var (
	AWSServiceALB         = ServiceID{valuer.NewString("alb")}
	AWSServiceAPIGateway  = ServiceID{valuer.NewString("api-gateway")}
	AWSServiceDynamoDB    = ServiceID{valuer.NewString("dynamodb")}
	AWSServiceEC2         = ServiceID{valuer.NewString("ec2")}
	AWSServiceECS         = ServiceID{valuer.NewString("ecs")}
	AWSServiceEKS         = ServiceID{valuer.NewString("eks")}
	AWSServiceElastiCache = ServiceID{valuer.NewString("elasticache")}
	AWSServiceLambda      = ServiceID{valuer.NewString("lambda")}
	AWSServiceMSK         = ServiceID{valuer.NewString("msk")}
	AWSServiceRDS         = ServiceID{valuer.NewString("rds")}
	AWSServiceS3Sync      = ServiceID{valuer.NewString("s3sync")}
	AWSServiceSNS         = ServiceID{valuer.NewString("sns")}
	AWSServiceSQS         = ServiceID{valuer.NewString("sqs")}

	// Azure services.
	AzureServiceStorageAccountsBlob        = ServiceID{valuer.NewString("storageaccountsblob")}
	AzureServiceCDNProfile                 = ServiceID{valuer.NewString("cdnprofile")}
	AzureServiceVirtualMachine             = ServiceID{valuer.NewString("virtualmachine")}
	AzureServiceAppService                 = ServiceID{valuer.NewString("appservice")}
	AzureServiceContainerApp               = ServiceID{valuer.NewString("containerapp")}
	AzureServiceAKS                        = ServiceID{valuer.NewString("aks")}
	AzureServiceSQLDatabase                = ServiceID{valuer.NewString("sqldatabase")}
	AzureServiceSQLDatabaseManagedInstance = ServiceID{valuer.NewString("sqldatabasemi")}
	AzureServiceMySQLFlexibleServer        = ServiceID{valuer.NewString("mysqlflexibleserver")}
	AzureServicePostgreSQLFlexibleServer   = ServiceID{valuer.NewString("postgresqlflexibleserver")}
	AzureServiceMongoDB                    = ServiceID{valuer.NewString("mongodb")}
	AzureServiceCosmosDB                   = ServiceID{valuer.NewString("cosmosdb")}
	AzureServiceCassandraDB                = ServiceID{valuer.NewString("cassandradb")}
	AzureServiceRedis                      = ServiceID{valuer.NewString("redis")}

	// GCP services.
	GCPServiceCloudSQLPostgres = ServiceID{valuer.NewString("cloudsql_postgres")}
	GCPServiceMemorystoreRedis = ServiceID{valuer.NewString("memorystore_redis")}
)

func (ServiceID) Enum() []any {
	return []any{
		AWSServiceALB,
		AWSServiceAPIGateway,
		AWSServiceDynamoDB,
		AWSServiceEC2,
		AWSServiceECS,
		AWSServiceEKS,
		AWSServiceElastiCache,
		AWSServiceLambda,
		AWSServiceMSK,
		AWSServiceRDS,
		AWSServiceS3Sync,
		AWSServiceSNS,
		AWSServiceSQS,
		AzureServiceStorageAccountsBlob,
		AzureServiceCDNProfile,
		AzureServiceVirtualMachine,
		AzureServiceAppService,
		AzureServiceContainerApp,
		AzureServiceAKS,
		AzureServiceSQLDatabase,
		AzureServiceSQLDatabaseManagedInstance,
		AzureServiceMySQLFlexibleServer,
		AzureServicePostgreSQLFlexibleServer,
		AzureServiceMongoDB,
		AzureServiceCosmosDB,
		AzureServiceCassandraDB,
		AzureServiceRedis,
		GCPServiceCloudSQLPostgres,
		GCPServiceMemorystoreRedis,
	}
}

// SupportedServices is the map of supported services for each cloud provider.
var SupportedServices = map[CloudProviderType][]ServiceID{
	CloudProviderTypeAWS: {
		AWSServiceALB,
		AWSServiceAPIGateway,
		AWSServiceDynamoDB,
		AWSServiceEC2,
		AWSServiceECS,
		AWSServiceEKS,
		AWSServiceElastiCache,
		AWSServiceLambda,
		AWSServiceMSK,
		AWSServiceRDS,
		AWSServiceS3Sync,
		AWSServiceSNS,
		AWSServiceSQS,
	},
	CloudProviderTypeAzure: {
		AzureServiceStorageAccountsBlob,
		AzureServiceCDNProfile,
		AzureServiceVirtualMachine,
		AzureServiceAppService,
		AzureServiceContainerApp,
		AzureServiceAKS,
		AzureServiceSQLDatabase,
		AzureServiceSQLDatabaseManagedInstance,
		AzureServiceMySQLFlexibleServer,
		AzureServicePostgreSQLFlexibleServer,
		AzureServiceMongoDB,
		AzureServiceCosmosDB,
		AzureServiceCassandraDB,
		AzureServiceRedis,
	},
	CloudProviderTypeGCP: {
		GCPServiceCloudSQLPostgres,
		GCPServiceMemorystoreRedis,
	},
}

func NewServiceID(provider CloudProviderType, service string) (ServiceID, error) {
	// The valid set is provider-scoped (AWS and Azure expose different
	// services), so surface it as a structured suggestion along with a
	// closest-match correction for typos.
	supported := SupportedServices[provider]
	validServices := make([]string, 0, len(supported))
	for _, s := range supported {
		if s.StringValue() == service {
			return s, nil
		}
		validServices = append(validServices, s.StringValue())
	}

	return ServiceID{}, errors.NewInvalidInputf(ErrCodeInvalidServiceID,
		"invalid service id %q for %s cloud provider", service, provider.StringValue()).
		WithSuggestions(errors.NewSuggestionsOnLevenshteinDistance(service, errors.NounServices, validServices)...)
}
