package pollinglicensing

import (
	"context"
	"sync"

	"github.com/SigNoz/signoz/ee/licensing/licensingserver"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/licensing"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/SigNoz/signoz/pkg/zeus"
)

type Service struct {
	// config is the config for the licensing service
	config licensing.Config

	// store is the store for the licensing service
	store licensetypes.Store

	// zeus
	zeus zeus.Zeus

	// settings is the settings for the licensing service
	settings factory.ScopedProviderSettings

	// Map of organization id to alertmanager server
	servers map[valuer.UUID]*licensingserver.Server

	// Mutex to protect the servers map
	serversMtx sync.RWMutex
}

func NewService(ctx context.Context, settings factory.ScopedProviderSettings, config licensing.Config, store licensetypes.Store, zeus zeus.Zeus) *Service {
	service := &Service{
		config:     config,
		store:      store,
		zeus:       zeus,
		settings:   settings,
		servers:    make(map[valuer.UUID]*licensingserver.Server),
		serversMtx: sync.RWMutex{},
	}

	return service
}

func (service *Service) SyncServers(ctx context.Context) error {
	orgIDs, err := service.store.ListOrgs(ctx)
	if err != nil {
		return err
	}

	service.serversMtx.Lock()
	for _, orgID := range orgIDs {
		// If the server is not present, create it and sync the config
		if _, ok := service.servers[orgID]; !ok {
			server := licensingserver.NewServer(service.settings.Logger(), licensingserver.NewConfigFromLicensingConfig(service.config), orgID, service.zeus, service.store)
			service.servers[orgID] = server
		}

		err = service.servers[orgID].Fetch(ctx)
		if err != nil {
			service.settings.Logger().Error("failed to fetch license for licensing server", "orgID", orgID, "error", err)
			continue
		}
	}
	service.serversMtx.Unlock()

	return nil
}

func (service *Service) SyncOrgServer(ctx context.Context, orgID valuer.UUID) error {
	service.serversMtx.Lock()
	defer service.serversMtx.Unlock()

	_, ok := service.servers[orgID]
	if !ok {
		server := licensingserver.NewServer(service.settings.Logger(), licensingserver.NewConfigFromLicensingConfig(service.config), orgID, service.zeus, service.store)
		service.servers[orgID] = server
	}

	err := service.servers[orgID].Fetch(ctx)
	if err != nil {
		service.settings.Logger().Error("failed to fetch license for licensing server", "orgID", orgID, "error", err)
		return err
	}

	return nil
}

func (service *Service) getServer(orgID valuer.UUID) (*licensingserver.Server, error) {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, ok := service.servers[orgID]
	if !ok {
		return nil, errors.Newf(errors.TypeNotFound, licensing.ErrCodeLicensingServerNotFound, "server not found for %s", orgID.StringValue())
	}

	return server, nil
}
