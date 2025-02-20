package signozalertmanager

import (
	"context"
	"time"

	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type provider struct {
	service     *alertmanager.Service
	config      alertmanager.Config
	settings    factory.ScopedProviderSettings
	configStore alertmanagertypes.ConfigStore
	stateStore  alertmanagertypes.StateStore
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[alertmanager.Alertmanager, alertmanager.Config] {
	return factory.NewProviderFactory(factory.MustNewName("signoz"), func(ctx context.Context, settings factory.ProviderSettings, config alertmanager.Config) (alertmanager.Alertmanager, error) {
		return New(ctx, settings, config, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config alertmanager.Config, sqlstore sqlstore.SQLStore) (*provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/alertmanager/internalalertmanager")
	configStore := sqlalertmanagerstore.NewConfigStore(sqlstore)
	stateStore := sqlalertmanagerstore.NewStateStore(sqlstore)

	return &provider{
		service: alertmanager.New(
			ctx,
			settings,
			config,
			stateStore,
			configStore,
		),
		settings:    settings,
		config:      config,
		configStore: configStore,
		stateStore:  stateStore,
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	ticker := time.NewTicker(provider.config.Signoz.PollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := provider.service.SyncServers(ctx); err != nil {
				provider.settings.Logger().ErrorContext(ctx, "failed to sync alertmanager servers", "error", err)
			}
		}
	}
}

func (provider *provider) Stop(ctx context.Context) error {
	return provider.service.Stop(ctx)
}

func (provider *provider) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.GettableAlerts, error) {
	return provider.service.GetAlerts(ctx, orgID, params)
}

func (provider *provider) PutAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	return provider.service.PutAlerts(ctx, orgID, alerts)
}

func (provider *provider) TestReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	return provider.service.TestReceiver(ctx, orgID, receiver)
}

func (provider *provider) ListChannels(ctx context.Context, orgID string) ([]*alertmanagertypes.Channel, error) {
	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return nil, err
	}

	channels := config.Channels()
	channelList := make([]*alertmanagertypes.Channel, 0, len(channels))
	for _, channel := range channels {
		channelList = append(channelList, channel)
	}

	return channelList, nil
}

func (provider *provider) GetChannelByID(ctx context.Context, orgID string, channelID int) (*alertmanagertypes.Channel, error) {
	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return nil, err
	}

	channels := config.Channels()
	channel, err := alertmanagertypes.GetChannelByID(channels, channelID)
	if err != nil {
		return nil, err
	}

	return channel, nil
}

func (provider *provider) UpdateChannelByReceiverAndID(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver, id int) error {
	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return err
	}

	err = config.UpdateReceiver(alertmanagertypes.NewRouteFromReceiver(receiver), receiver)
	if err != nil {
		return err
	}

	err = provider.configStore.Set(ctx, config)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) DeleteChannelByID(ctx context.Context, orgID string, channelID int) error {
	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return err
	}

	channels := config.Channels()
	channel, err := alertmanagertypes.GetChannelByID(channels, channelID)
	if err != nil {
		return err
	}

	err = config.DeleteReceiver(channel.Name)
	if err != nil {
		return err
	}

	err = provider.configStore.Set(ctx, config)
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) CreateChannel(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return err
	}

	err = config.CreateReceiver(alertmanagertypes.NewRouteFromReceiver(receiver), receiver)
	if err != nil {
		return err
	}

	err = provider.configStore.Set(ctx, config)
	if err != nil {
		return err
	}

	return nil
}
