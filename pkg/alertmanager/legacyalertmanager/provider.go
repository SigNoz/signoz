package legacyalertmanager

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerbatcher"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

const (
	alertsPath       string = "/v1/alerts"
	routesPath       string = "/v1/routes"
	testReceiverPath string = "/v1/testReceiver"
)

type provider struct {
	config      alertmanager.Config
	settings    factory.ScopedProviderSettings
	client      *http.Client
	configStore alertmanagertypes.ConfigStore
	batcher     *alertmanagerbatcher.Batcher
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[alertmanager.Alertmanager, alertmanager.Config] {
	return factory.NewProviderFactory(factory.MustNewName("legacy"), func(ctx context.Context, settings factory.ProviderSettings, config alertmanager.Config) (alertmanager.Alertmanager, error) {
		return New(ctx, settings, config, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config alertmanager.Config, sqlstore sqlstore.SQLStore) (*provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/alertmanager/legacyalertmanager")
	configStore := sqlalertmanagerstore.NewConfigStore(sqlstore)

	return &provider{
		config:   config,
		settings: settings,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		configStore: configStore,
		batcher:     alertmanagerbatcher.New(settings.Logger(), alertmanagerbatcher.NewConfig()),
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	err := provider.batcher.Start(ctx)
	if err != nil {
		return err
	}
	defer provider.batcher.Stop(ctx)

	for {
		select {
		case <-ctx.Done():
			return nil
		case alerts := <-provider.batcher.C:
			if err := provider.putAlerts(ctx, "", alerts); err != nil {
				provider.settings.Logger().Error("failed to send alerts to alertmanager", "error", err)
			}
		}
	}
}

func (provider *provider) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.GettableAlerts, error) {
	url := provider.config.Legacy.URL.JoinPath(alertsPath)
	url.RawQuery = params.RawQuery

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", "application/json")

	resp, err := provider.client.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close() //nolint:errcheck
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var alerts alertmanagertypes.GettableAlerts
	if err := json.Unmarshal(body, &alerts); err != nil {
		return nil, err
	}

	return alerts, nil
}

func (provider *provider) PutAlerts(ctx context.Context, _ string, alerts alertmanagertypes.PostableAlerts) error {
	provider.batcher.Send(ctx, alerts...)
	return nil
}

func (provider *provider) putAlerts(ctx context.Context, _ string, alerts alertmanagertypes.PostableAlerts) error {
	url := provider.config.Legacy.URL.JoinPath(alertsPath)

	body, err := json.Marshal(alerts)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url.String(), bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Add("Content-Type", "application/json")

	resp, err := provider.client.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close() //nolint:errcheck

	// Any HTTP status 2xx is OK.
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("bad response status %v", resp.Status)
	}

	return nil
}

func (provider *provider) TestReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	url := provider.config.Legacy.URL.JoinPath(testReceiverPath)

	body, err := json.Marshal(receiver)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url.String(), bytes.NewBuffer(body))
	if err != nil {
		return err
	}
	req.Header.Add("Content-Type", "application/json")

	resp, err := provider.client.Do(req)
	if err != nil {
		return err
	}

	defer resp.Body.Close() //nolint:errcheck

	// Any HTTP status 2xx is OK.
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("bad response status %v", resp.Status)
	}

	return nil
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

func (provider *provider) UpdateChannelByReceiver(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver) error {
	config, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return err
	}

	err = config.UpdateReceiver(alertmanagertypes.NewRouteFromReceiver(receiver), receiver)
	if err != nil {
		return err
	}

	err = provider.configStore.Set(ctx, config, func(ctx context.Context) error {
		url := provider.config.Legacy.URL.JoinPath(routesPath)

		body, err := json.Marshal(receiver)
		if err != nil {
			return err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPut, url.String(), bytes.NewBuffer(body))
		if err != nil {
			return err
		}
		req.Header.Add("Content-Type", "application/json")

		resp, err := provider.client.Do(req)
		if err != nil {
			return err
		}

		defer resp.Body.Close() //nolint:errcheck

		// Any HTTP status 2xx is OK.
		if resp.StatusCode/100 != 2 {
			return fmt.Errorf("bad response status %v", resp.Status)
		}

		return nil
	})
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

	err = provider.configStore.Set(ctx, config, func(ctx context.Context) error {
		url := provider.config.Legacy.URL.JoinPath(routesPath)

		body, err := json.Marshal(receiver)
		if err != nil {
			return err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url.String(), bytes.NewBuffer(body))
		if err != nil {
			return err
		}
		req.Header.Add("Content-Type", "application/json")

		resp, err := provider.client.Do(req)
		if err != nil {
			return err
		}

		defer resp.Body.Close() //nolint:errcheck

		// Any HTTP status 2xx is OK.
		if resp.StatusCode/100 != 2 {
			return fmt.Errorf("bad response status %v", resp.Status)
		}

		return nil
	})
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

	err = provider.configStore.Set(ctx, config, func(ctx context.Context) error {
		url := provider.config.Legacy.URL.JoinPath(routesPath)

		body, err := json.Marshal(map[string]string{"name": channel.Name})
		if err != nil {
			return err
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url.String(), bytes.NewBuffer(body))
		if err != nil {
			return err
		}
		req.Header.Add("Content-Type", "application/json")

		resp, err := provider.client.Do(req)
		if err != nil {
			return err
		}

		defer resp.Body.Close() //nolint:errcheck

		// Any HTTP status 2xx is OK.
		if resp.StatusCode/100 != 2 {
			return fmt.Errorf("bad response status %v", resp.Status)
		}

		return nil
	})
	if err != nil {
		return err
	}

	return nil
}

func (provider *provider) Stop(ctx context.Context) error {
	return nil
}
