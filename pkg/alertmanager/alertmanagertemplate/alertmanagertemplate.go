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

// ExtractTemplatesFromAnnotations computes the common annotations across all alerts
// and returns the values for the title_template and body_template annotation keys.
func ExtractTemplatesFromAnnotations(alerts []*types.Alert) (titleTemplate, bodyTemplate string) {
	if len(alerts) == 0 {
		return "", ""
	}

	commonAnnotations := computeCommonAnnotations(alerts)
	return commonAnnotations[ruletypes.AnnotationTitleTemplate], commonAnnotations[ruletypes.AnnotationBodyTemplate]
}

// ExpandAlertTemplates expands the title and body templates from input
// against the provided alerts and returns the expanded templates.
func ExpandAlertTemplates(
	ctx context.Context,
	tmpl *template.Template,
	input TemplateInput,
	alerts []*types.Alert,
	logger *slog.Logger,
) (*ExpandedTemplates, error) {
	ntd := buildNotificationTemplateData(ctx, tmpl, alerts, logger)

	title, err := expandTitle(ctx, tmpl, input, alerts, ntd, logger)
	if err != nil {
		return nil, err
	}

	body, err := expandBody(ctx, tmpl, input, alerts, ntd, logger)
	if err != nil {
		return nil, err
	}

	return &ExpandedTemplates{Title: title, Body: body}, nil
}

// expandTitle expands the title template. Falls back to the default if the custom template
// result in empty string.
func expandTitle(
	ctx context.Context,
	tmpl *template.Template,
	input TemplateInput,
	alerts []*types.Alert,
	ntd *NotificationTemplateData,
	logger *slog.Logger,
) (string, error) {
	if input.TitleTemplate != "" {
		processRes, err := PreProcessTemplateAndData(input.TitleTemplate, ntd)
		if err != nil {
			return "", err
		}
		result, err := tmpl.ExecuteTextString(processRes.Template, processRes.Data)
		if err != nil {
			return "", err
		}
		if strings.TrimSpace(result) != "" {
			return result, nil
		}
	}

	// Fall back to the notifier's default title template using standard template.Data.
	if input.DefaultTitleTemplate == "" {
		return "", nil
	}
	data := notify.GetTemplateData(ctx, tmpl, alerts, logger)
	return tmpl.ExecuteTextString(input.DefaultTitleTemplate, data)
}

// expandBody expands the body template once per alert, concatenates the results
// and falls back to the default if the custom template result in empty string.
func expandBody(
	ctx context.Context,
	tmpl *template.Template,
	input TemplateInput,
	alerts []*types.Alert,
	ntd *NotificationTemplateData,
	logger *slog.Logger,
) (string, error) {
	if input.BodyTemplate != "" {
		var parts []string
		for i := range ntd.Alerts {
			processRes, err := PreProcessTemplateAndData(input.BodyTemplate, ntd.Alerts[i])
			if err != nil {
				return "", err
			}
			part, err := tmpl.ExecuteTextString(processRes.Template, processRes.Data)
			if err != nil {
				return "", err
			}
			parts = append(parts, part)
		}
		result := strings.Join(parts, "<br><br>") // markdown uses html for line breaks
		if strings.TrimSpace(result) != "" {
			return result, nil
		}
	}

	// Fall back to the notifier's default body template using standard template.Data.
	if input.DefaultBodyTemplate == "" {
		return "", nil
	}
	data := notify.GetTemplateData(ctx, tmpl, alerts, logger)
	return tmpl.ExecuteTextString(input.DefaultBodyTemplate, data)
}

// buildNotificationTemplateData derives a NotificationTemplateData from
// the context, template, and the raw alerts.
func buildNotificationTemplateData(
	ctx context.Context,
	tmpl *template.Template,
	alerts []*types.Alert,
	logger *slog.Logger,
) *NotificationTemplateData {
	// extract the required data from the context
	receiver, ok := notify.ReceiverName(ctx)
	if !ok {
		logger.WarnContext(ctx, "missing receiver name in context")
	}

	groupLabels, ok := notify.GroupLabels(ctx)
	if !ok {
		logger.WarnContext(ctx, "missing group labels in context")
	}

	// extract the external URL from the template
	externalURL := ""
	if tmpl.ExternalURL != nil {
		externalURL = tmpl.ExternalURL.String()
	}

	commonAnnotations := computeCommonAnnotations(alerts)
	commonLabels := computeCommonLabels(alerts)

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

// computeCommonAnnotations returns the intersection of annotations across all alerts as a template.KV.
// An annotation key/value pair is included only if it appears identically on every alert.
func computeCommonAnnotations(alerts []*types.Alert) template.KV {
	if len(alerts) == 0 {
		return template.KV{}
	}

	common := make(template.KV, len(alerts[0].Annotations))
	for k, v := range alerts[0].Annotations {
		common[string(k)] = string(v)
	}

	for _, a := range alerts[1:] {
		for k := range common {
			if string(a.Annotations[model.LabelName(k)]) != common[k] {
				delete(common, k)
			}
		}
		if len(common) == 0 {
			break
		}
	}

	return common
}

// computeCommonLabels returns the intersection of labels across all alerts as a template.KV.
func computeCommonLabels(alerts []*types.Alert) template.KV {
	if len(alerts) == 0 {
		return template.KV{}
	}

	common := make(template.KV, len(alerts[0].Labels))
	for k, v := range alerts[0].Labels {
		common[string(k)] = string(v)
	}

	for _, a := range alerts[1:] {
		for k := range common {
			if string(a.Labels[model.LabelName(k)]) != common[k] {
				delete(common, k)
			}
		}
		if len(common) == 0 {
			break
		}
	}

	return common
}
