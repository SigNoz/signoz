package alertmanagertemplate

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// TemplateInput carries the title/body templates
// and their defaults to apply in case the custom templates
// are result in empty strings.
type TemplateInput struct {
	TitleTemplate        string
	BodyTemplate         string
	DefaultTitleTemplate string
	DefaultBodyTemplate  string
}

// ExpandedTemplates is the result of ExpandAlertTemplates.
type ExpandedTemplates struct {
	Title string
	Body  string
}

// AlertData holds per-alert data used when expanding body templates.
type AlertData struct {
	Status       string      `json:"status"`
	Labels       template.KV `json:"labels"`
	Annotations  template.KV `json:"annotations"`
	StartsAt     time.Time   `json:"starts_at"`
	EndsAt       time.Time   `json:"ends_at"`
	GeneratorURL string      `json:"generator_url"`
	Fingerprint  string      `json:"fingerprint"`

	// Convenience fields extracted from well-known labels/annotations.
	AlertName string `json:"rule_name"`
	RuleID    string `json:"rule_id"`
	RuleLink  string `json:"rule_link"`
	Severity  string `json:"severity"`

	// Link annotations added by the rule evaluator.
	LogLink   string `json:"log_link"`
	TraceLink string `json:"trace_link"`

	// Status booleans for easy conditional templating.
	IsFiring      bool `json:"is_firing"`
	IsResolved    bool `json:"is_resolved"`
	IsMissingData bool `json:"is_missing_data"`
	IsRecovering  bool `json:"is_recovering"`
}

// NotificationTemplateData is the top-level data struct provided to custom templates.
type NotificationTemplateData struct {
	Receiver string `json:"receiver"`
	Status   string `json:"status"`

	// Convenience fields for title templates.
	AlertName     string `json:"rule_name"`
	RuleID        string `json:"rule_id"`
	RuleLink      string `json:"rule_link"`
	TotalFiring   int    `json:"total_firing"`
	TotalResolved int    `json:"total_resolved"`

	// Per-alert data, also available as filtered sub-slices.
	Alerts []AlertData `json:"alerts"`

	// Cross-alert aggregates, computed as intersection across all alerts.
	GroupLabels       template.KV `json:"group_labels"`
	CommonLabels      template.KV `json:"common_labels"`
	CommonAnnotations template.KV `json:"common_annotations"`
	ExternalURL       string      `json:"external_url"`
}

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
		result, err := tmpl.ExecuteTextString(input.TitleTemplate, ntd)
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
	if input.BodyTemplate != "" && len(ntd.Alerts) > 0 {
		var parts []string
		for i := range ntd.Alerts {
			part, err := tmpl.ExecuteTextString(input.BodyTemplate, &ntd.Alerts[i])
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

	// build the alert data slice
	alertDataSlice := make([]AlertData, 0, len(alerts))
	for _, a := range alerts {
		ad := buildAlertData(a)
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
	}
}

// buildAlertData converts a single *types.Alert into an AlertData.
func buildAlertData(a *types.Alert) AlertData {
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
