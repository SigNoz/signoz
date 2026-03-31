package cloudintegrationtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type ServiceID struct{ valuer.String }

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
}

// NewServiceID returns a new ServiceID from a string, validated against the supported services for the given cloud provider.
func NewServiceID(provider CloudProviderType, service string) (ServiceID, error) {
	services, ok := SupportedServices[provider]
	if !ok {
		return ServiceID{}, errors.NewInvalidInputf(ErrCodeInvalidServiceID, "no services defined for cloud provider: %s", provider)
	}
	for _, s := range services {
		if s.StringValue() == service {
			return s, nil
		}
	}
	return ServiceID{}, errors.NewInvalidInputf(ErrCodeInvalidServiceID, "invalid service id %q for cloud provider %s", service, provider)
}
