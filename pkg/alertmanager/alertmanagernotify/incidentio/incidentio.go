package incidentio

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"maps"
	"net/http"
	"strings"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "incidentio"

	// incident.io rejects payloads over 512 KB with a 413. Runes cap the
	// description at 4 bytes each worst case (~400 KB), leaving headroom for
	// the other fields.
	maxDescriptionLenRunes = 100000

	statusFiring   = "firing"
	statusResolved = "resolved"
)

// alertEvent is the body of incident.io's HTTP alert source endpoint
// (Alert Events V2 API). Title, status and deduplication_key are required;
// metadata values must be flat scalars. Repeat events for a firing key are
// dropped server-side and resolves for unknown keys are safe no-ops, so
// events are sent unconditionally.
type alertEvent struct {
	Title            string            `json:"title"`
	Description      string            `json:"description,omitempty"`
	Status           string            `json:"status"`
	DeduplicationKey string            `json:"deduplication_key"`
	SourceURL        string            `json:"source_url,omitempty"`
	Metadata         map[string]string `json:"metadata,omitempty"`
}

type Notifier struct {
	conf      *alertmanagertypes.IncidentIOReceiverConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

func New(conf *alertmanagertypes.IncidentIOReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater) (*Notifier, error) {
	if conf.HTTPConfig == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "incidentio http_config is nil")
	}
	client, err := notify.NewClientWithTracing(*conf.HTTPConfig, Integration)
	if err != nil {
		return nil, err
	}
	return &Notifier{
		conf:      conf,
		tmpl:      t,
		logger:    l,
		client:    client,
		retrier:   &notify.Retrier{RetryCodes: []int{http.StatusTooManyRequests}},
		templater: templater,
	}, nil
}

func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	firing := types.Alerts(as...).HasFiring()
	n.logger.DebugContext(ctx, "sending incidentio notification", slog.String("group_key", key.String()), slog.Bool("firing", firing))

	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(as)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Title,
		DefaultBodyTemplate:  n.conf.Description,
	}, as)
	if err != nil {
		return false, err
	}

	// title is required by the API; a channel title template can render empty,
	// so fall back to the rule name, then to a static last resort.
	title := result.Title
	if strings.TrimSpace(title) == "" && len(as) > 0 {
		title = string(as[0].Labels[ruletypes.LabelAlertName])
	}
	if strings.TrimSpace(title) == "" {
		title = "SigNoz alert"
	}

	var parts []string
	for _, body := range result.Body {
		if body != "" {
			parts = append(parts, body)
		}
	}
	description := truncateRunes(strings.Join(parts, "\n\n---\n\n"), maxDescriptionLenRunes)

	status := statusFiring
	if !firing {
		status = statusResolved
	}

	event := alertEvent{
		Title:            title,
		Description:      description,
		Status:           status,
		DeduplicationKey: key.Hash(),
		SourceURL:        sourceURL(as),
		Metadata:         n.metadata(ctx, as),
	}

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(event); err != nil {
		return false, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.conf.URL, &buf)
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+string(n.conf.Token))

	resp, err := n.client.Do(req) //nolint:bodyclose // notify.Drain closes the body
	if err != nil {
		return true, notify.RedactURL(err)
	}
	defer notify.Drain(resp)

	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return shouldRetry, nil
}

// metadata copies the group's common labels wholesale (the Opsgenie details
// precedent), so severity, ruleId and any user-defined rule labels arrive as
// flat strings ready for incident.io attribute mapping. Channel-configured
// pairs are template-expanded and laid on top (channel wins on key clash);
// a value that fails to expand is sent raw so delivery never breaks on it.
func (n *Notifier) metadata(ctx context.Context, as []*types.Alert) map[string]string {
	data := notify.GetTemplateData(ctx, n.tmpl, as, n.logger)
	out := make(map[string]string, len(data.CommonLabels)+len(n.conf.Metadata))
	maps.Copy(out, data.CommonLabels)
	for k, v := range n.conf.Metadata {
		expanded, err := n.tmpl.ExecuteTextString(v, data)
		if err != nil {
			n.logger.WarnContext(ctx, "failed to expand incidentio metadata value, sending it raw", slog.String("metadata_key", k))
			expanded = v
		}
		out[k] = expanded
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// sourceURL returns the per-rule SigNoz link from the ruleSource label, which
// is identical for every alert in the group.
func sourceURL(as []*types.Alert) string {
	if len(as) == 0 {
		return ""
	}
	return string(as[0].Labels[ruletypes.LabelRuleSource])
}

func truncateRunes(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max-1]) + "…"
}
