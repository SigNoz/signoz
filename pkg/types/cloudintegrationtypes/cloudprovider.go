package cloudintegrationtypes

import (
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
	ErrCodeCloudProviderInvalidInput = errors.MustNewCode("invalid_cloud_provider")

	AWSIntegrationUserEmail   = valuer.MustNewEmail("aws-integration@signoz.io")
	AzureIntegrationUserEmail = valuer.MustNewEmail("azure-integration@signoz.io")
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
