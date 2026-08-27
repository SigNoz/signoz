package gotify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

const (
	Integration = "gotify"
)

type Notifier struct {
	conf      *alertmanagertypes.GotifyReceiverConfig
	tmpl      *template.Template
	logger    *slog.Logger
	client    *http.Client
	retrier   *notify.Retrier
	templater alertmanagertypes.Templater
}

type Message struct {
	Title    string `json:"title,omitempty"`
	Message  string `json:"message"`
	Priority int    `json:"priority,omitempty"`
	Extras   Extras `json:"extras,omitempty"`
}

type Extras struct {
	ClientNotification *ClientNotification `json:"client::notification,omitempty"`
}

type ClientNotification struct {
	Click string `json:"click,omitempty"`
}

func New(conf *alertmanagertypes.GotifyReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater) (*Notifier, error) {
	if conf.HTTPConfig == nil {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "gotify http_config is nil")
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

func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	if n.conf.URL == nil {
		return false, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "gotify url is empty")
	}
	if n.conf.Token == "" {
		return false, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "gotify token is empty")
	}

	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	n.logger.DebugContext(ctx, "sending gotify notification", slog.Any("group_key", key))

	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Title,
		DefaultBodyTemplate:  n.conf.Message,
	}, alerts)
	if err != nil {
		return false, err
	}

	title := result.Title
	var messageBody string
	if len(result.Body) > 0 {
		messageBody = result.Body[0]
	}

	if title == "" && messageBody == "" {
		return false, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "gotify message rendered empty; check the channel title/message templates")
	}

	var clickURL string
	if len(alerts) > 0 && alerts[0] != nil {
		clickURL = string(alerts[0].Labels[ruletypes.LabelRuleSource])
	}

	msg := Message{
		Title:    title,
		Message:  messageBody,
		Priority: n.conf.Priority,
	}
	if clickURL != "" {
		msg.Extras = Extras{
			ClientNotification: &ClientNotification{
				Click: clickURL,
			},
		}
	}

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(msg); err != nil {
		return false, errors.WrapInternalf(err, errors.CodeInternal, "failed to encode gotify message")
	}

	postURL := fmt.Sprintf("%s/message?token=%s", n.conf.URL.String(), n.conf.Token)

	resp, err := notify.PostJSON(ctx, n.client, postURL, &buf) //nolint:bodyclose
	if err != nil {
		return true, notify.RedactURL(err)
	}
	defer notify.Drain(resp)

	shouldRetry, err := n.retrier.Check(resp.StatusCode, resp.Body)
	if err != nil {
		return shouldRetry, notify.NewErrorWithReason(notify.GetFailureReasonFromStatusCode(resp.StatusCode), err)
	}
	return shouldRetry, err
}
