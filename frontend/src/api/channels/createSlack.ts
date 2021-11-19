import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/createSlack';

const create = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post('/channels', {
			name: props.title,
			slack_configs: [
				{
					send_resolved: true,
					api_url:
						'https://hooks.slack.com/services/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',
					channel: '#alerts',

					title:
						'[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n{{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n{{" "}}(\n{{- with .CommonLabels.Remove .GroupLabels.Names }}\n    {{- range $index, $label := .SortedPairs -}}\n    {{ if $index }}, {{ end }}\n    {{- $label.Name }}="{{ $label.Value -}}"\n    {{- end }}\n{{- end -}}\n)\n{{- end }}',

					text:
						'{{ range .Alerts -}} *Alert:* {{ .Annotations.title }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}\n*Description:* {{ .Annotations.description }}\n*Details:* {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }} {{ end }} {{ end }}',
				},
			],
		});

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default create;
