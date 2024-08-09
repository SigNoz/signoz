export const allAlertChannels = [
	{
		id: '3',
		created_at: '2023-08-09T04:45:19.239344617Z',
		updated_at: '2024-06-27T11:37:14.841184399Z',
		name: 'Dummy-Channel',
		type: 'slack',
		data:
			'{"name":"Dummy-Channel","slack_configs":[{"api_url":"https://discord.com/api/webhooks/dummy_webhook_id/dummy_webhook_token/slack","channel":"#dummy_channel","send_resolved":true,"text":"{{ range .Alerts -}}\\n     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }} dummy_summary\\n\\n     *Summary:* {{ .Annotations.summary }}\\n     *Description:* {{ .Annotations.description }}\\n\\n     *Details:*\\n       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}\\n       {{ end }}\\n     {{ end }}","title":"[{{ .Status | toUpper }}{{ if eq .Status \\"firing\\" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\\n     {{- if gt (len .CommonLabels) (len .GroupLabels) -}}\\n       {{\\" \\"}}(\\n       {{- with .CommonLabels.Remove .GroupLabels.Names }}\\n         {{- range $index, $label := .SortedPairs -}}\\n           {{ if $index }}, {{ end }}\\n           {{- $label.Name }}=\\"{{ $label.Value -}}\\"\\n         {{- end }}\\n       {{- end -}}\\n       )\\n     {{- end }}"}]}',
	},
];

export const editAlertChannelInitialValue = {
	api_url:
		'https://discord.com/api/webhooks/dummy_webhook_id/dummy_webhook_token/slack',
	channel: '#dummy_channel',
	send_resolved: true,
	text:
		'{{ range .Alerts -}}\n     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }} dummy_summary\n\n     *Summary:* {{ .Annotations.summary }}\n     *Description:* {{ .Annotations.description }}\n\n     *Details:*\n       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}\n       {{ end }}\n     {{ end }}',
	title:
		'[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n     {{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n       {{" "}}(\n       {{- with .CommonLabels.Remove .GroupLabels.Names }}\n         {{- range $index, $label := .SortedPairs -}}\n           {{ if $index }}, {{ end }}\n           {{- $label.Name }}="{{ $label.Value -}}"\n         {{- end }}\n       {{- end -}}\n       )\n     {{- end }}',
	type: 'slack',
	name: 'Dummy-Channel',
};

export const slackTitleDefaultValue = `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }} {{- if gt (len .CommonLabels) (len .GroupLabels) -}} {{" "}}( {{- with .CommonLabels.Remove .GroupLabels.Names }} {{- range $index, $label := .SortedPairs -}} {{ if $index }}, {{ end }} {{- $label.Name }}="{{ $label.Value -}}" {{- end }} {{- end -}} ) {{- end }}`;

export const slackDescriptionDefaultValue = `{{ range .Alerts -}} *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }} *Summary:* {{ .Annotations.summary }} *Description:* {{ .Annotations.description }} *RelatedLogs:* {{ if gt (len .Annotations.related_logs) 0 -}} View in <{{ .Annotations.related_logs }}|logs explorer> {{- end}} *RelatedTraces:* {{ if gt (len .Annotations.related_traces) 0 -}} View in <{{ .Annotations.related_traces }}|traces explorer> {{- end}} *Details:* {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }} {{ end }} {{ end }}`;

export const editSlackDescriptionDefaultValue = `{{ range .Alerts -}} *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }} dummy_summary *Summary:* {{ .Annotations.summary }} *Description:* {{ .Annotations.description }} *Details:* {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }} {{ end }} {{ end }}`;

export const pagerDutyDescriptionDefaultVaule = `{{ if gt (len .Alerts.Firing) 0 -}} Alerts Firing: {{ range .Alerts.Firing }} - Message: {{ .Annotations.description }} Labels: {{ range .Labels.SortedPairs }} - {{ .Name }} = {{ .Value }} {{ end }} Annotations: {{ range .Annotations.SortedPairs }} - {{ .Name }} = {{ .Value }} {{ end }} Source: {{ .GeneratorURL }} {{ end }} {{- end }} {{ if gt (len .Alerts.Resolved) 0 -}} Alerts Resolved: {{ range .Alerts.Resolved }} - Message: {{ .Annotations.description }} Labels: {{ range .Labels.SortedPairs }} - {{ .Name }} = {{ .Value }} {{ end }} Annotations: {{ range .Annotations.SortedPairs }} - {{ .Name }} = {{ .Value }} {{ end }} Source: {{ .GeneratorURL }} {{ end }} {{- end }}`;

export const pagerDutyAdditionalDetailsDefaultValue = JSON.stringify({
	firing: `{{ template "pagerduty.default.instances" .Alerts.Firing }}`,
	resolved: `{{ template "pagerduty.default.instances" .Alerts.Resolved }}`,
	num_firing: '{{ .Alerts.Firing | len }}',
	num_resolved: '{{ .Alerts.Resolved | len }}',
});

export const opsGenieMessageDefaultValue = `{{ .CommonLabels.alertname }}`;

export const opsGenieDescriptionDefaultValue = `{{ if gt (len .Alerts.Firing) 0 -}} Alerts Firing: {{ range .Alerts.Firing }} - Message: {{ .Annotations.description }} Labels: {{ range .Labels.SortedPairs }} - {{ .Name }} = {{ .Value }} {{ end }} Annotations: {{ range .Annotations.SortedPairs }} - {{ .Name }} = {{ .Value }} {{ end }} Source: {{ .GeneratorURL }} {{ end }} {{- end }} {{ if gt (len .Alerts.Resolved) 0 -}} Alerts Resolved: {{ range .Alerts.Resolved }} - Message: {{ .Annotations.description }} Labels: {{ range .Labels.SortedPairs }} - {{ .Name }} = {{ .Value }} {{ end }} Annotations: {{ range .Annotations.SortedPairs }} - {{ .Name }} = {{ .Value }} {{ end }} Source: {{ .GeneratorURL }} {{ end }} {{- end }}`;

export const opsGeniePriorityDefaultValue =
	'{{ if eq (index .Alerts 0).Labels.severity "critical" }}P1{{ else if eq (index .Alerts 0).Labels.severity "warning" }}P2{{ else if eq (index .Alerts 0).Labels.severity "info" }}P3{{ else }}P4{{ end }}';

export const pagerDutySeverityTextDefaultValue =
	'{{ (index .Alerts 0).Labels.severity }}';
