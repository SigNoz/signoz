package implcloudprovider

import (
	"context"
	"fmt"
	"net/url"

	"github.com/SigNoz/signoz/pkg/modules/cloudintegration"
	"github.com/SigNoz/signoz/pkg/types/cloudintegrationtypes"
)

type awscloudprovider struct{}

func NewAWSCloudProvider() cloudintegration.CloudProviderModule {
	return &awscloudprovider{}
}

func (provider *awscloudprovider) GetConnectionArtifact(ctx context.Context, creds *cloudintegrationtypes.SignozCredentials, account *cloudintegrationtypes.Account, req *cloudintegrationtypes.ConnectionArtifactRequest) (*cloudintegrationtypes.ConnectionArtifact, error) {
	// TODO: get this from config
	agentVersion := "v0.0.8"

	baseURL := fmt.Sprintf("https://%s.console.aws.amazon.com/cloudformation/home", req.Aws.DeploymentRegion)
	u, _ := url.Parse(baseURL)

	q := u.Query()
	q.Set("region", req.Aws.DeploymentRegion)
	u.Fragment = "/stacks/quickcreate"

	u.RawQuery = q.Encode()

	q = u.Query()
	q.Set("stackName", "signoz-integration")
	q.Set("templateURL", fmt.Sprintf("https://signoz-integrations.s3.us-east-1.amazonaws.com/aws-quickcreate-template-%s.json", agentVersion))
	q.Set("param_SigNozIntegrationAgentVersion", agentVersion)
	q.Set("param_SigNozApiUrl", creds.SigNozAPIURL)
	q.Set("param_SigNozApiKey", creds.SigNozAPIKey)
	q.Set("param_SigNozAccountId", account.ID.StringValue())
	q.Set("param_IngestionUrl", creds.IngestionURL)
	q.Set("param_IngestionKey", creds.IngestionKey)

	return &cloudintegrationtypes.ConnectionArtifact{
		Aws: &cloudintegrationtypes.AWSConnectionArtifact{
			ConnectionURL: u.String() + "?&" + q.Encode(), // this format is required by AWS
		},
	}, nil
}
