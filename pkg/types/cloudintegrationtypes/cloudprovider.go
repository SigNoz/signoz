package cloudintegrationtypes

import (
	"strings"
	"text/template"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

const foundryScriptURL = "https://signoz.io/foundry.sh"

var (
	// cloud providers.
	CloudProviderTypeAWS   = CloudProviderType{valuer.NewString("aws")}
	CloudProviderTypeAzure = CloudProviderType{valuer.NewString("azure")}
	CloudProviderTypeGCP   = CloudProviderType{valuer.NewString("gcp")}

	ErrCodeCloudProviderInvalidInput = errors.MustNewCode("cloud_integration_invalid_cloud_provider")

	foundryTemplateFuncs = template.FuncMap{
		"shellQuote": func(value string) string {
			return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'"
		},
	}
)

type CloudProviderType struct{ valuer.String }

func NewCloudProvider(provider string) (CloudProviderType, error) {
	switch provider {
	case CloudProviderTypeAWS.StringValue():
		return CloudProviderTypeAWS, nil
	case CloudProviderTypeAzure.StringValue():
		return CloudProviderTypeAzure, nil
	case CloudProviderTypeGCP.StringValue():
		return CloudProviderTypeGCP, nil
	default:
		return CloudProviderType{}, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider)
	}
}

type foundryTemplateData struct {
	FoundryScriptURL     string
	Region               string
	IntegrationAccountID string
	AgentVersion         string
	Credentials          *Credentials
}
