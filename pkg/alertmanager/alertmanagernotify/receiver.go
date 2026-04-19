package alertmanagernotify

import (
	"log/slog"
	"slices"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/email"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/msteamsv2"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/opsgenie"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/pagerduty"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/slack"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/webhook"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/config/receiver"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

var customNotifierIntegrations = []string{
	webhook.Integration,
	email.Integration,
	pagerduty.Integration,
	opsgenie.Integration,
	slack.Integration,
	msteamsv2.Integration,
}

func NewReceiverIntegrations(nc alertmanagertypes.Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error) {
	upstreamIntegrations, err := receiver.BuildReceiverIntegrations(nc, tmpl, logger)
	if err != nil {
		return nil, err
	}

	var (
		errs         types.MultiError
		integrations []notify.Integration
		add          = func(name string, i int, rs notify.ResolvedSender, f func(l *slog.Logger) (notify.Notifier, error)) {
			n, err := f(logger.With(slog.String("integration", name)))
			if err != nil {
				errs.Add(err)
				return
			}
			integrations = append(integrations, notify.NewIntegration(n, rs, name, i, nc.Name))
		}
	)

	for _, integration := range upstreamIntegrations {
		// skip upstream integration if we support custom integration for it
		if !slices.Contains(customNotifierIntegrations, integration.Name()) {
			integrations = append(integrations, integration)
		}
	}

	for i, c := range nc.WebhookConfigs {
		add(webhook.Integration, i, c, func(l *slog.Logger) (notify.Notifier, error) { return webhook.New(c, tmpl, l) })
	}
	for i, c := range nc.EmailConfigs {
		add(email.Integration, i, c, func(l *slog.Logger) (notify.Notifier, error) { return email.New(c, tmpl, l), nil })
	}
	for i, c := range nc.PagerdutyConfigs {
		add(pagerduty.Integration, i, c, func(l *slog.Logger) (notify.Notifier, error) { return pagerduty.New(c, tmpl, l) })
	}
	for i, c := range nc.OpsGenieConfigs {
		add(opsgenie.Integration, i, c, func(l *slog.Logger) (notify.Notifier, error) { return opsgenie.New(c, tmpl, l) })
	}
	for i, c := range nc.SlackConfigs {
		add(slack.Integration, i, c, func(l *slog.Logger) (notify.Notifier, error) { return slack.New(c, tmpl, l) })
	}
	for i, c := range nc.MSTeamsV2Configs {
		add(msteamsv2.Integration, i, c, func(l *slog.Logger) (notify.Notifier, error) {
			return msteamsv2.New(c, tmpl, `{{ template "msteamsv2.default.titleLink" . }}`, l)
		})
	}

	if errs.Len() > 0 {
		return nil, &errs
	}

	return integrations, nil
}
