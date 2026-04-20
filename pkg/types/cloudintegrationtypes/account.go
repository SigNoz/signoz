package cloudintegrationtypes

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/zeustypes"
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

type PostableAccount struct {
	Config      *PostableAccountConfig `json:"config" required:"true"`
	Credentials *Credentials           `json:"credentials" required:"true"`
}

type PostableAccountConfig struct {
	// as agent version is common for all providers, we can keep it at top level of this struct
	AgentVersion string
	AWS          *AWSPostableAccountConfig `json:"aws" required:"true" nullable:"false"`
}

type Credentials struct {
	SigNozAPIURL string `json:"sigNozApiUrl" required:"true"`
	SigNozAPIKey string `json:"sigNozApiKey" required:"true"` // PAT
	IngestionURL string `json:"ingestionUrl" required:"true"`
	IngestionKey string `json:"ingestionKey" required:"true"`
}

type GettableAccountWithConnectionArtifact struct {
	ID                 valuer.UUID         `json:"id" required:"true"`
	ConnectionArtifact *ConnectionArtifact `json:"connectionArtifact" required:"true"`
}

type ConnectionArtifact struct {
	// required till new providers are added
	AWS *AWSConnectionArtifact `json:"aws" required:"true" nullable:"false"`
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

func NewCredentials(sigNozAPIURL, sigNozAPIKey, ingestionURL, ingestionKey string) *Credentials {
	return &Credentials{
		SigNozAPIURL: sigNozAPIURL,
		SigNozAPIKey: sigNozAPIKey,
		IngestionURL: ingestionURL,
		IngestionKey: ingestionKey,
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

func NewGettableAccountWithConnectionArtifact(account *Account, connectionArtifact *ConnectionArtifact) *GettableAccountWithConnectionArtifact {
	return &GettableAccountWithConnectionArtifact{
		ID:                 account.ID,
		ConnectionArtifact: connectionArtifact,
	}
}

func NewGettableAccounts(accounts []*Account) *GettableAccounts {
	return &GettableAccounts{
		Accounts: accounts,
	}
}

func NewAccountConfigFromPostable(provider CloudProviderType, config *PostableAccountConfig) (*AccountConfig, error) {
	switch provider {
	case CloudProviderTypeAWS:
		if config.AWS == nil {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "AWS config can not be nil for AWS provider")
		}

		if err := validateAWSRegion(config.AWS.DeploymentRegion); err != nil {
			return nil, err
		}

		if len(config.AWS.Regions) == 0 {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "at least one region is required")
		}

		for _, region := range config.AWS.Regions {
			if err := validateAWSRegion(region); err != nil {
				return nil, err
			}
		}

		return &AccountConfig{AWS: &AWSAccountConfig{Regions: config.AWS.Regions}}, nil
	default:
		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}

func NewAccountConfigFromUpdatable(provider CloudProviderType, config *UpdatableAccount) (*AccountConfig, error) {
	switch provider {
	case CloudProviderTypeAWS:
		if config.Config.AWS == nil {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "AWS config can not be nil for AWS provider")
		}

		if len(config.Config.AWS.Regions) == 0 {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "at least one region is required")
		}

		for _, region := range config.Config.AWS.Regions {
			if err := validateAWSRegion(region); err != nil {
				return nil, err
			}
		}

		return &AccountConfig{AWS: &AWSAccountConfig{Regions: config.Config.AWS.Regions}}, nil
	default:
		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}

func NewAgentReport(data map[string]any) *AgentReport {
	return &AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            data,
	}
}

func GetSigNozAPIURLFromDeployment(deployment *zeustypes.GettableDeployment) (string, error) {
	if deployment.Name == "" || deployment.Cluster.Region.DNS == "" {
		return "", errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "invalid deployment: missing name or DNS")
	}

	return fmt.Sprintf("https://%s.%s", deployment.Name, deployment.Cluster.Region.DNS), nil
}

func (account *Account) Update(provider CloudProviderType, config *AccountConfig) error {
	account.Config = config
	account.UpdatedAt = time.Now()
	return nil
}

func (postableAccount *PostableAccount) UnmarshalJSON(data []byte) error {
	type Alias PostableAccount

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Config == nil || temp.Credentials == nil {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "config and credentials are required")
	}

	if temp.Credentials.SigNozAPIURL == "" {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "sigNozApiURL can not be empty")
	}

	if temp.Credentials.SigNozAPIKey == "" {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "sigNozApiKey can not be empty")
	}

	if temp.Credentials.IngestionURL == "" {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "ingestionUrl can not be empty")
	}

	if temp.Credentials.IngestionKey == "" {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "ingestionKey can not be empty")
	}

	*postableAccount = PostableAccount(temp)
	return nil
}

func (updatableAccount *UpdatableAccount) UnmarshalJSON(data []byte) error {
	type Alias UpdatableAccount

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if temp.Config == nil {
		return errors.NewInvalidInputf(ErrCodeInvalidInput, "config is required")
	}

	*updatableAccount = UpdatableAccount(temp)
	return nil
}

func (config *PostableAccountConfig) SetAgentVersion(agentVersion string) {
	config.AgentVersion = agentVersion
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

func NewIngestionKeyName(provider CloudProviderType) string {
	return fmt.Sprintf("%s-integration", provider.StringValue())
}
