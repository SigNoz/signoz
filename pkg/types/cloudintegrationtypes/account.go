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

type AWSAccountConfig struct {
	Regions []string `json:"regions" required:"true" nullable:"false"`
}

type PostableAccount struct {
	Config      *PostableAccountConfig `json:"config" required:"true"`
	Credentials *Credentials           `json:"credentials" required:"true"`
}

type PostableAccountConfig struct {
	// as agent version is common for all providers, we can keep it at top level of this struct
	AgentVersion string
	Aws          *AWSPostableAccountConfig `json:"aws" required:"true" nullable:"false"`
}

type Credentials struct {
	SigNozAPIURL string `json:"sigNozApiUrl" required:"true"`
	SigNozAPIKey string `json:"sigNozApiKey" required:"true"` // PAT
	IngestionURL string `json:"ingestionUrl" required:"true"`
	IngestionKey string `json:"ingestionKey" required:"true"`
}

type AWSPostableAccountConfig struct {
	DeploymentRegion string   `json:"deploymentRegion" required:"true"`
	Regions          []string `json:"regions" required:"true" nullable:"false"`
}

type GettableAccountWithConnectionArtifact struct {
	ID                 valuer.UUID         `json:"id" required:"true"`
	ConnectionArtifact *ConnectionArtifact `json:"connectionArtifact" required:"true"`
}

type ConnectionArtifact struct {
	// required till new providers are added
	Aws *AWSConnectionArtifact `json:"aws" required:"true" nullable:"false"`
}

type AWSConnectionArtifact struct {
	ConnectionURL string `json:"connectionUrl" required:"true"`
}

type GetConnectionArtifactRequest = PostableAccount

type GettableAccounts struct {
	Accounts []*Account `json:"accounts" required:"true" nullable:"false"`
}

type UpdatableAccount struct {
	Config *AccountConfig `json:"config" required:"true" nullable:"false"`
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

func (account *Account) IsRemoved() bool {
	return account.RemovedAt != nil
}

func NewAccountConfigFromPostable(provider CloudProviderType, config *PostableAccountConfig) (*AccountConfig, error) {
	switch provider {
	case CloudProviderTypeAWS:
		if config.Aws == nil {
			return nil, errors.NewInternalf(errors.CodeInternal, "AWS config is nil")
		}
		return &AccountConfig{
			AWS: &AWSAccountConfig{
				Regions: config.Aws.Regions,
			},
		}, nil
	}

	return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
}

// func NewAccountFromPostableAccount(provider CloudProviderType, account *PostableAccount) (*Account, error) {
// 	req := &Account{
// 		Credentials: account.Credentials,
// 	}

// 	switch provider {
// 	case CloudProviderTypeAWS:
// 		req.Config = &ConnectionArtifactRequestConfig{
// 			Aws: &AWSConnectionArtifactRequest{
// 				DeploymentRegion: artifact.Config.Aws.DeploymentRegion,
// 				Regions:          artifact.Config.Aws.Regions,
// 			},
// 		}

// 		return req, nil
// 	default:
// 		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
// 	}
// }

func NewAgentReport(data map[string]any) *AgentReport {
	return &AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            data,
	}
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

func (config *PostableAccountConfig) AddAgentVersion(agentVersion string) {
	config.AgentVersion = agentVersion
}

// Validate checks that the connection artifact request has a valid provider-specific block
// with non-empty, valid regions and a valid deployment region.
func (account *PostableAccount) Validate(provider CloudProviderType) error {
	if account.Config == nil || account.Credentials == nil {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"config and credentials are required")
	}

	if account.Credentials.SigNozAPIURL == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"sigNozApiURL can not be empty")
	}

	if account.Credentials.SigNozAPIKey == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"sigNozApiKey can not be empty")
	}

	if account.Credentials.IngestionURL == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"ingestionUrl can not be empty")
	}

	if account.Credentials.IngestionKey == "" {
		return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
			"ingestionKey can not be empty")
	}

	switch provider {
	case CloudProviderTypeAWS:
		if account.Config.Aws == nil {
			return errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput,
				"aws configuration is required")
		}
		return account.Config.Aws.Validate()
	}

	return errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider)
}

// Validate checks that the AWS connection artifact request has a valid deployment region
// and a non-empty list of valid regions.
func (req *AWSPostableAccountConfig) Validate() error {
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
