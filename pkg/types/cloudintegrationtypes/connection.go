package cloudintegrationtypes

import "github.com/SigNoz/signoz/pkg/types/integrationtypes"

type ConnectionArtifactRequest struct {
	Aws *AWSConnectionArtifactRequest `json:"aws"`
}

type AWSConnectionArtifactRequest struct {
	DeploymentRegion string   `json:"deploymentRegion"`
	Regions          []string `json:"regions"`
}

type PostableConnectionArtifact = ConnectionArtifactRequest

type ConnectionArtifact struct {
	Aws *AWSConnectionArtifact `json:"aws"`
}

type AWSConnectionArtifact struct {
	ConnectionUrl string `json:"connectionURL"`
}

type GettableConnectionArtifact = ConnectionArtifact

type AccountStatus struct {
	Id                string                         `json:"id"`
	ProviderAccountId *string                        `json:"providerAccountID,omitempty"`
	Status            integrationtypes.AccountStatus `json:"status"`
}

type GettableAccountStatus = AccountStatus

type AgentCheckInRequest struct {
	// older backward compatible fields are mapped to new fields
	// CloudIntegrationId string `json:"cloudIntegrationId"`
	// AccountId          string `json:"accountId"`

	// New fields
	ProviderAccountId string `json:"providerAccountId"`
	CloudAccountId    string `json:"cloudAccountId"`

	Data map[string]any `json:"data,omitempty"`
}

type PostableAgentCheckInRequest struct {
	AgentCheckInRequest
	// following are backward compatible fields for older running agents
	// which gets mapped to new fields in AgentCheckInRequest
	CloudIntegrationId string `json:"cloud_integration_id"`
	CloudAccountId     string `json:"cloud_account_id"`
}

type GettableAgentCheckInResponse struct {
	AgentCheckInResponse

	// For backward compatibility
	CloudIntegrationId string `json:"cloud_integration_id"`
	AccountId          string `json:"account_id"`
}

type AgentCheckInResponse struct {
	// Older fields for backward compatibility are mapped to new fields below
	// CloudIntegrationId string `json:"cloud_integration_id"`
	// AccountId          string `json:"account_id"`

	// New fields
	ProviderAccountId string `json:"providerAccountId"`
	CloudAccountId    string `json:"cloudAccountId"`

	// IntegrationConfig populates data related to integration that is required for an agent
	// to start collecting telemetry data
	// keeping JSON key snake_case for backward compatibility
	IntegrationConfig *IntegrationConfig `json:"integration_config,omitempty"`
}

type IntegrationConfig struct {
	EnabledRegions []string               `json:"enabledRegions"`      // backward compatible
	Telemetry      *AWSCollectionStrategy `json:"telemetry,omitempty"` // backward compatible

	// new fields
	AWS *AWSIntegrationConfig `json:"aws,omitempty"`
}

type AWSIntegrationConfig struct {
	EnabledRegions []string               `json:"enabledRegions"`
	Telemetry      *AWSCollectionStrategy `json:"telemetry,omitempty"`
}
