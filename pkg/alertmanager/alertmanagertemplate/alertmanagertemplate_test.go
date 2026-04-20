package alertmanagertemplate

import (
	"context"
	"log/slog"
	"sort"
	"testing"
	"time"

	test "github.com/SigNoz/signoz/pkg/alertmanager/alertmanagernotify/alertmanagernotifytest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/require"

	"github.com/prometheus/alertmanager/notify"
	"github.com/prometheus/alertmanager/types"
)

// testSetup returns an AlertTemplater and a context pre-populated with group key,
// receiver name, and group labels for use in tests.
func testSetup(t *testing.T) (Templater, context.Context) {
	t.Helper()
	tmpl := test.CreateTmpl(t)
	ctx := context.Background()
	ctx = notify.WithGroupKey(ctx, "test-group")
	ctx = notify.WithReceiverName(ctx, "slack")
	ctx = notify.WithGroupLabels(ctx, model.LabelSet{"alertname": "TestAlert", "severity": "critical"})
	logger := slog.New(slog.DiscardHandler)
	return New(tmpl, logger), ctx
}

func createAlert(labels, annotations map[string]string, isFiring bool) *types.Alert {
	ls := model.LabelSet{}
	for k, v := range labels {
		ls[model.LabelName(k)] = model.LabelValue(v)
	}
	ann := model.LabelSet{}
	for k, v := range annotations {
		ann[model.LabelName(k)] = model.LabelValue(v)
	}
	startsAt := time.Now()
	var endsAt time.Time
	if isFiring {
		endsAt = startsAt.Add(time.Hour)
	} else {
		startsAt = startsAt.Add(-2 * time.Hour)
		endsAt = startsAt.Add(-time.Hour)
	}
	return &types.Alert{Alert: model.Alert{Labels: ls, Annotations: ann, StartsAt: startsAt, EndsAt: endsAt}}
}

