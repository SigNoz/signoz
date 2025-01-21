package alertmanagerserver

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/factory"
)

type MultiServer struct {
	// Map of organization id to server
	servers map[string]*Server
}

func NewMulti(ctx context.Context, providerSettings factory.ProviderSettings, config alertmanager.Config, store alertmanager.Store) (*MultiServer, error) {
	multi := &MultiServer{
		servers: map[string]*Server{},
	}

	orgIDs, err := store.ListOrgIDs(ctx)
	if err != nil {
		return nil, err
	}

	for _, orgID := range orgIDs {
		multi.servers[orgID], err = New(ctx, providerSettings, config, orgID, store)
		if err != nil {
			return nil, err
		}
	}

	return multi, nil
}

func (m *MultiServer) Start(ctx context.Context) error {
	for _, server := range m.servers {
		err := server.Start(ctx)
		if err != nil {
			return err
		}
	}

	return nil
}

func (m *MultiServer) Stop(ctx context.Context) error {
	for _, server := range m.servers {
		server.Stop(ctx)
	}

	return nil
}
