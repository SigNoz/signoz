import { Form, Input } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { SlackChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

function Slack({ setSelectedConfig }: SlackProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item name="api_url" label={t('field_webhook_url')}>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							api_url: event.target.value,
						}));
					}}
					data-testid="webhook-url-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="channel"
				help={t('slack_channel_help')}
				label={t('field_slack_recipient')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							channel: event.target.value,
						}))
					}
					data-testid="slack-channel-textbox"
				/>
			</Form.Item>

			<Form.Item name="title" label={t('field_slack_title')}>
				<TextArea
					data-testid="title-textarea"
					rows={4}
					// value={`[{{ .Status | toUpper }}{{ if eq .Status \"firing\" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n{{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n{{\" \"}}(\n{{- with .CommonLabels.Remove .GroupLabels.Names }}\n    {{- range $index, $label := .SortedPairs -}}\n    {{ if $index }}, {{ end }}\n    {{- $label.Name }}=\"{{ $label.Value -}}\"\n    {{- end }}\n{{- end -}}\n)\n{{- end }}`}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							title: event.target.value,
						}))
					}
				/>
			</Form.Item>

			<Form.Item name="text" label={t('field_slack_description')}>
				<TextArea
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							text: event.target.value,
						}))
					}
					placeholder={t('placeholder_slack_description')}
					data-testid="description-textarea"
				/>
			</Form.Item>
		</>
	);
}

interface SlackProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<SlackChannel>>>;
}

export default Slack;
