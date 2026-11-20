package alertmanagertypes

import (
	"net/url"
	"testing"
	"time"

	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFromGlobs(t *testing.T) {
	template, err := FromGlobs([]string{})
	require.NoError(t, err)
	template.ExternalURL = &url.URL{Scheme: "http", Host: "localhost:8080", Path: ""}

	testCases := []struct {
		name     string
		alerts   []*types.Alert
		expected string
	}{
		{
			name: "SingleAlertWithValidRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts/edit?ruleId=01961575-461c-7668-875f-05d374062bfc",
		},
		{
			name: "SingleAlertWithValidRuleUUIDv4",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "2d8edca5-4f24-4266-afd1-28cefadcfa88",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts/edit?ruleId=2d8edca5-4f24-4266-afd1-28cefadcfa88",
		},
		{
			name: "MultipleAlertsWithMismatchingRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "0196156c-990e-7ec5-b28f-8a3cfbb9c865",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts",
		},
		{
			name: "MultipleAlertsWithMatchingRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts/edit?ruleId=01961575-461c-7668-875f-05d374062bfc",
		},
		{
			name: "MultipleAlertsWithNoRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"label1": "1",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"label2": "2",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts",
		},
		{
			name: "TestAlertWithNoRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"testalert": "true",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts",
		},
		{
			name: "TestAlertWithRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"testalert": "true",
							"ruleId":    "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts/edit?ruleId=01961575-461c-7668-875f-05d374062bfc&isTestAlert=true",
		},
		{
			name: "TestAlertWithRuleIdWithSpacesAndSymbol",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"testalert": "true",
							"ruleId":    "Prom + Alert & Rule",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts/edit?ruleId=Prom+%2B+Alert+%26+Rule&isTestAlert=true",
		},
		{
			name: "AlertWithBlankRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			data := template.Data("__receiver", model.LabelSet{}, tc.alerts...)

			url, err := template.ExecuteTextString(`{{ template "__alertmanagerURL" . }}`, data)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, url)

			url, err = template.ExecuteHTMLString(`{{ template "__alertmanagerURL" . }}`, data)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, url)
		})
	}
}

func TestFromGlobsRelatedLinks(t *testing.T) {
	tmpl, err := FromGlobs([]string{})
	require.NoError(t, err)
	tmpl.ExternalURL = &url.URL{Scheme: "http", Host: "localhost:8080"}

	testCases := []struct {
		name        string
		template    string
		annotations model.LabelSet
		expected    string
	}{
		{
			name:        "Slack_Both_DotSeparated",
			template:    `{{ template "signoz.relatedLinks.slack" . }}`,
			annotations: model.LabelSet{"related_logs": "https://signoz.io/logs/logs-explorer?a=1", "related_traces": "https://signoz.io/traces-explorer?a=1"},
			expected:    "<https://signoz.io/logs/logs-explorer?a=1|View Related Logs> · <https://signoz.io/traces-explorer?a=1|View Related Traces>",
		},
		{
			name:        "Slack_LogsOnly_NoSeparator",
			template:    `{{ template "signoz.relatedLinks.slack" . }}`,
			annotations: model.LabelSet{"related_logs": "https://signoz.io/logs/logs-explorer?b=2"},
			expected:    "<https://signoz.io/logs/logs-explorer?b=2|View Related Logs>",
		},
		{
			name:        "Slack_NoLinks_Empty",
			template:    `{{ template "signoz.relatedLinks.slack" . }}`,
			annotations: model.LabelSet{"summary": "s"},
			expected:    "",
		},
		{
			name:        "Markdown_Both_BlankLineAfterEach",
			template:    `{{ template "signoz.relatedLinks.markdown" . }}`,
			annotations: model.LabelSet{"related_logs": "https://signoz.io/logs/logs-explorer?c=3", "related_traces": "https://signoz.io/traces-explorer?c=3"},
			expected:    "[View Related Logs](https://signoz.io/logs/logs-explorer?c=3)\n\n[View Related Traces](https://signoz.io/traces-explorer?c=3)\n\n",
		},
		{
			name:        "Markdown_TracesOnly",
			template:    `{{ template "signoz.relatedLinks.markdown" . }}`,
			annotations: model.LabelSet{"related_traces": "https://signoz.io/traces-explorer?d=4"},
			expected:    "[View Related Traces](https://signoz.io/traces-explorer?d=4)\n\n",
		},
		{
			name:        "Markdown_NoLinks_Empty",
			template:    `{{ template "signoz.relatedLinks.markdown" . }}`,
			annotations: model.LabelSet{},
			expected:    "",
		},
		{
			name:        "Function_DirectRange",
			template:    `{{ range relatedLinks . }}{{ .Label }}={{ .URL }};{{ end }}`,
			annotations: model.LabelSet{"related_logs": "https://signoz.io/logs/logs-explorer?e=5", "related_traces": "https://signoz.io/traces-explorer?e=5"},
			expected:    "View Related Logs=https://signoz.io/logs/logs-explorer?e=5;View Related Traces=https://signoz.io/traces-explorer?e=5;",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			alert := &types.Alert{Alert: model.Alert{Labels: model.LabelSet{"alertname": "a"}, Annotations: testCase.annotations}, UpdatedAt: time.Now()}
			data := tmpl.Data("__receiver", model.LabelSet{}, alert)

			got, err := tmpl.ExecuteTextString(`{{ range .Alerts }}`+testCase.template+`{{ end }}`, data)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, got)
		})
	}
}

