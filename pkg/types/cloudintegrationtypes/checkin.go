package cloudintegrationtypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type AgentCheckInRequest struct {
	ProviderAccountID  string      `json:"providerAccountId" required:"false"`
	CloudIntegrationID valuer.UUID `json:"cloudIntegrationId" required:"false"`

	Data map[string]any `json:"data" required:"true" nullable:"true"`
}

type PostableAgentCheckIn struct {
	AgentCheckInRequest
	// following are backward compatible fields for older running agents, hence snake case JSON keys.
	// Which get mapped to new fields in AgentCheckInRequest
	ID        string `json:"account_id" required:"false"`       // => CloudIntegrationID
	AccountID string `json:"cloud_account_id" required:"false"` // => ProviderAccountID
}

type AgentCheckInResponse struct {
	CloudIntegrationID string                     `json:"cloudIntegrationId" required:"true"`
	ProviderAccountID  string                     `json:"providerAccountId" required:"true"`
	IntegrationConfig  *ProviderIntegrationConfig `json:"integrationConfig" required:"true"`
	RemovedAt          *time.Time                 `json:"removedAt" required:"true" nullable:"true"`
}

type GettableAgentCheckIn struct {
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
	EnabledRegions              []string                        `json:"enabledRegions" required:"true" nullable:"false"`
	TelemetryCollectionStrategy *AWSTelemetryCollectionStrategy `json:"telemetryCollectionStrategy" required:"true" nullable:"false"`
}

// NewGettableAgentCheckIn constructs a backward-compatible response from an AgentCheckInResponse.
// It populates the old snake_case fields (account_id, cloud_account_id, integration_config, removed_at)
// from the new camelCase fields so older agents continue to work unchanged.
// The provider parameter controls which provider-specific block is mapped into the legacy integration_config.
func NewGettableAgentCheckIn(provider CloudProviderType, resp *AgentCheckInResponse) *GettableAgentCheckIn {
	gettable := &GettableAgentCheckIn{
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

func NewAgentCheckInResponse(providerAccountID, cloudIntegrationID string, integrationConfig *ProviderIntegrationConfig, removedAt *time.Time) *AgentCheckInResponse {
	return &AgentCheckInResponse{
		CloudIntegrationID: cloudIntegrationID,
		ProviderAccountID:  providerAccountID,
		IntegrationConfig:  integrationConfig,
		RemovedAt:          removedAt,
	}
}

func (postable *PostableAgentCheckIn) UnmarshalJSON(data []byte) error {
	type Alias PostableAgentCheckIn

	var temp Alias
	err := json.Unmarshal(data, &temp)
	if err != nil {
		return err
	}

	hasOldFields := temp.ID != "" || temp.AccountID != ""
	hasNewFields := !temp.CloudIntegrationID.IsZero() || temp.ProviderAccountID != ""

	if hasOldFields && hasNewFields {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"request must use either old fields (account_id, cloud_account_id) or new fields (cloudIntegrationId, providerAccountId), not both")
	}
	if !hasOldFields && !hasNewFields {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"request must provide either old fields (account_id, cloud_account_id) or new fields (cloudIntegrationId, providerAccountId)")
	}

	*postable = PostableAgentCheckIn(temp)
	return nil
}
