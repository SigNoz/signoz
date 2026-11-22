package alertmanagertemplate

import (
	"context"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

// RenderFailureNotice returns the notice for the templates that failed, in the
// markup of one channel, and an empty string when none failed. A notice must
// never stop the notification, so one that does not render is logged and left
// out.
func RenderFailureNotice(ctx context.Context, logger *slog.Logger, failures alertmanagertypes.TemplateFailures, render func(markdown string) (string, error)) string {
	notice := failures.Notice()
	if notice == "" {
		return ""
	}

	rendered, err := render(notice)
	if err != nil {
		logger.WarnContext(ctx, "failed to render the template failure notice", errors.Attr(err))
		return ""
	}

	return strings.TrimSpace(rendered)
}
