package cloudintegrationtypes

import (
	"time"

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
	ProviderAccountID  string `json:"providerAccountId" required:"false"`
	CloudIntegrationID string `json:"cloudIntegrationId" required:"false"`

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
	EnabledRegions []string               `json:"enabled_regions" required:"true" nullable:"false"` // backward compatible
	Telemetry      *AWSCollectionStrategy `json:"telemetry" required:"true" nullable:"false"`       // backward compatible
}

type ProviderIntegrationConfig struct {
	AWS *AWSIntegrationConfig `json:"aws" required:"true" nullable:"false"`
}

type AWSIntegrationConfig struct {
	EnabledRegions []string               `json:"enabledRegions" required:"true" nullable:"false"`
	Telemetry      *AWSCollectionStrategy `json:"telemetry" required:"true" nullable:"false"`
}
