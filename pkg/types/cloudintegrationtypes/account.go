package cloudintegrationtypes

import (
	"encoding/json"
	"fmt"
	"maps"
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
	SyncState       *SyncState     `json:"syncState" required:"true" nullable:"true"`
}

type SyncState struct {
	Version int64                       `json:"version" required:"true"`
	InSync  bool                        `json:"inSync" required:"true"`
	Regions map[string]*RegionSyncState `json:"regions" required:"true" nullable:"false"`
}

type RegionSyncState struct {
	State RegionState `json:"state" required:"true"`
}

type AccountConfig struct {
	AWS   *AWSAccountConfig   `json:"aws,omitempty" required:"false" nullable:"false"`
	Azure *AzureAccountConfig `json:"azure,omitempty" required:"false" nullable:"false"`
	GCP   *GCPAccountConfig   `json:"gcp,omitempty" required:"false" nullable:"false"`
}

type UpdatableAccountConfig struct {
	AWS   *UpdatableAWSAccountConfig   `json:"aws,omitempty" required:"false" nullable:"false"`
	Azure *UpdatableAzureAccountConfig `json:"azure,omitempty" required:"false" nullable:"false"`
	GCP   *UpdatableGCPAccountConfig   `json:"gcp,omitempty" required:"false" nullable:"false"`
}

type PostableAccount struct {
	Config      *PostableAccountConfig `json:"config" required:"true"`
	Credentials *Credentials           `json:"credentials" required:"true"`
}

type PostableAccountConfig struct {
	// as agent version is common for all providers, we can keep it at top level of this struct
	AgentVersion string
	AWS          *AWSPostableAccountConfig   `json:"aws,omitempty" required:"false" nullable:"false"`
	Azure        *AzurePostableAccountConfig `json:"azure,omitempty" required:"false" nullable:"false"`
	GCP          *GCPPostableAccountConfig   `json:"gcp,omitempty" required:"false" nullable:"false"`
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
	AWS   *AWSConnectionArtifact   `json:"aws,omitempty" required:"false" nullable:"false"`
	Azure *AzureConnectionArtifact `json:"azure,omitempty" required:"false" nullable:"false"`
	GCP   *GCPConnectionArtifact   `json:"gcp,omitempty" required:"false" nullable:"false"`
}

type GetConnectionArtifactRequest = PostableAccount

type GettableAccounts struct {
	Accounts []*Account `json:"accounts" required:"true" nullable:"false"`
}

