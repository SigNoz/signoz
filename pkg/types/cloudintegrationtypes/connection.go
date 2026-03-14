package cloudintegrationtypes

import "github.com/SigNoz/signoz/pkg/types/integrationtypes"

// request for creating connection artifact
type (
	PostableConnectionArtifact = ConnectionArtifactRequest

	ConnectionArtifactRequest struct {
		Aws *AWSConnectionArtifactRequest `json:"aws"`
	}

	AWSConnectionArtifactRequest struct {
		DeploymentRegion string   `json:"deploymentRegion"`
		Regions          []string `json:"regions"`
	}
)

type (
	ConnectionArtifact struct {
		Aws *AWSConnectionArtifact `json:"aws"`
	}

	AWSConnectionArtifact struct {
		ConnectionUrl string `json:"connectionURL"`
	}

	GettableConnectionArtifact = ConnectionArtifact
)

type (
	AccountStatus struct {
		Id                string                         `json:"id"`
		ProviderAccountId *string                        `json:"providerAccountID,omitempty"`
		Status            integrationtypes.AccountStatus `json:"status"`
	}

	GettableAccountStatus = AccountStatus
)

type (
	AgentCheckInRequest struct {
		// older backward compatible fields are mapped to new fields
		// CloudIntegrationId string `json:"cloudIntegrationId"`
		// AccountId          string `json:"accountId"`

		// New fields
		ProviderAccountId string `json:"providerAccountId"`
		CloudAccountId    string `json:"cloudAccountId"`

		Data map[string]any `json:"data,omitempty"`
	}

	PostableAgentCheckInRequest struct {
		AgentCheckInRequest
		// following are backward compatible fields for older running agents
		CloudIntegrationId string         `json:"cloud_integration_id"`
		CloudAccountId     string         `json:"cloud_account_id"`
		Data               map[string]any `json:"data,omitempty"`
	}

	GettableAgentCheckInResponse struct {
		AgentCheckInResponse

		CloudIntegrationId string `json:"cloud_integration_id"`
		AccountId          string `json:"account_id"`
	}

	AgentCheckInResponse struct {
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

	IntegrationConfig struct {
		EnabledRegions []string               `json:"enabledRegions"`      // backward compatible
		Telemetry      *AWSCollectionStrategy `json:"telemetry,omitempty"` // backward compatible

		// new fields
		AWS *AWSIntegrationConfig `json:"aws,omitempty"`
	}

	AWSIntegrationConfig struct {
		EnabledRegions []string               `json:"enabledRegions"`
		Telemetry      *AWSCollectionStrategy `json:"telemetry,omitempty"`
	}
)
