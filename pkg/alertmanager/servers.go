package alertmanager

import (
	"context"

	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore"
	"go.signoz.io/signoz/pkg/factory"
)

var _ factory.Service = (*Servers)(nil)

type Servers struct {
	// Map of organization id to server
	servers map[string]*Server
}

func New(ctx context.Context, settings factory.Settings, config Config, store alertmanagerstore.Store) (*Servers, error) {
	multi := &Servers{
		servers: map[string]*Server{},
	}

	orgIDs, err := store.ListOrgIDs(ctx)
	if err != nil {
		return nil, err
	}

	for _, orgID := range orgIDs {
		server, err := NewForOrg(ctx, settings, config, orgID, store)
		if err != nil {
			return nil, err
		}

		multi.servers[orgID] = server
	}

	return multi, nil
}

func (m *Servers) Start(ctx context.Context) error {
	for _, server := range m.servers {
		err := server.Start(ctx)
		if err != nil {
			return err
		}
	}

	return nil
}

func (m *Servers) Stop(ctx context.Context) error {
	for _, server := range m.servers {
		server.Stop(ctx)
	}

	return nil
}
