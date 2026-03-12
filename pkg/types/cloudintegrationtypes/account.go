package cloudintegrationtypes

import (
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"
)

type (
	ConnectedAccountsList struct {
		Accounts []*Account `json:"accounts"`
	}

	GettableConnectedAccountsList = ConnectedAccountsList
)

type (
	Account struct {
		Id                string            `json:"id"`
		ProviderAccountId *string           `json:"providerAccountID,omitempty"`
		Provider          CloudProviderType `json:"provider"`
		RemovedAt         *time.Time        `json:"removedAt,omitempty"`
		AgentReport       *AgentReport      `json:"agentReport,omitempty"`
		OrgID             valuer.UUID       `json:"orgID"`
		Config            *AccountConfig    `json:"accountConfig,omitempty"`
	}

	GettableAccount = Account
)

type AgentReport struct {
	TimestampMillis int64          `json:"timestampMillis"`
	Data            map[string]any `json:"data"`
}

type AccountConfig struct {
	AWS *AWSAccountConfig `json:"aws,omitempty"`
}

type AWSAccountConfig struct {
	Regions []string `json:"regions"`
}
