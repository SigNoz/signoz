package cloudintegrationtypes

import (
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// CloudProviderType type alias.
type CloudProviderType struct{ valuer.String }

var (
	// cloud providers.
	CloudProviderTypeAWS   = CloudProviderType{valuer.NewString("aws")}
	CloudProviderTypeAzure = CloudProviderType{valuer.NewString("azure")}

	// errors.
	ErrCodeCloudProviderInvalidInput = errors.MustNewCode("cloud_integration_invalid_cloud_provider")

	CloudFormationQuickCreateBaseURL  = valuer.NewString("https://%s.console.aws.amazon.com/cloudformation/home")
	AgentCloudFormationTemplateS3Path = valuer.NewString("https://signoz-integrations.s3.us-east-1.amazonaws.com/aws-quickcreate-template-%s.json")
	AgentCloudFormationBaseStackName  = valuer.NewString("signoz-integration")
)

// NewCloudProvider returns a new CloudProviderType from a string.
// It validates the input and returns an error if the input is not valid cloud provider.
func NewCloudProvider(provider string) (CloudProviderType, error) {
	switch provider {
	case CloudProviderTypeAWS.StringValue():
		return CloudProviderTypeAWS, nil
	case CloudProviderTypeAzure.StringValue():
		return CloudProviderTypeAzure, nil
	default:
		return CloudProviderType{}, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider)
	}
}

func NewIngestionKeyName(provider CloudProviderType) string {
	return fmt.Sprintf("%s-integration", provider.StringValue())
}
