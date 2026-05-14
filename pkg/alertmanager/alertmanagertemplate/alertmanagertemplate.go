package alertmanagertemplate

import (
	"context"
	"log/slog"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
)

// Templater expands user-authored title and body templates against a group
// of alerts and returns channel-ready strings along with the aggregate data
// a caller might reuse (e.g. to render an email layout around the body).
type Templater interface {
	Expand(ctx context.Context, req alertmanagertypes.ExpandRequest, alerts []*types.Alert) (*alertmanagertypes.ExpandResult, error)
}

type templater struct {
	tmpl   *template.Template
	logger *slog.Logger
}

// New returns a Templater bound to the given Prometheus alertmanager
// template and logger.
func New(tmpl *template.Template, logger *slog.Logger) Templater {
	return &templater{tmpl: tmpl, logger: logger}
}

func (at *templater) Expand(
	ctx context.Context,
	req alertmanagertypes.ExpandRequest,
	alerts []*types.Alert,
) (*alertmanagertypes.ExpandResult, error) {
	ntd := at.buildNotificationTemplateData(ctx, alerts)
	missingVars := make(map[string]bool)

	title, titleMissingVars, err := at.expandTitle(req.TitleTemplate, ntd)
	if err != nil {
		return nil, err
	}
	// if title template results in empty string, use default template
	// this happens for rules where custom title annotation was not set
	if title == "" && req.DefaultTitleTemplate != "" {
		title, err = at.expandDefaultTemplate(ctx, req.DefaultTitleTemplate, alerts)
		if err != nil {
			return nil, err
		}
	} else {
		mergeMissingVars(missingVars, titleMissingVars)
	}

	isDefaultBody := false
	body, bodyMissingVars, err := at.expandBody(req.BodyTemplate, ntd)
	if err != nil {
		return nil, err
	}
	// if body template results in nil, use default template
	// this happens for rules where custom body annotation was not set
	if body == nil {
		isDefaultBody = true
		defaultBody, err := at.expandDefaultTemplate(ctx, req.DefaultBodyTemplate, alerts)
		if err != nil {
			return nil, err
		}
		body = []string{defaultBody} // default template combines all alerts message into a single body
	} else {
		mergeMissingVars(missingVars, bodyMissingVars)
	}

	// convert the internal map to a sorted slice for returning missing variables
	missingVarsList := make([]string, 0, len(missingVars))
	for k := range missingVars {
		missingVarsList = append(missingVarsList, k)
	}
	sort.Strings(missingVarsList)

	return &alertmanagertypes.ExpandResult{
		Title:            title,
		Body:             body,
		MissingVars:      missingVarsList,
		IsDefaultBody:    isDefaultBody,
		NotificationData: ntd,
	}, nil
}

// expandDefaultTemplate uses go-template to expand the default template.
func (at *templater) expandDefaultTemplate(
	ctx context.Context,
	tmplStr string,
	alerts []*types.Alert,
) (string, error) {
	// if even the default template is empty, return empty string
	// this is possible if user added channel with blank template
	if tmplStr == "" {
		at.logger.WarnContext(ctx, "default template is empty")
		return "", nil
	}
	data := notify.GetTemplateData(ctx, at.tmpl, alerts, at.logger)
	result, err := at.tmpl.ExecuteTextString(tmplStr, data)
	if err != nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to execute default template: %s", err.Error())
	}
	return result, nil
}

// mergeMissingVars adds all keys from src into dst.
func mergeMissingVars(dst, src map[string]bool) {
	for k := range src {
		dst[k] = true
	}
}

// expandTitle expands the title template. Returns empty string if the template is empty.
func (at *templater) expandTitle(
	titleTemplate string,
	ntd *alertmanagertypes.NotificationTemplateData,
) (string, map[string]bool, error) {
	if titleTemplate == "" {
		return "", nil, nil
	}
	processRes, err := preProcessTemplateAndData(titleTemplate, ntd)
	if err != nil {
		return "", nil, err
	}
	result, err := at.tmpl.ExecuteTextString(processRes.Template, processRes.Data)
	if err != nil {
		return "", nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to execute custom title template: %s", err.Error())
	}
	return strings.TrimSpace(result), processRes.UnknownVars, nil
}