func TestExpandTemplates(t *testing.T) {
	at, ctx := testSetup(t)

	tests := []struct {
		name              string
		alerts            []*types.Alert
		input             alertmanagertypes.ExpandRequest
		wantTitle         string
		wantBody          []string
		wantMissingVars   []string
		errorContains     string
		wantIsDefaultBody bool
	}{
		{
			// High request throughput on a service — service is a custom label.
			// $labels.service extracts the label value; $annotations.description pulls the annotation.
			name: "new template: high request throughput for a service",
			alerts: []*types.Alert{
				createAlert(
					map[string]string{
						ruletypes.LabelAlertName:    "HighRequestThroughput",
						ruletypes.LabelSeverityName: "warning",
						"service.name":              "payment-service",
					},
					map[string]string{"description": "Request rate exceeded 10k/s"},
					true,
				),
			},
			input: alertmanagertypes.ExpandRequest{
				TitleTemplate: "High request throughput for $service.name",
				BodyTemplate: `The service $service.name is getting high request. Please investigate.
Severity: $rule.severity
Status: $alert.status
Service: $service.name
Description: $description`,
			},
			wantTitle: "High request throughput for payment-service",
			wantBody: []string{`The service payment-service is getting high request. Please investigate.
Severity: warning
Status: firing
Service: payment-service
Description: Request rate exceeded 10k/s`},
			wantIsDefaultBody: false,
		},
		{
			// Disk usage alert using old Go template syntax throughout.
			// No custom templates — both title and body use the default fallback path.
			name: "old template: disk usage high on database host",
			alerts: []*types.Alert{
				createAlert(
					map[string]string{ruletypes.LabelAlertName: "DiskUsageHigh",
						ruletypes.LabelSeverityName: "critical",
						"instance":                  "db-primary-01",
					},
					map[string]string{
						"summary":        "Disk usage high on database host",
						"description":    "Disk usage is high on the database host",
						"related_logs":   "https://logs.example.com/search?q=DiskUsageHigh",
						"related_traces": "https://traces.example.com/search?q=DiskUsageHigh",
					},
					true,
				),
			},
			input: alertmanagertypes.ExpandRequest{
				DefaultTitleTemplate: `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}
     {{- if gt (len .CommonLabels) (len .GroupLabels) -}}
       {{" "}}(
       {{- with .CommonLabels.Remove .GroupLabels.Names }}
         {{- range $index, $label := .SortedPairs -}}
           {{ if $index }}, {{ end }}
           {{- $label.Name }}="{{ $label.Value -}}"
         {{- end }}
       {{- end -}}
       )
     {{- end }}`,
				DefaultBodyTemplate: `{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
     *Description:* {{ .Annotations.description }}
     *RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}}
     *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`,
			},
			wantTitle: "[FIRING:1] DiskUsageHigh for  (instance=\"db-primary-01\")",
			// Written with explicit \n so trailing whitespace inside the body
			// (emitted by the un-trimmed "{{ end }}" in the default template)
			// survives format-on-save.
			wantBody: []string{"*Alert:* DiskUsageHigh - critical\n" +
				"\n" +
				"     *Summary:* Disk usage high on database host\n" +
				"     *Description:* Disk usage is high on the database host\n" +
				"     *RelatedLogs:* View in <https://logs.example.com/search?q=DiskUsageHigh|logs explorer>\n" +
				"     *RelatedTraces:* View in <https://traces.example.com/search?q=DiskUsageHigh|traces explorer>\n" +
				"\n" +
				"     *Details:*\n" +
				"        • *alertname:* DiskUsageHigh\n" +
				"        • *instance:* db-primary-01\n" +
				"        • *severity:* critical\n" +
				"       \n" +
				"     "},
			wantIsDefaultBody: true,
		},
		{
			// Pod crash loop on multiple pods — body is expanded once per alert
			// and joined with "\n\n", with the pod name pulled from labels.
			name: "new template: pod crash loop on multiple pods, body per-alert",
			alerts: []*types.Alert{
				createAlert(map[string]string{ruletypes.LabelAlertName: "PodCrashLoop", "pod": "api-worker-1"}, nil, true),
				createAlert(map[string]string{ruletypes.LabelAlertName: "PodCrashLoop", "pod": "api-worker-2"}, nil, true),
				createAlert(map[string]string{ruletypes.LabelAlertName: "PodCrashLoop", "pod": "api-worker-3"}, nil, true),
			},
			input: alertmanagertypes.ExpandRequest{
				TitleTemplate: "$rule.name: $alert.total_firing pods affected",
				BodyTemplate:  "$labels.pod is crash looping",
			},
			wantTitle:         "PodCrashLoop: 3 pods affected",
			wantBody:          []string{"api-worker-1 is crash looping", "api-worker-2 is crash looping", "api-worker-3 is crash looping"},
			wantIsDefaultBody: false,
		},
		{
			// Incident partially resolved — one service still down, one recovered.
			// Title shows the aggregate counts; body shows per-service status.
			name: "new template: service degradation with mixed firing and resolved alerts",
			alerts: []*types.Alert{
				createAlert(map[string]string{ruletypes.LabelAlertName: "ServiceDown", "service": "auth-service"}, nil, true),
				createAlert(map[string]string{ruletypes.LabelAlertName: "ServiceDown", "service": "payment-service"}, nil, false),
			},
			input: alertmanagertypes.ExpandRequest{
				TitleTemplate: "$alert.total_firing firing, $alert.total_resolved resolved",
				BodyTemplate:  "$labels.service ($alert.status)",
			},
			wantTitle:         "1 firing, 1 resolved",
			wantBody:          []string{"auth-service (firing)", "payment-service (resolved)"},
			wantIsDefaultBody: false,
		},
		{
			// $environment is not a known AlertData or NotificationTemplateData field,
			// so it lands in MissingVars and renders as "<no value>" in the output.
			name: "missing vars: unknown $environment variable in title",
			alerts: []*types.Alert{
				createAlert(map[string]string{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelSeverityName: "critical"}, nil, true),
			},
			input: alertmanagertypes.ExpandRequest{
				TitleTemplate: "[$environment] $rule.name",
			},
			wantTitle:         "[<no value>] HighCPU",
			wantMissingVars:   []string{"environment"},
			wantIsDefaultBody: true,
		},
		{
			// $runbook_url is not a known field — someone tried to embed a runbook link
			// directly as a variable instead of via annotations.
			name: "missing vars: unknown $runbook_url variable in body",
			alerts: []*types.Alert{
				createAlert(map[string]string{ruletypes.LabelAlertName: "PodOOMKilled", ruletypes.LabelSeverityName: "warning"}, nil, true),
			},
			input: alertmanagertypes.ExpandRequest{
				BodyTemplate: "$rule.name: see runbook at $runbook_url",
			},
			wantBody:        []string{"PodOOMKilled: see runbook at <no value>"},
			wantMissingVars: []string{"runbook_url"},
		},
		{
			// Both title and body use unknown variables; MissingVars is the union of both.
			name: "missing vars: unknown variables in both title and body",
			alerts: []*types.Alert{
				createAlert(map[string]string{ruletypes.LabelAlertName: "HighMemory", ruletypes.LabelSeverityName: "critical"}, nil, true),
			},
			input: alertmanagertypes.ExpandRequest{
				TitleTemplate: "[$environment] $rule.name and [{{ $service }}]",
				BodyTemplate:  "$rule.name: see runbook at $runbook_url",
			},
			wantTitle:       "[<no value>] HighMemory and [<no value>]",
			wantBody:        []string{"HighMemory: see runbook at <no value>"},
			wantMissingVars: []string{"environment", "runbook_url", "service"},
		},
		{
			// Custom title template that expands to only whitespace triggers the fallback,
			// so the default title template is used instead.
			name: "fallback: whitespace-only custom title falls back to default",
			alerts: []*types.Alert{
				createAlert(map[string]string{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelSeverityName: "critical"}, nil, false),
			},
			input: alertmanagertypes.ExpandRequest{
				TitleTemplate:        "   ",
				DefaultTitleTemplate: "{{ .CommonLabels.alertname }} ({{ .Status | toUpper }})",
				DefaultBodyTemplate:  "Runbook: https://runbook.example.com",
			},
			wantTitle:         "HighCPU (RESOLVED)",
			wantBody:          []string{"Runbook: https://runbook.example.com"},
			wantIsDefaultBody: true,
		},
		{
			name: "using non-existing function in template",
			alerts: []*types.Alert{
				createAlert(map[string]string{ruletypes.LabelAlertName: "HighCPU", ruletypes.LabelSeverityName: "critical"}, nil, true),
			},
			input: alertmanagertypes.ExpandRequest{
				TitleTemplate: "$rule.name ({{$severity | toUpperAndTrim}}) for $alertname",
			},
			errorContains: "function \"toUpperAndTrim\" not defined",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := at.Expand(ctx, tc.input, tc.alerts)
			if tc.errorContains != "" {
				require.ErrorContains(t, err, tc.errorContains)
				return
			}
			require.NoError(t, err)

			if tc.wantTitle != "" {
				require.Equal(t, tc.wantTitle, got.Title)
			}
			if tc.wantBody != nil {
				require.Equal(t, tc.wantBody, got.Body)
			}
			require.Equal(t, tc.wantIsDefaultBody, got.IsDefaultBody)

			if len(tc.wantMissingVars) == 0 {
				require.Empty(t, got.MissingVars)
			} else {
				sort.Strings(tc.wantMissingVars)
				require.Equal(t, tc.wantMissingVars, got.MissingVars)
			}
		})
	}
}
