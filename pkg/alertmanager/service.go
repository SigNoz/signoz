package alertmanager

import (
	"context"
	"sync"

	"go.signoz.io/signoz/pkg/alertmanager/server"
	"go.signoz.io/signoz/pkg/errors"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type Service struct {
	// config is the config for the alertmanager service
	config Config

	// stateStore is the state store for the alertmanager service
	stateStore alertmanagertypes.StateStore

	// configStore is the config store for the alertmanager service
	configStore alertmanagertypes.ConfigStore

	// settings is the settings for the alertmanager service
	settings factory.ScopedProviderSettings

	// Map of organization id to alertmanager server
	servers map[string]*server.Server

	// Mutex to protect the servers map
	serversMtx sync.RWMutex
}

func New(ctx context.Context, settings factory.ScopedProviderSettings, config Config, stateStore alertmanagertypes.StateStore, configStore alertmanagertypes.ConfigStore) *Service {
	service := &Service{
		config:      config,
		stateStore:  stateStore,
		configStore: configStore,
		settings:    settings,
		servers:     make(map[string]*server.Server),
		serversMtx:  sync.RWMutex{},
	}

	return service
}

func (service *Service) SyncServers(ctx context.Context) error {
	orgIDs, err := service.configStore.ListOrgs(ctx)
	if err != nil {
		return err
	}

	service.serversMtx.Lock()
	for _, orgID := range orgIDs {
		config, err := service.getConfig(ctx, orgID)
		if err != nil {
			service.settings.Logger().Error("failed to get alertmanagerconfig for org", "orgID", orgID, "error", err)
			continue
		}

		service.servers[orgID], err = server.New(ctx, service.settings.Logger(), service.settings.PrometheusRegisterer(), server.Config{}, orgID, service.stateStore)
		if err != nil {
			service.settings.Logger().Error("failed to create alertmanagerserver", "orgID", orgID, "error", err)
			continue
		}

		err = service.servers[orgID].SetConfig(ctx, config)
		if err != nil {
			service.settings.Logger().Error("failed to set config for alertmanager server", "orgID", orgID, "error", err)
			continue
		}
	}
	service.serversMtx.Unlock()

	return nil
}

func (service *Service) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.GettableAlerts, error) {
	server, err := service.getServer(orgID)
	if err != nil {
		return nil, err
	}

	return server.GetAlerts(ctx, params)
}

func (service *Service) PutAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	server, err := service.getServer(orgID)
	if err != nil {
		return err
	}

	return server.PutAlerts(ctx, alerts)
}

func (service *Service) TestReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	server, err := service.getServer(orgID)
	if err != nil {
		return err
	}

	return server.TestReceiver(ctx, receiver)
}

func (service *Service) Stop(ctx context.Context) error {
	for _, server := range service.servers {
		server.Stop(ctx)
	}

	return nil
}

func (service *Service) getConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	config, err := service.configStore.Get(ctx, orgID)
	if err != nil {
		if !errors.Ast(err, errors.TypeNotFound) {
			return nil, err
		}

		config, err = alertmanagertypes.NewDefaultConfig(service.config.Global, service.config.Route, orgID)
		if err != nil {
			return nil, err
		}

		return config, err
	}

	return config, nil
}

func (service *Service) getServer(orgID string) (*server.Server, error) {
	server, ok := service.servers[orgID]
	if !ok {
		return nil, errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerNotFound, "alertmanager not found for org %s", orgID)
	}

	return server, nil
}