// expandBody expands the body template for each individual alert. Returns nil if the template is empty.
func (at *templater) expandBody(
	bodyTemplate string,
	ntd *alertmanagertypes.NotificationTemplateData,
) ([]string, map[string]bool, error) {
	if bodyTemplate == "" {
		return nil, nil, nil
	}
	var sb []string
	missingVars := make(map[string]bool)
	for i := range ntd.Alerts {
		processRes, err := preProcessTemplateAndData(bodyTemplate, &ntd.Alerts[i])
		if err != nil {
			return nil, nil, err
		}
		part, err := at.tmpl.ExecuteTextString(processRes.Template, processRes.Data)
		if err != nil {
			return nil, nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to execute custom body template: %s", err.Error())
		}
		// add unknown variables and templated text to the result
		for k := range processRes.UnknownVars {
			missingVars[k] = true
		}
		if strings.TrimSpace(part) != "" {
			sb = append(sb, strings.TrimSpace(part))
		}
	}
	return sb, missingVars, nil
}

// buildNotificationTemplateData creates the NotificationTemplateData using
// info from context and the raw alerts.
func (at *templater) buildNotificationTemplateData(
	ctx context.Context,
	alerts []*types.Alert,
) *alertmanagertypes.NotificationTemplateData {
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
	labels := aggregateKV(alerts, func(a *types.Alert) model.LabelSet { return a.Labels })
	annotations := aggregateKV(alerts, func(a *types.Alert) model.LabelSet { return a.Annotations })

	// Strip private annotations from surfaces visible to templates or
	// notifications; the structured fields on AlertInfo/RuleInfo already hold
	// anything a template needs from them.
	commonAnnotations = alertmanagertypes.FilterPublicAnnotations(commonAnnotations)
	annotations = alertmanagertypes.FilterPublicAnnotations(annotations)

	// build the alert data slice
	alertDataSlice := make([]alertmanagertypes.AlertData, 0, len(alerts))
	for _, a := range alerts {
		ad := buildAlertData(a, receiver)
		alertDataSlice = append(alertDataSlice, ad)
	}

	// count the number of firing and resolved alerts
	var firing, resolved int
	for _, ad := range alertDataSlice {
		if ad.Alert.IsFiring {
			firing++
		} else if ad.Alert.IsResolved {
			resolved++
		}
	}

	// build the group labels
	gl := make(template.KV, len(groupLabels))
	for k, v := range groupLabels {
		gl[string(k)] = string(v)
	}

	// build the notification template data
	return &alertmanagertypes.NotificationTemplateData{
		Alert: alertmanagertypes.NotificationAlert{
			Receiver:      receiver,
			Status:        string(types.Alerts(alerts...).Status()),
			TotalFiring:   firing,
			TotalResolved: resolved,
		},
		Rule:              buildRuleInfo(commonLabels, commonAnnotations),
		GroupLabels:       gl,
		CommonLabels:      commonLabels,
		CommonAnnotations: commonAnnotations,
		ExternalURL:       externalURL,
		Labels:            labels,
		Annotations:       annotations,
		Alerts:            alertDataSlice,
	}
}

