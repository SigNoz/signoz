import { PagerChannel } from './config';

export const PagerInitialConfig: Partial<PagerChannel> = {
	description: `{{ range .Alerts -}}
	*Alert:* {{ if .Annotations.title }} {{ .Annotations.title }} {{ else }} {{ .Annotations.summary }} {{end}} {{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}
	
	*Description:* {{ .Annotations.description }}

	*Details:*
		{{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
		{{ end }}
	{{ end }}`,
	severity: '{{ (index .Alerts 0).Labels.severity }}',
	client: 'SigNoz Alert Manager',
	client_url: 'https://enter-signoz-host-n-port-here/alerts',
	details: JSON.stringify({
		firing: `{{ template "pagerduty.default.instances" .Alerts.Firing }}`,
		resolved: `{{ template "pagerduty.default.instances" .Alerts.Resolved }}`,
		num_firing: '{{ .Alerts.Firing | len }}',
		num_resolved: '{{ .Alerts.Resolved | len }}',
	}),
};
