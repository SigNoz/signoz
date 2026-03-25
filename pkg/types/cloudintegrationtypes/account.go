package cloudintegrationtypes

import (
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Account struct {
	types.Identifiable
	types.TimeAuditable
	ProviderAccountID *string           `json:"providerAccountId" required:"true" nullable:"true"`
	Provider          CloudProviderType `json:"provider" required:"true"`
	RemovedAt         *time.Time        `json:"removedAt" required:"true" nullable:"true"`
	AgentReport       *AgentReport      `json:"agentReport" required:"true" nullable:"true"`
	OrgID             valuer.UUID       `json:"orgId" required:"true"`
	Config            *AccountConfig    `json:"config" required:"true" nullable:"false"`
}

// AgentReport represents heartbeats sent by the agent.
type AgentReport struct {
	TimestampMillis int64          `json:"timestampMillis" required:"true"`
	Data            map[string]any `json:"data" required:"true" nullable:"true"`
}

type AccountConfig struct {
	// required till new providers are added
	AWS *AWSAccountConfig `json:"aws" required:"true" nullable:"false"`
}

type GettableAccounts struct {
	Accounts []*Account `json:"accounts" required:"true" nullable:"false"`
}

type GettableAccount = Account

type UpdatableAccount struct {
	Config *AccountConfig `json:"config" required:"true" nullable:"false"`
}

type AWSAccountConfig struct {
	Regions []string `json:"regions" required:"true" nullable:"false"`
}

func NewAccount(orgID valuer.UUID, provider CloudProviderType, config *AccountConfig) *Account {
	return &Account{
		Identifiable: types.Identifiable{
			ID: valuer.GenerateUUID(),
		},
		TimeAuditable: types.TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		OrgID:    orgID,
		Provider: provider,
		Config:   config,
	}
}

func NewAccountConfigFromPostableArtifact(provider CloudProviderType, artifact *PostableConnectionArtifact) (*AccountConfig, error) {
	switch provider {
	case CloudProviderTypeAWS:
		if artifact.Aws == nil {
			return nil, errors.NewInternalf(errors.CodeInternal, "AWS artifact is nil")
		}
		return &AccountConfig{
			AWS: &AWSAccountConfig{
				Regions: artifact.Aws.Regions,
			},
		}, nil
	}

	return nil, errors.NewInternalf(errors.CodeInternal, "unsupported provider type")
}

func NewArtifactRequestFromPostableArtifact(provider CloudProviderType, artifact *PostableConnectionArtifact) (*ConnectionArtifactRequest, error) {
	switch provider {
	case CloudProviderTypeAWS:
		if artifact.Aws == nil {
			return nil, errors.NewInternalf(errors.CodeInternal, "AWS artifact is nil")
		}
		return &ConnectionArtifactRequest{
			Aws: &AWSConnectionArtifactRequest{
				DeploymentRegion: artifact.Aws.DeploymentRegion,
				Regions:          artifact.Aws.Regions,
			},
		}, nil
	}

	return nil, errors.NewInternalf(errors.CodeInternal, "unsupported provider type")
}

// MarshalJSON return JSON bytes for the account config
// NOTE: this entertains first non-null provider's config
func (config *AccountConfig) MarshalJSON() ([]byte, error) {
	if config.AWS != nil {
		return json.Marshal(config.AWS)
	}

	return nil, errors.NewInternalf(errors.CodeInternal, "no provider account config found")
}