type UpdatableAccount struct {
	Config *UpdatableAccountConfig `json:"config" required:"true" nullable:"false"`
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
	case CloudProviderTypeAzure:
		azureConfig := new(AzureAccountConfig)
		err := json.Unmarshal([]byte(storableAccount.Config), azureConfig)
		if err != nil {
			return nil, err
		}
		account.Config.Azure = azureConfig
	case CloudProviderTypeGCP:
		gcpConfig := new(GCPAccountConfig)
		err := json.Unmarshal([]byte(storableAccount.Config), gcpConfig)
		if err != nil {
			return nil, err
		}
		account.Config.GCP = gcpConfig
	}

	if storableAccount.LastAgentReport != nil {
		account.AgentReport = &AgentReport{
			TimestampMillis: storableAccount.LastAgentReport.TimestampMillis,
			Data:            storableAccount.LastAgentReport.Data,
			SyncState:       NewSyncStateFromStorable(storableAccount.LastAgentReport.SyncState),
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
	case CloudProviderTypeAzure:
		if config.Azure == nil {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "Azure config can not be nil for Azure provider")
		}

		if config.Azure.DeploymentRegion == "" {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "deployment region is required for Azure provider")
		}

		if err := validateAzureRegion(config.Azure.DeploymentRegion); err != nil {
			return nil, err
		}

		if len(config.Azure.ResourceGroups) == 0 {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "at least one resource group is required for Azure provider")
		}

		return &AccountConfig{Azure: &AzureAccountConfig{DeploymentRegion: config.Azure.DeploymentRegion, ResourceGroups: config.Azure.ResourceGroups}}, nil
	case CloudProviderTypeGCP:
		if config.GCP == nil {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "GCP config can not be nil for GCP provider")
		}

		if config.GCP.DeploymentProjectID == "" {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "deployment project ID is required for GCP provider")
		}

		if err := validateGCPRegion(config.GCP.DeploymentRegion); err != nil {
			return nil, err
		}

		if len(config.GCP.ProjectIDs) == 0 {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "at least one project id is required for GCP provider")
		}

		return &AccountConfig{
			GCP: &GCPAccountConfig{
				DeploymentProjectID: config.GCP.DeploymentProjectID,
				ProjectIDs:          config.GCP.ProjectIDs,
				DeploymentRegion:    config.GCP.DeploymentRegion,
			},
		}, nil
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
	case CloudProviderTypeAzure:
		if config.Config.Azure == nil {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "Azure config can not be nil for Azure provider")
		}

		if len(config.Config.Azure.ResourceGroups) == 0 {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "at least one resource group is required for Azure provider")
		}

		return &AccountConfig{Azure: &AzureAccountConfig{ResourceGroups: config.Config.Azure.ResourceGroups}}, nil
	case CloudProviderTypeGCP:
		if config.Config.GCP == nil {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "GCP config can not be nil for GCP provider")
		}

		if err := validateGCPRegion(config.Config.GCP.DeploymentRegion); err != nil {
			return nil, err
		}

		if len(config.Config.GCP.ProjectIDs) == 0 {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "at least one project id is required for GCP provider")
		}

		if config.Config.GCP.DeploymentProjectID == "" {
			return nil, errors.NewInvalidInputf(ErrCodeInvalidInput, "deployment project ID is required for GCP provider")
		}

		return &AccountConfig{
			GCP: &GCPAccountConfig{
				DeploymentProjectID: config.Config.GCP.DeploymentProjectID,
				ProjectIDs:          config.Config.GCP.ProjectIDs,
				DeploymentRegion:    config.Config.GCP.DeploymentRegion,
			},
		}, nil
	default:
		return nil, errors.NewInvalidInputf(ErrCodeCloudProviderInvalidInput, "invalid cloud provider: %s", provider.StringValue())
	}
}

func NewAgentReport(data map[string]any, syncState *SyncState) *AgentReport {
	return &AgentReport{
		TimestampMillis: time.Now().UnixMilli(),
		Data:            data,
		SyncState:       syncState,
	}
}

func NewSyncStateFromStorable(storableSyncState *StorableSyncState) *SyncState {
	if storableSyncState == nil {
		return nil
	}

	regions := make(map[string]*RegionSyncState, len(storableSyncState.Regions))
	for region, regionSyncState := range storableSyncState.Regions {
		regions[region] = &RegionSyncState{State: regionSyncState.State}
	}

	return &SyncState{
		Version: storableSyncState.Version,
		InSync:  storableSyncState.InSync,
		Regions: regions,
	}
}

func GetSigNozAPIURLFromDeployment(deployment *zeustypes.GettableDeployment) (string, error) {
	if deployment.Name == "" || deployment.Cluster.Region.DNS == "" {
		return "", errors.New(errors.TypeInvalidInput, ErrCodeInvalidInput, "invalid deployment: missing name or DNS")
	}

	return fmt.Sprintf("https://%s.%s", deployment.Name, deployment.Cluster.Region.DNS), nil
}

func (account *Account) Update(provider CloudProviderType, config *AccountConfig) error {
	// deployment region can not be updated once set for Azure
	if provider == CloudProviderTypeAzure {
		config.Azure.DeploymentRegion = account.Config.Azure.DeploymentRegion
	}

	account.Config = config
	account.UpdatedAt = time.Now()

	return nil
}

