package standardnotification

import (
	"context"
	"time"

	nfmanager "github.com/SigNoz/signoz/pkg/alertmanager/nfmanager"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

const (
	DefaultGroupBy = model.LabelName("alertname")
)

type provider struct {
	settings factory.ScopedProviderSettings
}

func NewFactory() factory.ProviderFactory[nfmanager.NotificationManager, nfmanager.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("standard"),
		func(ctx context.Context, settings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
			return New(ctx, settings, config)
		},
	)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config nfmanager.Config) (nfmanager.NotificationManager, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/nfmanager/standardnotification")

	return &provider{
		settings: settings,
	}, nil
}

func (p *provider) GetNotificationConfig(orgID string, alert *types.Alert) (*nfmanager.NotificationConfig, error) {
	defaultGroups := model.LabelSet{}
	defaultGroups[DefaultGroupBy] = alert.Labels[DefaultGroupBy]
	return &nfmanager.NotificationConfig{
		NotificationGroup: defaultGroups,
		RenotifyInterval:  4 * time.Hour,
	}, nil
}

func (p *provider) SetNotificationConfig(orgID string, alert *types.Alert, config *nfmanager.NotificationConfig) error {
	// Standard grouping doesn't support dynamic configuration setting
	// Configuration is determined by default settings
	return nil
}
