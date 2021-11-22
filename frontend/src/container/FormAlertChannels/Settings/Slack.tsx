import { Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';

import { SlackChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

const Slack = ({ setSelectedConfig }: SlackProps): JSX.Element => (
	<>
		<FormItem name="api_url" label="Webhook URL">
			<Input
				onChange={(event): void => {
					setSelectedConfig((value) => ({
						...value,
						api_url: event.target.value,
					}));
				}}
			/>
		</FormItem>

		<FormItem
			name="channel"
			help={
				'Specify channel or user, use #channel-name, @username (has to be all lowercase, no whitespace),'
			}
			label="Recipient"
		>
			<Input
				onChange={(event): void =>
					setSelectedConfig((value) => ({
						...value,
						channel: event.target.value,
					}))
				}
			/>
		</FormItem>

		<FormItem name="title" label="Title">
			<TextArea
				rows={4}
				// value={`[{{ .Status | toUpper }}{{ if eq .Status \"firing\" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n{{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n{{\" \"}}(\n{{- with .CommonLabels.Remove .GroupLabels.Names }}\n    {{- range $index, $label := .SortedPairs -}}\n    {{ if $index }}, {{ end }}\n    {{- $label.Name }}=\"{{ $label.Value -}}\"\n    {{- end }}\n{{- end -}}\n)\n{{- end }}`}
				onChange={(event): void =>
					setSelectedConfig((value) => ({
						...value,
						title: event.target.value,
					}))
				}
			/>
		</FormItem>

		<FormItem name="text" label="Description">
			<TextArea
				onChange={(event): void =>
					setSelectedConfig((value) => ({
						...value,
						text: event.target.value,
					}))
				}
				placeholder="description"
			/>
		</FormItem>
	</>
);

interface SlackProps {
	setSelectedConfig: React.Dispatch<React.SetStateAction<Partial<SlackChannel>>>;
}

export default Slack;
