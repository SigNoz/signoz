package alertmanagertypes

import (
	"context"
	"log/slog"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

// Templater expands user-authored title and body templates against a group
// of alerts. Implemented by pkg/alertmanager/alertmanagertemplate.
type Templater interface {
	Expand(ctx context.Context, req ExpandRequest, alerts []*types.Alert) (*ExpandResult, error)
}

type ReceiverIntegrationsFunc = func(
	nc *Receiver,
	tmpl *template.Template,
	logger *slog.Logger,
	templater Templater,
	orgID string,
	threadStore AlertThreadStore,
) ([]notify.Integration, error)
