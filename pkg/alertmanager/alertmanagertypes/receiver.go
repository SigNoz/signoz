package alertmanagertypes

import (
	"log/slog"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/config/receiver"
)

type Receiver = config.Receiver

func NewReceiverIntegrations(nc config.Receiver, tmpl *template.Template, logger *slog.Logger) ([]notify.Integration, error) {
	return receiver.BuildReceiverIntegrations(nc, tmpl, logger)
}
