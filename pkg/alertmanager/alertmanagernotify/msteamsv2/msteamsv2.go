package msteamsv2

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"

	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	colorRed   = "Attention"
	colorGreen = "Good"
	colorGrey  = "Warning"
)

type Notifier struct {
	conf         *config.MSTeamsV2Config
	titleLink    string
	tmpl         *template.Template
	logger       *slog.Logger
	client       *http.Client
	retrier      *notify.Retrier
	webhookURL   *config.SecretURL
	postJSONFunc func(ctx context.Context, client *http.Client, url string, body io.Reader) (*http.Response, error)
}

// https://learn.microsoft.com/en-us/connectors/teams/?tabs=text1#adaptivecarditemschema
type Content struct {
	Schema  string   `json:"$schema"`
	Type    string   `json:"type"`
	Version string   `json:"version"`
	Body    []Body   `json:"body"`
	Msteams Msteams  `json:"msteams,omitempty"`
	Actions []Action `json:"actions"`
}

type Body struct {
	Type   string `json:"type"`
	Text   string `json:"text"`
	Weight string `json:"weight,omitempty"`
	Size   string `json:"size,omitempty"`
	Wrap   bool   `json:"wrap,omitempty"`
	Style  string `json:"style,omitempty"`
	Color  string `json:"color,omitempty"`
	Facts  []Fact `json:"facts,omitempty"`
}

type Action struct {
	Type  string `json:"type"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

type Fact struct {
	Title string `json:"title"`
	Value string `json:"value"`
}

type Msteams struct {
	Width string `json:"width"`
}

type Attachment struct {
	ContentType string  `json:"contentType"`
	ContentURL  *string `json:"contentUrl"` // Use a pointer to handle null values
	Content     Content `json:"content"`
}

type teamsMessage struct {
	Type        string       `json:"type"`
	Attachments []Attachment `json:"attachments"`
}

// New returns a new notifier that uses the Microsoft Teams Power Platform connector.
func New(c *config.MSTeamsV2Config, t *template.Template, titleLink string, l *slog.Logger, httpOpts ...commoncfg.HTTPClientOption) (*Notifier, error) {
	client, err := commoncfg.NewClientFromConfig(*c.HTTPConfig, "msteamsv2", httpOpts...)
	if err != nil {
		return nil, err
	}

	n := &Notifier{
		conf:         c,
		titleLink:    titleLink,
		tmpl:         t,
		logger:       l,
		client:       client,
		retrier:      &notify.Retrier{},
		webhookURL:   c.WebhookURL,
		postJSONFunc: notify.PostJSON,
	}

	return n, nil
}

func (n *Notifier) Notify(ctx context.Context, as ...*types.Alert) (bool, error) {
	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}

	n.logger.DebugContext(ctx, "extracted group key", "key", key)

	data := notify.GetTemplateData(ctx, n.tmpl, as, n.logger)
	tmpl := notify.TmplText(n.tmpl, data, &err)
	if err != nil {
		return false, err
	}

	title := tmpl(n.conf.Title)
	if err != nil {
		return false, err
	}

	titleLink := tmpl(n.titleLink)
	if err != nil {
		return false, err
	}

	alerts := types.Alerts(as...)
	color := colorGrey
	switch alerts.Status() {
	case model.AlertFiring:
		color = colorRed
	case model.AlertResolved:
		color = colorGreen
	}

	var url string
	if n.conf.WebhookURL != nil {
		url = n.conf.WebhookURL.String()
	} else {
		content, err := os.ReadFile(n.conf.WebhookURLFile)
		if err != nil {
			return false, errors.WrapInternalf(err, errors.CodeInternal, "read webhook_url_file")
		}
		url = strings.TrimSpace(string(content))
	}

	// A message as referenced in https://learn.microsoft.com/en-us/connectors/teams/?tabs=text1%2Cdotnet#request-body-schema
	t := teamsMessage{
		Type: "message",
		Attachments: []Attachment{
			{
				ContentType: "application/vnd.microsoft.card.adaptive",
				ContentURL:  nil,
				Content: Content{
					Schema:  "http://adaptivecards.io/schemas/adaptive-card.json",
					Type:    "AdaptiveCard",
					Version: "1.2",
					Body: []Body{
						{
							Type:   "TextBlock",
							Text:   title,
							Weight: "Bolder",
							Size:   "Medium",
							Wrap:   true,
							Style:  "heading",
							Color:  color,
						},
					},
					Actions: []Action{
						{
							Type:  "Action.OpenUrl",
							Title: "View Alert",
							URL:   titleLink,
						},
					},
					Msteams: Msteams{
						Width: "full",
					},
				},
			},
		},
	}

	// add labels and annotations to the body of all alerts
	for _, alert := range as {
		t.Attachments[0].Content.Body = append(t.Attachments[0].Content.Body, Body{
			Type:   "TextBlock",
			Text:   "Alerts",
			Weight: "Bolder",
			Size:   "Medium",
			Wrap:   true,
			Color:  color,
		})

		t.Attachments[0].Content.Body = append(t.Attachments[0].Content.Body, n.createLabelsAndAnnotationsBody(alert)...)
	}

	var payload bytes.Buffer
	if err = json.NewEncoder(&payload).Encode(t); err != nil {
		return false, err
	}

	resp, err := n.postJSONFunc(ctx, n.client, url, &payload) //nolint:bodyclose
	if err != nil {
		return true, notify.RedactURL(err)
	}
	defer notify.Drain(resp) //drain is used to close the body of the response hence the nolint directive

	// https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using?tabs=cURL#rate-limiting-for-connectors
	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return shouldRetry, err
}

func (*Notifier) createLabelsAndAnnotationsBody(alert *types.Alert) []Body {
	bodies := []Body{}
	bodies = append(bodies, Body{
		Type:   "TextBlock",
		Text:   "Labels",
		Weight: "Bolder",
		Size:   "Medium",
	})

	facts := []Fact{}
	for k, v := range alert.Labels {
		if slices.Contains([]string{"alertname", "severity", "ruleId", "ruleSource"}, string(k)) {
			continue
		}
		facts = append(facts, Fact{Title: string(k), Value: string(v)})
	}
	bodies = append(bodies, Body{
		Type:  "FactSet",
		Facts: facts,
	})

	bodies = append(bodies, Body{
		Type:   "TextBlock",
		Text:   "Annotations",
		Weight: "Bolder",
		Size:   "Medium",
	})

	annotationsFacts := []Fact{}
	for k, v := range alert.Annotations {
		if slices.Contains([]string{"summary", "related_logs", "related_traces"}, string(k)) {
			continue
		}
		annotationsFacts = append(annotationsFacts, Fact{Title: string(k), Value: string(v)})
	}

	bodies = append(bodies, Body{
		Type:  "FactSet",
		Facts: annotationsFacts,
	})

	return bodies
}
