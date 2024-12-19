import { Form, Input } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { MsTeamsChannel } from '../../CreateAlertChannels/config';

function MsTeams({ setSelectedConfig }: MsTeamsProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item name="webhook_url" label={t('field_webhook_url')}>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							webhook_url: event.target.value,
						}));
					}}
					data-testid="webhook-url-textbox"
				/>
			</Form.Item>

			<Form.Item name="title" label={t('field_slack_title')}>
				<Input.TextArea
					rows={4}
					// value={`[{{ .Status | toUpper }}{{ if eq .Status \"firing\" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n{{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n{{\" \"}}(\n{{- with .CommonLabels.Remove .GroupLabels.Names }}\n    {{- range $index, $label := .SortedPairs -}}\n    {{ if $index }}, {{ end }}\n    {{- $label.Name }}=\"{{ $label.Value -}}\"\n    {{- end }}\n{{- end -}}\n)\n{{- end }}`}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							title: event.target.value,
						}))
					}
					data-testid="title-textarea"
				/>
			</Form.Item>

			<Form.Item name="text" label={t('field_slack_description')}>
				<Input.TextArea
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							text: event.target.value,
						}))
					}
					data-testid="description-textarea"
					placeholder={t('placeholder_slack_description')}
				/>
			</Form.Item>
		</>
	);
}

interface MsTeamsProps {
	setSelectedConfig: React.Dispatch<
		React.SetStateAction<Partial<MsTeamsChannel>>
	>;
}

export default MsTeams;
