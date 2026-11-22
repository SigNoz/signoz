package rules

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	cmock "github.com/SigNoz/clickhouse-go-mock"
	alertmanagernotifytest "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/slack"
	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertemplate"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrystore/telemetrystoretest"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/alertmanager/config"
	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/types"
	commoncfg "github.com/prometheus/common/config"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The ruler builds the alert and a notifier sends it. The title template of a
// rule is written for the notifier, so the ruler must hand it over as written,
// and a template the notifier cannot execute must not cost the notification.
func TestThresholdRuleTitleTemplateReachesTheNotifier(t *testing.T) {
	testCases := []struct {
		name          string
		titleTemplate string
		wantTitle     string
	}{
		{
			name:      "NoTitleTemplate_SendsTheChannelTitle",
			wantTitle: "[FIRING:1] Checkout latency",
		},
		{
			name:          "TitleTemplateInTheRuleDataModel_IsExpandedByTheNotifier",
			titleTemplate: "Fired: $rule.name",
			wantTitle:     "Fired: Checkout latency",
		},
		{
			// .CommonLabels is a field of the channel data model.
			name:          "TitleTemplateThatFails_SendsTheChannelTitle",
			titleTemplate: "Rule title: {{ .CommonLabels.alertname }}",
			wantTitle:     "[FIRING:1] Checkout latency",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			target := float64(200)
			postableRule := ruletypes.PostableRule{
				AlertName: valuer.NewDisplayName("Checkout latency"),
				AlertType: ruletypes.AlertTypeMetric,
				RuleType:  ruletypes.RuleTypeThreshold,
				Evaluation: &ruletypes.EvaluationEnvelope{Kind: ruletypes.RollingEvaluation, Spec: ruletypes.RollingWindow{
					EvalWindow: valuer.MustParseTextDuration("5m"),
					Frequency:  valuer.MustParseTextDuration("1m"),
				}},
				RuleCondition: &ruletypes.RuleCondition{
					CompositeQuery: &ruletypes.AlertCompositeQuery{
						QueryType: ruletypes.QueryTypeBuilder,
						Unit:      "ns",
						Queries: []qbtypes.QueryEnvelope{
							{
								Type: qbtypes.QueryTypeBuilder,
								Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
									Name:         "A",
									StepInterval: qbtypes.Step{Duration: time.Minute},
									Aggregations: []qbtypes.MetricAggregation{
										{
											MetricName:       "signoz_calls_total",
											Temporality:      metrictypes.Cumulative,
											TimeAggregation:  metrictypes.TimeAggregationRate,
											SpaceAggregation: metrictypes.SpaceAggregationSum,
										},
									},
									Signal: telemetrytypes.SignalMetrics,
								},
							},
						},
					},
					SelectedQuery: "A",
					Thresholds: &ruletypes.RuleThresholdData{
						Kind: ruletypes.BasicThresholdKind,
						Spec: ruletypes.BasicRuleThresholds{
							{
								Name:            "critical",
								TargetValue:     &target,
								TargetUnit:      "ms",
								MatchType:       ruletypes.AtleastOnce,
								CompareOperator: ruletypes.ValueIsAbove,
							},
						},
					},
				},
				Annotations: map[string]string{"summary": "observed {{$value}} against {{$threshold}}"},
			}
			if testCase.titleTemplate != "" {
				postableRule.Annotations[ruletypes.AnnotationTitleTemplate] = testCase.titleTemplate
			}

			telemetryStore := telemetrystoretest.New(telemetrystore.Config{}, &queryMatcherAny{})
			querier, mockMetadataStore := prepareQuerierForMetrics(t, telemetryStore)
			mockMetadataStore.TypeMap["signoz_calls_total"] = metrictypes.SumType
			telemetryStore.Mock().
				ExpectQuery("SELECT any").
				WithArgs(nil, nil, nil, nil, nil, nil, nil, nil).
				WillReturnRows(cmock.NewRows(
					[]cmock.ColumnType{{Name: "ts", Type: "DateTime"}, {Name: "value", Type: "Float64"}},
					[][]any{{time.Now(), float64(572588400)}, {time.Now().Add(time.Second), float64(572386400)}},
				))

			rule, err := NewThresholdRule("69", valuer.GenerateUUID(), &postableRule, querier, instrumentationtest.New().Logger(), mustParseURL(t, "http://localhost:8000"))
			require.NoError(t, err)
			alertsFound, err := rule.Eval(context.Background(), time.Now())
			require.NoError(t, err)
			require.Equal(t, 1, alertsFound)

			alerts := make([]*types.Alert, 0, len(rule.Active))
			for _, active := range rule.Active {
				labels := model.LabelSet{}
				for name, value := range active.Labels.Map() {
					labels[model.LabelName(name)] = model.LabelValue(value)
				}
				annotations := model.LabelSet{}
				for name, value := range active.Annotations.Map() {
					annotations[model.LabelName(name)] = model.LabelValue(value)
				}
				alerts = append(alerts, &types.Alert{Alert: model.Alert{Labels: labels, Annotations: annotations, StartsAt: time.Now(), EndsAt: time.Now().Add(time.Hour)}})
			}

			var posted struct {
				Attachments []struct {
					Title string `json:"title"`
				} `json:"attachments"`
			}
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				assert.NoError(t, json.NewDecoder(r.Body).Decode(&posted))
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"ok": true}`))
			}))
			defer srv.Close()
			webhookURL, err := url.Parse(srv.URL)
			require.NoError(t, err)

			tmpl := alertmanagernotifytest.CreateTmpl(t)
			logger := slog.New(slog.DiscardHandler)
			notifier, err := slack.New(&config.SlackConfig{
				APIURL:     &config.SecretURL{URL: webhookURL},
				Channel:    "#alerts",
				Title:      `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`,
				Text:       `{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}`,
				HTTPConfig: &commoncfg.HTTPClientConfig{},
			}, tmpl, logger, alertmanagertemplate.New(tmpl, logger))
			require.NoError(t, err)

			ctx := notify.WithGroupKey(context.Background(), "group")
			ctx = notify.WithReceiverName(ctx, "slack")
			ctx = notify.WithGroupLabels(ctx, model.LabelSet{"ruleId": "69"})
			_, err = notifier.Notify(ctx, alerts...)
			require.NoError(t, err)

			require.NotEmpty(t, posted.Attachments)
			assert.Equal(t, testCase.wantTitle, posted.Attachments[0].Title)
		})
	}
}
