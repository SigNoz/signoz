package legacyalertmanager

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/tidwall/gjson"
	"go.signoz.io/signoz/pkg/alertmanager"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerbatcher"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerstore/sqlalertmanagerstore"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type postableAlert struct {
	*alertmanagertypes.PostableAlert
	Receivers []string `json:"receivers"`
}

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
	url         *url.URL
}

func NewFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[alertmanager.Alertmanager, alertmanager.Config] {
	return factory.NewProviderFactory(factory.MustNewName("legacy"), func(ctx context.Context, settings factory.ProviderSettings, config alertmanager.Config) (alertmanager.Alertmanager, error) {
		return New(ctx, settings, config, sqlstore)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config alertmanager.Config, sqlstore sqlstore.SQLStore) (*provider, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/alertmanager/legacyalertmanager")
	configStore := sqlalertmanagerstore.NewConfigStore(sqlstore)

	url, err := url.Parse(config.Legacy.ApiURL)
	if err != nil {
		return nil, err
	}

	return &provider{
		config:   config,
		settings: settings,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		configStore: configStore,
		batcher:     alertmanagerbatcher.New(settings.Logger(), alertmanagerbatcher.NewConfig()),
		url:         url,
	}, nil
}

func (provider *provider) Start(ctx context.Context) error {
	err := provider.batcher.Start(ctx)
	if err != nil {
		return err
	}

	for alerts := range provider.batcher.C {
		if err := provider.putAlerts(ctx, "", alerts); err != nil {
			provider.settings.Logger().Error("failed to send alerts to alertmanager", "error", err)
		}
	}

	return nil
}

func (provider *provider) GetAlerts(ctx context.Context, orgID string, params alertmanagertypes.GettableAlertsParams) (alertmanagertypes.DeprecatedGettableAlerts, error) {
	url := provider.url.JoinPath(alertsPath)
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

	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("bad response status %v", resp.Status)
	}

	var alerts alertmanagertypes.DeprecatedGettableAlerts
	if err := json.Unmarshal([]byte(gjson.GetBytes(body, "data").Raw), &alerts); err != nil {
		return nil, err
	}

	return alerts, nil
}

func (provider *provider) PutAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	provider.batcher.Add(ctx, alerts...)
	return nil
}

func (provider *provider) putAlerts(ctx context.Context, orgID string, alerts alertmanagertypes.PostableAlerts) error {
	cfg, err := provider.configStore.Get(ctx, orgID)
	if err != nil {
		return err
	}

	legacyAlerts := make([]postableAlert, len(alerts))
	for i, alert := range alerts {
		receivers, err := cfg.ReceiverNamesFromRuleID(alert.Alert.Labels["ruleID"])
		if err != nil {
			return err
		}

		legacyAlerts[i] = postableAlert{
			PostableAlert: alert,
			Receivers:     receivers,
		}
	}

	url := provider.url.JoinPath(alertsPath)

	body, err := json.Marshal(legacyAlerts)
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
	url := provider.url.JoinPath(testReceiverPath)

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

func (provider *provider) TestAlert(ctx context.Context, orgID string, alert *alertmanagertypes.PostableAlert, receivers []string) error {
	url := provider.url.JoinPath(alertsPath)

	legacyAlert := postableAlert{
		PostableAlert: alert,
		Receivers:     receivers,
	}

	body, err := json.Marshal(legacyAlert)
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
	return provider.configStore.ListChannels(ctx, orgID)
}

func (provider *provider) ListAllChannels(ctx context.Context) ([]*alertmanagertypes.Channel, error) {
	return provider.configStore.ListAllChannels(ctx)
}

func (provider *provider) GetChannelByID(ctx context.Context, orgID string, channelID int) (*alertmanagertypes.Channel, error) {
	return provider.configStore.GetChannelByID(ctx, orgID, channelID)
}

func (provider *provider) UpdateChannelByReceiverAndID(ctx context.Context, orgID string, receiver alertmanagertypes.Receiver, id int) error {
	channel, err := provider.configStore.GetChannelByID(ctx, orgID, id)
	if err != nil {
		return err
	}

	err = channel.Update(receiver)
	if err != nil {
		return err
	}

	err = provider.configStore.UpdateChannel(ctx, orgID, channel, func(ctx context.Context) error {
		url := provider.url.JoinPath(routesPath)

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
	channel := alertmanagertypes.NewChannelFromReceiver(receiver, orgID)

	err := provider.configStore.CreateChannel(ctx, channel, func(ctx context.Context) error {
		url := provider.url.JoinPath(routesPath)

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
	err := provider.configStore.DeleteChannelByID(ctx, orgID, channelID, func(ctx context.Context) error {
		channel, err := provider.configStore.GetChannelByID(ctx, orgID, channelID)
		if err != nil {
			return err
		}

		url := provider.url.JoinPath(routesPath)

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

func (provider *provider) SetConfig(ctx context.Context, config *alertmanagertypes.Config) error {
	return provider.configStore.Set(ctx, config)
}

func (provider *provider) Stop(ctx context.Context) error {
	provider.batcher.Stop(ctx)
	return nil
}

func (provider *provider) GetConfig(ctx context.Context, orgID string) (*alertmanagertypes.Config, error) {
	return provider.configStore.Get(ctx, orgID)
}
