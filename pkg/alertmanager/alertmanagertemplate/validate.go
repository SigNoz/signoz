package alertmanagertemplate

import (
	"context"
	"log/slog"
	tmpltext "text/template"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// ValidateRuleTemplates rejects a rule title or body template that fails for
// every alert: one that does not parse, or that calls a function that does not
// exist. A template that parses and then fails on the sample alert is accepted,
// because another alert can still execute it; Expand falls back to the default
// template for the alerts that cannot.
func ValidateRuleTemplates(ctx context.Context, titleTemplate, bodyTemplate string) error {
	tmpl, err := alertmanagertypes.FromGlobs(nil)
	if err != nil {
		return err
	}
	at := &templater{tmpl: tmpl, logger: slog.New(slog.DiscardHandler)}

	ctx = notify.WithReceiverName(ctx, "")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{})
	ntd := at.buildNotificationTemplateData(ctx, []*types.Alert{{}})

	var messages []string
	if err := at.parseError(titleTemplate, ntd); err != nil {
		messages = append(messages, "title template: "+err.Error())
	}
	if err := at.parseError(bodyTemplate, &ntd.Alerts[0]); err != nil {
		messages = append(messages, "body template: "+err.Error())
	}
	if len(messages) > 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "alert rule notification template is not valid").WithAdditional(messages...)
	}

	return nil
}

// parseError runs the template the way Expand does and returns only an error
// that comes before execution. The engine has no call that parses without
// executing.
func (at *templater) parseError(tmpl string, data any) error {
	if tmpl == "" {
		return nil
	}

	processRes, err := preProcessTemplateAndData(tmpl, data)
	if err != nil {
		return err
	}

	_, err = at.tmpl.ExecuteTextString(processRes.Template, processRes.Data)
	var execErr tmpltext.ExecError
	if errors.As(err, &execErr) {
		return nil
	}

	return err
}
