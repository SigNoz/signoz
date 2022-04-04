import { ENVIRONMENT } from 'constants/env';

import { PagerChannel } from './config';

const { baseURL } = ENVIRONMENT;
const alertURL = baseURL.concat('/alerts');

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
	client_url: alertURL,
	details: JSON.stringify({
		firing: `{{ template "pagerduty.default.instances" .Alerts.Firing }}`,
		resolved: `{{ template "pagerduty.default.instances" .Alerts.Resolved }}`,
	}),
};
