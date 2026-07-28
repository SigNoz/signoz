package googlechat

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/template"
	"github.com/prometheus/alertmanager/types"
)

func New(conf *alertmanagertypes.GoogleChatReceiverConfig, t *template.Template, l *slog.Logger, templater alertmanagertypes.Templater) (*Notifier, error) {
	client, err := notify.NewClientWithTracing(*conf.HTTPConfig, Integration)
	if err != nil {
		return nil, err
	}
	return &Notifier{
		conf:      conf,
		tmpl:      t,
		logger:    l,
		client:    client,
		retrier:   &notify.Retrier{},
		templater: templater,
	}, nil
}

func (n *Notifier) Notify(ctx context.Context, alerts ...*types.Alert) (bool, error) {
	if n.conf.WebhookURL == nil {
		return false, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "google chat webhook_url is empty")
	}

	key, err := notify.ExtractGroupKey(ctx)
	if err != nil {
		return false, err
	}
	n.logger.DebugContext(ctx, "sending google chat notification", slog.Any("group_key", key))

	c, err := n.prepareContent(ctx, alerts)
	if err != nil {
		return false, err
	}
	text := c.title
	if c.body != "" {
		text = c.title + "\n" + c.body
	}

	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(Message{Text: text}); err != nil {
		return false, err
	}

	resp, err := notify.PostJSON(ctx, n.client, n.conf.WebhookURL.String(), &buf) //nolint:bodyclose
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

// prepareContent expands the title and body templates. Custom templates (from
// alert annotations) override the channel defaults; result.IsDefaultBody tells
// whether the body came from the default template.
func (n *Notifier) prepareContent(ctx context.Context, alerts []*types.Alert) (content, error) {
	customTitle, customBody := alertmanagertemplate.ExtractTemplatesFromAnnotations(alerts)
	result, err := n.templater.Expand(ctx, alertmanagertypes.ExpandRequest{
		TitleTemplate:        customTitle,
		BodyTemplate:         customBody,
		DefaultTitleTemplate: n.conf.Title,
		DefaultBodyTemplate:  n.conf.Text,
	}, alerts)
	if err != nil {
		return content{}, err
	}
	return content{
		title:         result.Title,
		body:          strings.Join(result.Body, "\n\n"),
		isDefaultBody: result.IsDefaultBody,
	}, nil
}
