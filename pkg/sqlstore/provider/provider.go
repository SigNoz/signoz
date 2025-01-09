package provider

import (
	"fmt"

	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/provider/sqlite"
)

func New(config sqlstore.Config, providerConfig sqlstore.ProviderConfig) (sqlstore.Provider, error) {
	switch config.Provider {
	case "sqlite":
		return sqlite.New(config, providerConfig)
	}

	return nil, fmt.Errorf("provider %q not found", config.Provider)
}
