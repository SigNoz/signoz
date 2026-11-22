package alertmanagernotify

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/googlechat"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/incidentio"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/msteamsv2"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/opsgenie"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/pagerduty"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/slack"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/telegram"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Jira, JSM Ops and email are not covered here: they need several endpoints,
// a fixed vendor URL and an SMTP server.
func TestReceiverIntegrationsNotifyWhenATemplateFails(t *testing.T) {
	testCases := []struct {
		name         string
		channelTitle string
		channelBody  string
		annotations  model.LabelSet
		wantTitle    string
	}{
		{
			// A title copied from a channel template reads fields that the
			// rule data model does not have.
			name:         "RuleTitleFails_SendsTheChannelTitle",
			channelTitle: "slow: {{ .CommonLabels.alertname }}",
			channelBody:  "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}",
			annotations:  model.LabelSet{ruletypes.AnnotationTitleTemplate: "Rule title: {{ .CommonLabels.alertname }}"},
			wantTitle:    "slow: PodMemoryHigh",
		},
		{
			// slice fails on a pod name shorter than 40 characters.
			name:         "RuleBodyFails_SendsTheChannelBody",
			channelTitle: "high: {{ .CommonLabels.alertname }}",
			channelBody:  "{{ range .Alerts }}{{ .Labels.pod }}{{ end }}",
			annotations:  model.LabelSet{ruletypes.AnnotationBodyTemplate: "{{ slice .labels.pod 0 40 }} is high"},
			wantTitle:    "high: PodMemoryHigh",
		},
		{
			name:         "ChannelTitleFails_SendsTheBuiltinTitle",
			channelTitle: "{{ .Alerts.Firing | len",
			channelBody:  "{{ range .Alerts }}{{ .Labels.severity }}{{ end }}",
			wantTitle:    "[FIRING:1]",
		},
		{
			// .Value is not a field of an alert in the channel data model.
			name:         "ChannelBodyFails_SendsTheBuiltinBody",
			channelTitle: "hot: {{ .CommonLabels.alertname }}",
			channelBody:  "{{ range .Alerts }}{{ .Value }}{{ end }}",
			wantTitle:    "hot: PodMemoryHigh",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var mu sync.Mutex
			posted := map[string]string{}
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				body, _ := io.ReadAll(r.Body)
				mu.Lock()
				posted[strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")[0]] = string(body)
				mu.Unlock()
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"ok": true}`))
			}))
			defer srv.Close()

			endpoint := func(path string) *url.URL {
				parsed, err := url.Parse(srv.URL + "/" + path)
				require.NoError(t, err)
				return parsed
			}
			httpConfig := &commoncfg.HTTPClientConfig{}
			title, body := testCase.channelTitle, testCase.channelBody

			tmpl := test.CreateTmpl(t)
			logger := slog.New(slog.DiscardHandler)
			integrations, err := NewReceiverIntegrations(&alertmanagertypes.Receiver{
				Receiver: &config.Receiver{
					Name:             "all-kinds",
					SlackConfigs:     []*config.SlackConfig{{HTTPConfig: httpConfig, APIURL: &config.SecretURL{URL: endpoint(slack.Integration)}, Channel: "#alerts", Title: title, Text: body}},
					MSTeamsV2Configs: []*config.MSTeamsV2Config{{HTTPConfig: httpConfig, WebhookURL: &config.SecretURL{URL: endpoint(msteamsv2.Integration)}, Title: title, Text: body}},
					OpsGenieConfigs:  []*config.OpsGenieConfig{{HTTPConfig: httpConfig, APIKey: "key", APIURL: &config.URL{URL: endpoint(opsgenie.Integration + "/")}, Message: title, Description: body}},
					PagerdutyConfigs: []*config.PagerdutyConfig{{HTTPConfig: httpConfig, RoutingKey: "key", URL: &config.URL{URL: endpoint(pagerduty.Integration)}, Description: title}},
				},
				GoogleChatConfigs: []*alertmanagertypes.GoogleChatReceiverConfig{{HTTPConfig: httpConfig, WebhookURL: &config.SecretURL{URL: endpoint(googlechat.Integration)}, Title: title, Text: body}},
				IncidentIOConfigs: []*alertmanagertypes.IncidentIOReceiverConfig{{HTTPConfig: httpConfig, URL: endpoint(incidentio.Integration).String(), Token: "token", Title: title, Description: body}},
				TelegramConfigs:   []*alertmanagertypes.TelegramReceiverConfig{{HTTPConfig: httpConfig, APIUrl: &config.URL{URL: endpoint(telegram.Integration)}, BotToken: "123456:tok", ChatID: 42, ParseMode: "HTML", Title: title, Message: body}},
			}, tmpl, logger, alertmanagertemplate.New(tmpl, logger))
			require.NoError(t, err)
			require.Len(t, integrations, 7)

			annotations := model.LabelSet{"summary": "memory is above the limit"}
			for name, value := range testCase.annotations {
				annotations[name] = value
			}
			alert := &types.Alert{Alert: model.Alert{
				Labels:      model.LabelSet{"alertname": "PodMemoryHigh", "severity": "critical", "pod": "cart-5f6d7c8b9-q8w2z"},
				Annotations: annotations,
				StartsAt:    time.Now(),
				EndsAt:      time.Now().Add(time.Hour),
			}}

			ctx := notify.WithGroupKey(context.Background(), "group")
			ctx = notify.WithReceiverName(ctx, "all-kinds")
			ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "PodMemoryHigh"})

			for _, integration := range integrations {
				_, err := integration.Notify(ctx, alert)
				assert.NoError(t, err, integration.Name())
			}

			mu.Lock()
			defer mu.Unlock()
			for _, integration := range integrations {
				assert.Contains(t, posted[integration.Name()], testCase.wantTitle, integration.Name())
			}
		})
	}
}