func (account *Account) UpdateAgentReport(providerAccountID *string, agentReport *AgentReport) {
	account.ProviderAccountID = providerAccountID
	account.AgentReport = agentReport
}

// UpdateSyncState keeps the rest of the agent report, and is a no-op when the agent has never checked in.
func (account *Account) UpdateSyncState(syncState *SyncState) {
	if account.AgentReport == nil {
		return
	}

	account.AgentReport.SyncState = syncState
}

// NextSyncState returns the sync state for this check-in, or nil for providers without one.
func (account *Account) NextSyncState(syncedVersion *int64) *SyncState {
	if account.Provider != CloudProviderTypeAWS {
		return nil
	}

	var previous *SyncState
	if account.AgentReport != nil {
		previous = account.AgentReport.SyncState
	}

	regions := account.Config.AWS.Regions
	// Removed before the agent ever checked in: no region was sent to it, so there is nothing to clean up.
	if account.AgentReport == nil && account.RemovedAt != nil {
		regions = nil
	}

	return newSyncState(previous, regions, account.RemovedAt != nil, syncedVersion)
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
	switch {
	case config.AWS != nil:
		return json.Marshal(config.AWS)
	case config.Azure != nil:
		return json.Marshal(config.Azure)
	case config.GCP != nil:
		return json.Marshal(config.GCP)
	default:
		return nil, errors.NewInternalf(errors.CodeInternal, "no provider account config found")
	}
}

func NewIngestionKeyName(provider CloudProviderType) string {
	return fmt.Sprintf("%s-integration", provider.StringValue())
}

// newSyncState returns the sync state after a check-in without mutating previous.
func newSyncState(previous *SyncState, regions []string, removed bool, syncedVersion *int64) *SyncState {
	if previous == nil {
		previous = newSyncStateFromRegions(regions)
	}

	next := previous.copy()

	// The agent synced this version, so its disabled regions are cleaned up and can be dropped.
	if syncedVersion != nil && *syncedVersion == next.Version {
		next.InSync = true
		maps.DeleteFunc(next.Regions, func(_ string, regionSyncState *RegionSyncState) bool {
			return regionSyncState.State == RegionStateDisabled
		})
	}

	// Once the integration is removed, every region is disabled.
	if removed {
		regions = nil
	}

	changed := false
	desiredRegionsMap := make(map[string]struct{}, len(regions))

	for _, region := range regions {
		desiredRegionsMap[region] = struct{}{}

		if regionSyncState, ok := next.Regions[region]; ok && regionSyncState.State == RegionStateEnabled {
			continue
		}

		next.Regions[region] = &RegionSyncState{State: RegionStateEnabled}
		changed = true
	}

	for region, regionSyncState := range next.Regions {
		_, ok := desiredRegionsMap[region]
		if ok && regionSyncState.State == RegionStateEnabled {
			continue
		}

		if !ok && regionSyncState.State == RegionStateDisabled {
			continue
		}

		regionSyncState.State = RegionStateDisabled
		changed = true
	}

	if changed {
		next.Version++
		next.InSync = false
	}

	return next
}

// newSyncStateFromRegions is used on the first check-in, when the agent has already deployed regions, so it starts in sync.
func newSyncStateFromRegions(regions []string) *SyncState {
	syncState := &SyncState{Version: 1, InSync: true, Regions: make(map[string]*RegionSyncState, len(regions))}
	for _, region := range regions {
		syncState.Regions[region] = &RegionSyncState{State: RegionStateEnabled}
	}

	return syncState
}

func (syncState *SyncState) copy() *SyncState {
	regions := make(map[string]*RegionSyncState, len(syncState.Regions))
	for region, regionSyncState := range syncState.Regions {
		regions[region] = &RegionSyncState{State: regionSyncState.State}
	}

	return &SyncState{Version: syncState.Version, InSync: syncState.InSync, Regions: regions}
}
