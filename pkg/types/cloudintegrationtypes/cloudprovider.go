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

	AWSIntegrationUserEmail   = valuer.MustNewEmail("aws-integration@signoz.io")
	AzureIntegrationUserEmail = valuer.MustNewEmail("azure-integration@signoz.io")

	CloudFormationQuickCreateBaseURL  = valuer.NewString("https://%s.console.aws.amazon.com/cloudformation/home")
	AgentCloudFormationTemplateS3Path = valuer.NewString("https://signoz-integrations.s3.us-east-1.amazonaws.com/aws-quickcreate-template-%s.json")
	AgentCloudFormationBaseStackName  = valuer.NewString("signoz-integration")
)

// CloudIntegrationUserEmails is the list of valid emails for Cloud One Click integrations.
// This is used for validation and restrictions in different contexts, across codebase.
var CloudIntegrationUserEmails = []valuer.Email{
	AWSIntegrationUserEmail,
	AzureIntegrationUserEmail,
}

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

func GetCloudProviderEmail(provider CloudProviderType) (valuer.Email, error) {
	switch provider {
	case CloudProviderTypeAWS:
		return AWSIntegrationUserEmail, nil
	case CloudProviderTypeAzure:
		return AzureIntegrationUserEmail, nil
	default:
		return valuer.Email{}, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}

func NewIngestionKeyName(provider CloudProviderType) string {
	return fmt.Sprintf("%s-integration", provider.StringValue())
}

func NewIntegrationUserDisplayName(provider CloudProviderType) string {
	return fmt.Sprintf("%s-integration", provider.StringValue())
}

// NewAPIKeyName returns API key name for cloud integration provider
// TODO: figure out way to migrate API keys to have similar naming convention as ingestion key
// ie. "{cloud-provider}-integration", and then remove this function.
func NewAPIKeyName(provider CloudProviderType) string {
	return fmt.Sprintf("%s integration", provider.StringValue())
}
