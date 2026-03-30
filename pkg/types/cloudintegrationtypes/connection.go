package cloudintegrationtypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type ConnectionArtifactRequest struct {
	// required till new providers are added
	Aws *AWSConnectionArtifactRequest `json:"aws" required:"true" nullable:"false"`
}

type AWSConnectionArtifactRequest struct {
	DeploymentRegion string   `json:"deploymentRegion" required:"true"`
	Regions          []string `json:"regions" required:"true" nullable:"false"`
}

type PostableConnectionArtifact = ConnectionArtifactRequest

type ConnectionArtifact struct {
	// required till new providers are added
	Aws *AWSConnectionArtifact `json:"aws" required:"true" nullable:"false"`
}

type AWSConnectionArtifact struct {
	ConnectionURL string `json:"connectionURL" required:"true"`
}

type GettableAccountWithArtifact struct {
	ID       valuer.UUID         `json:"id" required:"true"`
	Artifact *ConnectionArtifact `json:"connectionArtifact" required:"true"`
}

type AgentCheckInRequest struct {
	ProviderAccountID  string      `json:"providerAccountId" required:"false"`
	CloudIntegrationID valuer.UUID `json:"cloudIntegrationId" required:"false"`

	Data map[string]any `json:"data" required:"true" nullable:"true"`
}

type PostableAgentCheckInRequest struct {
	AgentCheckInRequest
	// following are backward compatible fields for older running agents
	// which gets mapped to new fields in AgentCheckInRequest
	ID        string `json:"account_id" required:"false"`       // => CloudIntegrationID
	AccountID string `json:"cloud_account_id" required:"false"` // => ProviderAccountID
}

type AgentCheckInResponse struct {
	CloudIntegrationID string                     `json:"cloudIntegrationId" required:"true"`
	ProviderAccountID  string                     `json:"providerAccountId" required:"true"`
	IntegrationConfig  *ProviderIntegrationConfig `json:"integrationConfig" required:"true"`
	RemovedAt          *time.Time                 `json:"removedAt" required:"true" nullable:"true"`
}

type GettableAgentCheckInResponse struct {
	// Older fields for backward compatibility with existing AWS agents
	AccountID              string             `json:"account_id" required:"true"`
	CloudAccountID         string             `json:"cloud_account_id" required:"true"`
	OlderIntegrationConfig *IntegrationConfig `json:"integration_config" required:"true" nullable:"true"`
	OlderRemovedAt         *time.Time         `json:"removed_at" required:"true" nullable:"true"`

	AgentCheckInResponse
}

// IntegrationConfig older integration config struct for backward compatibility,
// this will be eventually removed once agents are updated to use new struct.
type IntegrationConfig struct {
	EnabledRegions []string                  `json:"enabled_regions" required:"true" nullable:"false"` // backward compatible
	Telemetry      *OldAWSCollectionStrategy `json:"telemetry" required:"true" nullable:"false"`       // backward compatible
}

type ProviderIntegrationConfig struct {
	AWS *AWSIntegrationConfig `json:"aws" required:"true" nullable:"false"`
}

type AWSIntegrationConfig struct {
	EnabledRegions []string               `json:"enabledRegions" required:"true" nullable:"false"`
	Telemetry      *AWSCollectionStrategy `json:"telemetry" required:"true" nullable:"false"`
}

type SignozCredentials struct {
	SigNozAPIURL string
	SigNozAPIKey string // PAT
	IngestionURL string
	IngestionKey string
}

// NewGettableAgentCheckInResponse constructs a backward-compatible response from an AgentCheckInResponse.
// It populates the old snake_case fields (account_id, cloud_account_id, integration_config, removed_at)
// from the new camelCase fields so older agents continue to work unchanged.
// The provider parameter controls which provider-specific block is mapped into the legacy integration_config.
func NewGettableAgentCheckInResponse(provider CloudProviderType, resp *AgentCheckInResponse) *GettableAgentCheckInResponse {
	gettable := &GettableAgentCheckInResponse{
		AccountID:            resp.CloudIntegrationID,
		CloudAccountID:       resp.ProviderAccountID,
		OlderRemovedAt:       resp.RemovedAt,
		AgentCheckInResponse: *resp,
	}

	switch provider {
	case CloudProviderTypeAWS:
		gettable.OlderIntegrationConfig = awsOlderIntegrationConfig(resp.IntegrationConfig)
	}

	return gettable
}

// Validate checks that the connection artifact request has a valid provider-specific block
// with non-empty, valid regions and a valid deployment region.
func (req *ConnectionArtifactRequest) Validate(provider CloudProviderType) error {
	switch provider {
	case CloudProviderTypeAWS:
		if req.Aws == nil {
			return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
				"aws configuration is required")
		}
		return req.Aws.Validate()
	}
	return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput,
		"invalid cloud provider: %s", provider)
}

// Validate checks that the AWS connection artifact request has a valid deployment region
// and a non-empty list of valid regions.
func (req *AWSConnectionArtifactRequest) Validate() error {
	if req.DeploymentRegion == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"deploymentRegion is required")
	}
	if _, ok := ValidAWSRegions[req.DeploymentRegion]; !ok {
		return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidCloudRegion,
			"invalid deployment region: %s", req.DeploymentRegion)
	}

	if len(req.Regions) == 0 {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"at least one region is required")
	}
	for _, region := range req.Regions {
		if _, ok := ValidAWSRegions[region]; !ok {
			return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidCloudRegion,
				"invalid AWS region: %s", region)
		}
	}
	return nil
}

// Validate checks that the request uses either old fields (account_id, cloud_account_id) or
// new fields (cloudIntegrationId, providerAccountId), never a mix of both.
func (req *PostableAgentCheckInRequest) Validate() error {
	hasOldFields := req.ID != "" || req.AccountID != ""
	hasNewFields := !req.CloudIntegrationID.IsZero() || req.ProviderAccountID != ""

	if hasOldFields && hasNewFields {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"request must use either old fields (account_id, cloud_account_id) or new fields (cloudIntegrationId, providerAccountId), not both")
	}
	if !hasOldFields && !hasNewFields {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"request must provide either old fields (account_id, cloud_account_id) or new fields (cloudIntegrationId, providerAccountId)")
	}
	return nil
}
