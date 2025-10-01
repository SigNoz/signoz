package alertmanager

import (
	"context"
	"sync"

	"github.com/prometheus/alertmanager/featurecontrol"
	"github.com/prometheus/alertmanager/matcher/compat"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagerserver"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

type Service struct {
	// config is the config for the alertmanager service
	config alertmanagerserver.Config

	// stateStore is the state store for the alertmanager service
	stateStore alertmanagertypes.StateStore

	// configStore is the config store for the alertmanager service
	configStore alertmanagertypes.ConfigStore

	// organization is the organization module for the alertmanager service
	orgGetter organization.Getter

	// settings is the settings for the alertmanager service
	settings factory.ScopedProviderSettings

	// Map of organization id to alertmanager server
	servers map[string]*alertmanagerserver.Server

	// Mutex to protect the servers map
	serversMtx sync.RWMutex

	notificationManager nfmanager.NotificationManager
}

func New(
	ctx context.Context,
	settings factory.ScopedProviderSettings,
	config alertmanagerserver.Config,
	stateStore alertmanagertypes.StateStore,
	configStore alertmanagertypes.ConfigStore,
	orgGetter organization.Getter,
	nfManager nfmanager.NotificationManager,
) *Service {
	service := &Service{
		config:              config,
		stateStore:          stateStore,
		configStore:         configStore,
		orgGetter:           orgGetter,
		settings:            settings,
		servers:             make(map[string]*alertmanagerserver.Server),
		serversMtx:          sync.RWMutex{},
		notificationManager: nfManager,
	}

	return service
}

func (service *Service) SyncServers(ctx context.Context) error {
	compat.InitFromFlags(service.settings.Logger(), featurecontrol.NoopFlags{})
	orgs, err := service.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return err
	}

	service.serversMtx.Lock()
	for _, org := range orgs {
		config, err := service.getConfig(ctx, org.ID.StringValue())
		if err != nil {
			service.settings.Logger().ErrorContext(ctx, "failed to get alertmanager config for org", "org_id", org.ID.StringValue(), "error", err)
			continue
		}

		// If the server is not present, create it and sync the config
		if _, ok := service.servers[org.ID.StringValue()]; !ok {
			server, err := service.newServer(ctx, org.ID.StringValue())
			if err != nil {
				service.settings.Logger().ErrorContext(ctx, "failed to create alertmanager server", "org_id", org.ID.StringValue(), "error", err)
				continue
			}

			service.servers[org.ID.StringValue()] = server
		}

		if service.servers[org.ID.StringValue()].Hash() == config.StoreableConfig().Hash {
			service.settings.Logger().DebugContext(ctx, "skipping alertmanager sync for org", "org_id", org.ID.StringValue(), "hash", config.StoreableConfig().Hash)
			continue
		}

		err = service.servers[org.ID.StringValue()].SetConfig(ctx, config)
		if err != nil {
			service.settings.Logger().ErrorContext(ctx, "failed to set config for alertmanager server", "org_id", org.ID.StringValue(), "error", err)
			continue
		}
	}
	service.serversMtx.Unlock()

	return nil
}

func (service *Service) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.DeprecatedGettableAlerts, error) {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, err := service.getServer(orgID)
	if err != nil {
		return nil, err
	}

	alerts, err := server.GetAlerts(ctx, params)
	if err != nil {
		return nil, err
	}

	return alertmanagertypes.NewDeprecatedGettableAlertsFromGettableAlerts(alerts), nil
}

func (service *Service) PutAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, err := service.getServer(orgID)
	if err != nil {
		return err
	}

	return server.PutAlerts(ctx, alerts)
}

func (service *Service) TestReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, err := service.getServer(orgID)
	if err != nil {
		return err
	}

	return server.TestReceiver(ctx, receiver)
}

func (service *Service) TestAlert(ctx context.Context, orgID string, receiversMap map[*alertmanagertypes.PostableAlert][]string, config *alertmanagertypes.NotificationConfig) error {
	service.serversMtx.RLock()
	defer service.serversMtx.RUnlock()

	server, err := service.getServer(orgID)
	if err != nil {
		return err
	}

	return server.TestAlert(ctx, receiversMap, config)
}

func (service *Service) Stop(ctx context.Context) error {
	var errs []error
	for _, server := range service.servers {
		if err := server.Stop(ctx); err != nil {
			errs = append(errs, err)
			service.settings.Logger().ErrorContext(ctx, "failed to stop alertmanager server", "error", err)
		}
	}

	return errors.Join(errs...)
}

func (service *Service) newServer(ctx context.Context, orgID string) (*alertmanagerserver.Server, error) {
	config, err := service.getConfig(ctx, orgID)
	if err != nil {
		return nil, err
	}

	server, err := alertmanagerserver.New(ctx, service.settings.Logger(), service.settings.PrometheusRegisterer(), service.config, orgID, service.stateStore, service.notificationManager)
	if err != nil {
		return nil, err
	}

	beforeCompareAndSelectHash := config.StoreableConfig().Hash
	config, err = service.compareAndSelectConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	if beforeCompareAndSelectHash == config.StoreableConfig().Hash {
		service.settings.Logger().DebugContext(ctx, "skipping config store update for org", "org_id", orgID, "hash", config.StoreableConfig().Hash)
		return server, nil
	}

	err = service.configStore.Set(ctx, config)
	if err != nil {
		return nil, err
	}

	return server, nil
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
	}

	if err := config.SetGlobalConfig(service.config.Global); err != nil {
		return nil, err
	}
	if err := config.SetRouteConfig(service.config.Route); err != nil {
		return nil, err
	}

	return config, nil
}

func (service *Service) compareAndSelectConfig(ctx context.Context, incomingConfig *alertmanagertypes.Config) (*alertmanagertypes.Config, error) {
	channels, err := service.configStore.ListChannels(ctx, incomingConfig.StoreableConfig().OrgID)
	if err != nil {
		return nil, err
	}

	matchers, err := service.configStore.GetMatchers(ctx, incomingConfig.StoreableConfig().OrgID)
	if err != nil {
		return nil, err
	}

	config, err := alertmanagertypes.NewConfigFromChannels(service.config.Global, service.config.Route, channels, incomingConfig.StoreableConfig().OrgID)
	if err != nil {
		return nil, err
	}

	for ruleID, receivers := range matchers {
		err = config.CreateRuleIDMatcher(ruleID, receivers)
		if err != nil {
			return nil, err
		}
	}

	if incomingConfig.StoreableConfig().Hash != config.StoreableConfig().Hash {
		service.settings.Logger().InfoContext(ctx, "mismatch found, updating config to match channels and matchers")
		return config, nil
	}

	return incomingConfig, nil

}

// getServer returns the server for the given orgID. It should be called with the lock held.
func (service *Service) getServer(orgID string) (*alertmanagerserver.Server, error) {
	server, ok := service.servers[orgID]
	if !ok {
		return nil, errors.Newf(errors.TypeNotFound, ErrCodeAlertmanagerNotFound, "alertmanager not found for org %s", orgID)
	}

	return server, nil
}