// buildAlertData converts a single *types.Alert into an AlertData.
func buildAlertData(a *types.Alert, receiver string) alertmanagertypes.AlertData {
	labels := make(template.KV, len(a.Labels))
	for k, v := range a.Labels {
		labels[string(k)] = string(v)
	}

	annotations := make(template.KV, len(a.Annotations))
	for k, v := range a.Annotations {
		annotations[string(k)] = string(v)
	}

	return alertmanagertypes.AlertData{
		Alert: alertmanagertypes.AlertInfo{
			Status:        string(a.Status()),
			Receiver:      receiver,
			Value:         annotations[ruletypes.AnnotationValue],
			StartsAt:      a.StartsAt,
			EndsAt:        a.EndsAt,
			GeneratorURL:  a.GeneratorURL,
			Fingerprint:   a.Fingerprint().String(),
			IsFiring:      a.Status() == model.AlertFiring,
			IsResolved:    a.Status() == model.AlertResolved,
			IsMissingData: labels[ruletypes.LabelNoData] == "true",
			IsRecovering:  labels[ruletypes.LabelIsRecovering] == "true",
		},
		Rule:   buildRuleInfo(labels, annotations),
		Log:    alertmanagertypes.LinkInfo{URL: annotations[ruletypes.AnnotationRelatedLogs]},
		Trace:  alertmanagertypes.LinkInfo{URL: annotations[ruletypes.AnnotationRelatedTraces]},
		Labels: labels,
		// Strip private annotations once the structured fields above have
		// been populated from the raw map.
		Annotations: alertmanagertypes.FilterPublicAnnotations(annotations),
	}
}

// buildRuleInfo extracts the rule metadata from the well-known labels and
// annotations that the rule manager attaches to every emitted alert.
func buildRuleInfo(labels, annotations template.KV) alertmanagertypes.RuleInfo {
	return alertmanagertypes.RuleInfo{
		Name:      labels[ruletypes.LabelAlertName],
		ID:        labels[ruletypes.LabelRuleID],
		URL:       labels[ruletypes.LabelRuleSource],
		Severity:  labels[ruletypes.LabelSeverityName],
		MatchType: annotations[ruletypes.AnnotationMatchType],
		Threshold: alertmanagertypes.Threshold{
			Value: annotations[ruletypes.AnnotationThresholdValue],
			Op:    annotations[ruletypes.AnnotationCompareOp],
		},
	}
}

// maxAggregatedValues caps the number of distinct label/annotation values
// joined together when summarising across alerts. Beyond this, extras are
// dropped rather than concatenated.
const maxAggregatedValues = 5

// aggregateKV merges label or annotation sets from a group of alerts into a
// single KV. Per key, up to maxAggregatedValues distinct values are kept (in
// order of first appearance) and joined with ", ". A lossy summary used for
// grouped-notification display, not a true union.
func aggregateKV(alerts []*types.Alert, extractFn func(*types.Alert) model.LabelSet) template.KV {
	valuesPerKey := make(map[string][]string)
	seenValues := make(map[string]map[string]bool)

	for _, alert := range alerts {
		for k, v := range extractFn(alert) {
			key := string(k)
			value := string(v)

			if seenValues[key] == nil {
				seenValues[key] = make(map[string]bool)
			}
			if !seenValues[key][value] && len(valuesPerKey[key]) < maxAggregatedValues {
				seenValues[key][value] = true
				valuesPerKey[key] = append(valuesPerKey[key], value)
			}
		}
	}

	result := make(template.KV, len(valuesPerKey))
	for key, values := range valuesPerKey {
		result[key] = strings.Join(values, ", ")
	}
	return result
}

// extractCommonKV returns the intersection of label or annotation pairs
// across all alerts. A pair is included only if every alert carries the same
// key with the same value.
func extractCommonKV(alerts []*types.Alert, extractFn func(*types.Alert) model.LabelSet) template.KV {
	if len(alerts) == 0 {
		return template.KV{}
	}

	common := make(template.KV, len(extractFn(alerts[0])))
	for k, v := range extractFn(alerts[0]) {
		common[string(k)] = string(v)
	}

	for _, a := range alerts[1:] {
		kv := extractFn(a)
		for k := range common {
			if string(kv[model.LabelName(k)]) != common[k] {
				delete(common, k)
			}
		}
		if len(common) == 0 {
			break
		}
	}

	return common
}
