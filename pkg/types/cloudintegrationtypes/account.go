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

func NewAccountFromStorable(storableAccount *StorableCloudIntegration) (*Account, error) {
	// config can not be empty
	if storableAccount.Config == "" {
		return nil, errors.NewInternalf(errors.CodeInternal, "config is empty for account with id: %s", storableAccount.ID)
	}

	account := &Account{
		Identifiable:      storableAccount.Identifiable,
		TimeAuditable:     storableAccount.TimeAuditable,
		ProviderAccountID: storableAccount.AccountID,
		Provider:          storableAccount.Provider,
		RemovedAt:         storableAccount.RemovedAt,
		OrgID:             storableAccount.OrgID,
		Config:            new(AccountConfig),
	}

	switch storableAccount.Provider {
	case CloudProviderTypeAWS:
		awsConfig := new(AWSAccountConfig)
		err := json.Unmarshal([]byte(storableAccount.Config), awsConfig)
		if err != nil {
			return nil, err
		}
		account.Config.AWS = awsConfig
	}

	if storableAccount.LastAgentReport != nil {
		account.AgentReport = &AgentReport{
			TimestampMillis: storableAccount.LastAgentReport.TimestampMillis,
			Data:            storableAccount.LastAgentReport.Data,
		}
	}

	return account, nil
}

func NewAccountsFromStorables(storableAccounts []*StorableCloudIntegration) ([]*Account, error) {
	accounts := make([]*Account, 0, len(storableAccounts))
	for _, storableAccount := range storableAccounts {
		account, err := NewAccountFromStorable(storableAccount)
		if err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}

	return accounts, nil
}

func (account *Account) Update(config *AccountConfig) error {
	if account.RemovedAt != nil {
		return errors.New(errors.TypeUnsupported, ErrCodeCloudIntegrationRemoved, "this operation is not supported for a removed cloud integration account")
	}
	account.Config = config
	account.UpdatedAt = time.Now()
	return nil
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

	return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
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

	return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
}

func (updatable *UpdatableAccount) Validate(provider CloudProviderType) error {
	if updatable.Config == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"config is required")
	}

	switch provider {
	case CloudProviderTypeAWS:
		if updatable.Config.AWS == nil {
			return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
				"aws configuration is required")
		}

		if len(updatable.Config.AWS.Regions) == 0 {
			return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
				"at least one region is required")
		}

		for _, region := range updatable.Config.AWS.Regions {
			if _, ok := ValidAWSRegions[region]; !ok {
				return errors.Newf(errors.TypeInvalidInput, ErrCodeInvalidCloudRegion,
					"invalid AWS region: %s", region)
			}
		}
	default:
		return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput,
			"invalid cloud provider: %s", provider.StringValue())
	}

	return nil
}

// ToJSON return JSON bytes for the provider's config
// thats why not naming it MarshalJSON(), as it will interfere with default JSON marshalling of AccountConfig struct.
// NOTE: this entertains first non-null provider's config.
func (config *AccountConfig) ToJSON() ([]byte, error) {
	if config.AWS != nil {
		return json.Marshal(config.AWS)
	}

	return nil, errors.NewInternalf(errors.CodeInternal, "no provider account config found")
}
