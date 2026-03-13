package alertmanagertemplate

import (
	"context"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// AlertTemplater expands alert notification templates.
type AlertTemplater interface {
	ExpandTemplates(ctx context.Context, input TemplateInput, alerts []*types.Alert) (*ExpandedTemplates, error)
}

// alertTemplater is the private implementation of AlertTemplater.
type alertTemplater struct {
	tmpl   *template.Template
	logger *slog.Logger
}

// New returns a new AlertTemplater with the given template and logger.
func New(tmpl *template.Template, logger *slog.Logger) AlertTemplater {
	return &alertTemplater{tmpl: tmpl, logger: logger}
}

// ExtractTemplatesFromAnnotations computes the common annotations across all alerts
// and returns the values for the title_template and body_template annotation keys.
func ExtractTemplatesFromAnnotations(alerts []*types.Alert) (titleTemplate, bodyTemplate string) {
	if len(alerts) == 0 {
		return "", ""
	}

	commonAnnotations := extractCommonKV(alerts, func(a *types.Alert) model.LabelSet { return a.Annotations })
	return commonAnnotations[ruletypes.AnnotationTitleTemplate], commonAnnotations[ruletypes.AnnotationBodyTemplate]
}

// ExpandTemplates expands the title and body templates from input
// against the provided alerts and returns the expanded templates.
func (at *alertTemplater) ExpandTemplates(
	ctx context.Context,
	input TemplateInput,
	alerts []*types.Alert,
) (*ExpandedTemplates, error) {
	ntd := at.buildNotificationTemplateData(ctx, alerts)

	title, titleMissingVars, err := at.expandTitle(ctx, input, alerts, ntd)
	if err != nil {
		return nil, err
	}

	body, bodyMissingVars, err := at.expandBody(ctx, input, alerts, ntd)
	if err != nil {
		return nil, err
	}

	missingVars := make(map[string]bool)
	for k := range titleMissingVars {
		missingVars[k] = true
	}
	for k := range bodyMissingVars {
		missingVars[k] = true
	}

	return &ExpandedTemplates{Title: title, Body: body, MissingVars: missingVars}, nil
}

// expandTitle expands the title template. Falls back to the default if the custom template
// result in empty string.
func (at *alertTemplater) expandTitle(
	ctx context.Context,
	input TemplateInput,
	alerts []*types.Alert,
	ntd *NotificationTemplateData,
) (string, map[string]bool, error) {
	if input.TitleTemplate != "" {
		processRes, err := PreProcessTemplateAndData(input.TitleTemplate, ntd)
		if err != nil {
			return "", nil, err
		}
		result, err := at.tmpl.ExecuteTextString(processRes.Template, processRes.Data)
		if err != nil {
			return "", nil, err
		}
		if strings.TrimSpace(result) != "" {
			return result, processRes.UnknownVars, nil
		}
	}

	// Fall back to the notifier's default title template using standard template.Data.
	if input.DefaultTitleTemplate == "" {
		return "", nil, nil
	}
	data := notify.GetTemplateData(ctx, at.tmpl, alerts, at.logger)
	result, err := at.tmpl.ExecuteTextString(input.DefaultTitleTemplate, data)
	return result, nil, err
}

// expandBody expands the body template once per alert, concatenates the results
// and falls back to the default if the custom template result in empty string.
func (at *alertTemplater) expandBody(
	ctx context.Context,
	input TemplateInput,
	alerts []*types.Alert,
	ntd *NotificationTemplateData,
) (string, map[string]bool, error) {
	if input.BodyTemplate != "" {
		var parts []string
		missingVars := make(map[string]bool)
		for i := range ntd.Alerts {
			processRes, err := PreProcessTemplateAndData(input.BodyTemplate, &ntd.Alerts[i])
			if err != nil {
				return "", nil, err
			}
			for k := range processRes.UnknownVars {
				missingVars[k] = true
			}
			part, err := at.tmpl.ExecuteTextString(processRes.Template, processRes.Data)
			if err != nil {
				return "", nil, err
			}
			parts = append(parts, part)
		}
		result := strings.Join(parts, "<br><br>") // markdown uses html for line breaks
		if strings.TrimSpace(result) != "" {
			return result, missingVars, nil
		}
	}

	// Fall back to the notifier's default body template using standard template.Data.
	if input.DefaultBodyTemplate == "" {
		return "", nil, nil
	}
	data := notify.GetTemplateData(ctx, at.tmpl, alerts, at.logger)
	result, err := at.tmpl.ExecuteTextString(input.DefaultBodyTemplate, data)
	return result, nil, err
}

// buildNotificationTemplateData derives a NotificationTemplateData from
// the context, template, and the raw alerts.
func (at *alertTemplater) buildNotificationTemplateData(
	ctx context.Context,
	alerts []*types.Alert,
) *NotificationTemplateData {
	// extract the required data from the context
	receiver, ok := notify.ReceiverName(ctx)
	if !ok {
		at.logger.WarnContext(ctx, "missing receiver name in context")
	}

	groupLabels, ok := notify.GroupLabels(ctx)
	if !ok {
		at.logger.WarnContext(ctx, "missing group labels in context")
	}

	// extract the external URL from the template
	externalURL := ""
	if at.tmpl.ExternalURL != nil {
		externalURL = at.tmpl.ExternalURL.String()
	}

	commonAnnotations := extractCommonKV(alerts, func(a *types.Alert) model.LabelSet { return a.Annotations })
	commonLabels := extractCommonKV(alerts, func(a *types.Alert) model.LabelSet { return a.Labels })

	// aggregate labels and annotations from all alerts
	labels := AggregateKV(alerts, func(a *types.Alert) model.LabelSet { return a.Labels })
	annotations := AggregateKV(alerts, func(a *types.Alert) model.LabelSet { return a.Annotations })

	// build the alert data slice
	alertDataSlice := make([]AlertData, 0, len(alerts))
	for _, a := range alerts {
		ad := buildAlertData(a, receiver)
		alertDataSlice = append(alertDataSlice, ad)
	}

	// count the number of firing and resolved alerts
	var firing, resolved int
	for _, ad := range alertDataSlice {
		if ad.IsFiring {
			firing++
		} else if ad.IsResolved {
			resolved++
		}
	}

	// extract the rule-level convenience fields from common labels
	alertName := commonLabels[ruletypes.LabelAlertName]
	ruleID := commonLabels[ruletypes.LabelRuleId]
	ruleLink := commonLabels[ruletypes.LabelRuleSource]

	// build the group labels
	gl := make(template.KV, len(groupLabels))
	for k, v := range groupLabels {
		gl[string(k)] = string(v)
	}

	// build the notification template data
	return &NotificationTemplateData{
		Receiver:          receiver,
		Status:            string(types.Alerts(alerts...).Status()),
		AlertName:         alertName,
		RuleID:            ruleID,
		RuleLink:          ruleLink,
		TotalFiring:       firing,
		TotalResolved:     resolved,
		Alerts:            alertDataSlice,
		GroupLabels:       gl,
		CommonLabels:      commonLabels,
		CommonAnnotations: commonAnnotations,
		ExternalURL:       externalURL,
		Labels:            labels,
		Annotations:       annotations,
	}
}

// buildAlertData converts a single *types.Alert into an AlertData.
func buildAlertData(a *types.Alert, receiver string) AlertData {
	labels := make(template.KV, len(a.Labels))
	for k, v := range a.Labels {
		labels[string(k)] = string(v)
	}

	annotations := make(template.KV, len(a.Annotations))
	for k, v := range a.Annotations {
		annotations[string(k)] = string(v)
	}

	status := string(a.Status())
	isFiring := a.Status() == model.AlertFiring
	isResolved := a.Status() == model.AlertResolved
	isMissingData := labels[ruletypes.LabelNoData] == "true"

	return AlertData{
		Receiver:      receiver,
		Status:        status,
		Labels:        labels,
		Annotations:   annotations,
		StartsAt:      a.StartsAt,
		EndsAt:        a.EndsAt,
		GeneratorURL:  a.GeneratorURL,
		Fingerprint:   a.Fingerprint().String(),
		AlertName:     labels[ruletypes.LabelAlertName],
		RuleID:        labels[ruletypes.LabelRuleId],
		RuleLink:      labels[ruletypes.LabelRuleSource],
		Severity:      labels[ruletypes.LabelSeverityName],
		LogLink:       annotations[ruletypes.AnnotationRelatedLogs],
		TraceLink:     annotations[ruletypes.AnnotationRelatedTraces],
		Value:         annotations[ruletypes.AnnotationValue],
		Threshold:     annotations[ruletypes.AnnotationThreshold],
		CompareOp:     annotations[ruletypes.AnnotationCompareOp],
		MatchType:     annotations[ruletypes.AnnotationMatchType],
		IsFiring:      isFiring,
		IsResolved:    isResolved,
		IsMissingData: isMissingData,
	}
}
