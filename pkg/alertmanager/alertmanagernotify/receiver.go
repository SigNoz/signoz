package alertmanagernotify

import (
	"log/slog"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/msteamsv2"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config/receiver"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

func NewReceiverIntegrations(nc alertmanagertypes.Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error) {
	upstreamIntegrations, err := receiver.BuildReceiverIntegrations(nc, tmpl, logger)
	if err != nil {
		return nil, err
	}

	var (
		errs         types.MultiError
		integrations []notify.Integration
		add          = func(name string, i int, rs notify.ResolvedSender, f func(l *slog.Logger) (notify.Notifier, error)) {
			n, err := f(logger.With("integration", name))
			if err != nil {
				errs.Add(err)
				return
			}
			integrations = append(integrations, notify.NewIntegration(n, rs, name, i, nc.Name))
		}
	)

	for _, integration := range upstreamIntegrations {
		// skip upstream msteamsv2 integration
		if integration.Name() != "msteamsv2" {
			integrations = append(integrations, integration)
		}
	}

	for i, c := range nc.MSTeamsV2Configs {
		add("msteamsv2", i, c, func(l *slog.Logger) (notify.Notifier, error) {
			return msteamsv2.New(c, tmpl, `{{ template "msteamsv2.default.titleLink" . }}`, l)
		})
	}

	if errs.Len() > 0 {
		return nil, &errs
	}

	return integrations, nil
}
