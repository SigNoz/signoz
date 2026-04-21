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

func NewServiceID(provider CloudProviderType, service string) (ServiceID, error) {
	for _, s := range SupportedServices[provider] {
		if s.StringValue() == service {
			return s, nil
		}
	}
	return ServiceID{}, errors.NewInvalidInputf(ErrCodeInvalidServiceID, "invalid service id %q for %s cloud provider", service, provider.StringValue())
}