func TestFromGlobsRelatedLinksHTML(t *testing.T) {
	tmpl, err := FromGlobs([]string{})
	require.NoError(t, err)
	tmpl.ExternalURL = &url.URL{Scheme: "http", Host: "localhost:8080"}

	testCases := []struct {
		name        string
		annotations model.LabelSet
		expected    string
	}{
		{
			name:        "Both_EscapedHref_LineEach",
			annotations: model.LabelSet{"related_logs": "http://localhost:8080/logs?a=1&b=2", "related_traces": "http://localhost:8080/traces?a=1&b=2"},
			expected:    "<a href=\"http://localhost:8080/logs?a=1&amp;b=2\">View Related Logs</a>\n<a href=\"http://localhost:8080/traces?a=1&amp;b=2\">View Related Traces</a>\n",
		},
		{
			name:        "LogsOnly",
			annotations: model.LabelSet{"related_logs": "http://localhost:8080/logs?c=3"},
			expected:    "<a href=\"http://localhost:8080/logs?c=3\">View Related Logs</a>\n",
		},
		{
			name:        "NoLinks_Empty",
			annotations: model.LabelSet{"summary": "s"},
			expected:    "",
		},
	}

	renderers := map[string]func(string, any) (string, error){
		"Text": tmpl.ExecuteTextString,
		"HTML": tmpl.ExecuteHTMLString,
	}

	for _, testCase := range testCases {
		for engine, render := range renderers {
			t.Run(testCase.name+"_"+engine, func(t *testing.T) {
				alert := &types.Alert{Alert: model.Alert{Labels: model.LabelSet{"alertname": "a"}, Annotations: testCase.annotations}, UpdatedAt: time.Now()}
				data := tmpl.Data("__receiver", model.LabelSet{}, alert)

				got, err := render(`{{ range .Alerts }}{{ template "signoz.relatedLinks.html" . }}{{ end }}`, data)
				require.NoError(t, err)
				assert.Equal(t, testCase.expected, got)
			})
		}
	}
}

func TestFromGlobsMSTeamsDefaults(t *testing.T) {
	tmpl, err := FromGlobs([]string{})
	require.NoError(t, err)
	tmpl.ExternalURL = &url.URL{Scheme: "http", Host: "localhost:8080"}

	firing := time.Now().Add(time.Hour)
	resolved := time.Now().Add(-time.Minute)

	testCases := []struct {
		name     string
		template string
		alerts   []*types.Alert
		expected string
	}{
		{
			name:     "Title_Firing_CountAndAlertName",
			template: `{{ template "msteamsv2.default.title" . }}`,
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"alertname": "High CPU"}, EndsAt: firing}},
			},
			expected: "[FIRING:1] High CPU",
		},
		{
			name:     "Title_Resolved_NoCount",
			template: `{{ template "msteamsv2.default.title" . }}`,
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"alertname": "Disk Full"}, EndsAt: resolved}},
			},
			expected: "[RESOLVED] Disk Full",
		},
		{
			name:     "Text_AllFields_HidesRuleLabels",
			template: `{{ template "msteamsv2.default.text" . }}`,
			alerts: []*types.Alert{
				{Alert: model.Alert{
					Labels: model.LabelSet{
						"alertname": "Error Rate", "severity": "critical", "ruleId": "0199051c-f374-71f7-a340-ec79ad81e70f",
						"ruleSource": "http://localhost:8080/alerts/overview?ruleId=0199051c", "service.name": "checkout",
					},
					Annotations: model.LabelSet{
						"summary": "errors are up", "description": "error rate crossed 5%",
						"related_logs": "https://signoz.io/logs/logs-explorer?f=6", "related_traces": "https://signoz.io/traces-explorer?f=6",
					},
					EndsAt: firing,
				}},
			},
			expected: "**Alert:** Error Rate (critical) - firing\n\n**Summary:** errors are up\n\n**Description:** error rate crossed 5%\n\n" +
				"[View Related Logs](https://signoz.io/logs/logs-explorer?f=6)\n\n[View Related Traces](https://signoz.io/traces-explorer?f=6)\n\n" +
				"**Details:**\n\n- **service.name:** checkout\n\n",
		},
		{
			name:     "Text_NoAnnotationsNoExtraLabels_AlertLineOnly",
			template: `{{ template "msteamsv2.default.text" . }}`,
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"alertname": "Queue Lag", "ruleId": "01a10b3d-e55d-75e3-aa44-8d73f1d969d7"}, EndsAt: resolved}},
			},
			expected: "**Alert:** Queue Lag - resolved\n\n",
		},
		{
			name:     "Text_TwoAlerts_OneBlockEach",
			template: `{{ template "msteamsv2.default.text" . }}`,
			alerts: []*types.Alert{
				{Alert: model.Alert{Labels: model.LabelSet{"alertname": "Pod Restarts", "pod": "api-1"}, EndsAt: firing}},
				{Alert: model.Alert{Labels: model.LabelSet{"alertname": "Pod Restarts", "pod": "api-2"}, EndsAt: resolved}},
			},
			expected: "**Alert:** Pod Restarts - firing\n\n**Details:**\n\n- **pod:** api-1\n\n" +
				"**Alert:** Pod Restarts - resolved\n\n**Details:**\n\n- **pod:** api-2\n\n",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			data := tmpl.Data("__receiver", model.LabelSet{}, testCase.alerts...)

			got, err := tmpl.ExecuteTextString(testCase.template, data)
			require.NoError(t, err)
			assert.Equal(t, testCase.expected, got)
		})
	}
}
