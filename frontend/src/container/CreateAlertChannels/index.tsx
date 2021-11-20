import { Form, notification } from 'antd';
import createSlackApi from 'api/channels/createSlack';
import ROUTES from 'constants/routes';
import FormAlertChannels from 'container/FormAlertChannels';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';

import { ChannelType, SlackChannel } from './config';

const CreateAlertChannels = ({
	preType = 'slack',
}: CreateAlertChannelsProps): JSX.Element => {
	const [formInstance] = Form.useForm();
	const [selectedConfig, setSelectedConfig] = useState<Partial<SlackChannel>>();
	const [savingState, setSavingState] = useState<boolean>(false);
	const [notifications, NotificationElement] = notification.useNotification();

	const [type, setType] = useState<ChannelType>(preType);
	const onTypeChangeHandler = useCallback((value: string) => {
		setType(value as ChannelType);
	}, []);

	const onTestHandler = useCallback(() => {
		console.log('test');
	}, []);

	const onSlackHandler = useCallback(async () => {
		try {
			setSavingState(true);
			const response = await createSlackApi({
				api_url: selectedConfig?.api_url || '',
				channel: selectedConfig?.channel || '',
				name: selectedConfig?.name || '',
				send_resolved: true,
				text: selectedConfig?.text || '',
				title: selectedConfig?.title || '',
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description: 'Successfully created the channel',
				});
				setTimeout(() => {
					history.replace(ROUTES.SETTINGS);
				}, 2000);
			} else {
				notifications.error({
					message: 'Error',
					description: 'Error while creating the channel',
				});
			}
			setSavingState(false);
		} catch (error) {
			setSavingState(false);
		}
	}, [notifications, selectedConfig]);

	const onSaveHandler = useCallback(
		async (value: ChannelType) => {
			if (value == 'slack') {
				onSlackHandler();
			}
		},
		[onSlackHandler],
	);

	return (
		<>
			<FormAlertChannels
				{...{
					formInstance,
					onTypeChangeHandler,
					setSelectedConfig,
					type,
					onTestHandler,
					onSaveHandler,
					savingState,
					NotificationElement,
					title: 'New Notification Channels',
					initialValue: {
						type: type,
						text: `"{{ range .Alerts -}} *Alert:* {{ .Annotations.title }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}\n*Description:* {{ .Annotations.description }}\n*Details:* {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }} {{ end }} {{ end }}"`,
						title: `"[{{ .Status | toUpper }}{{ if eq .Status \\"firing\\" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}\n{{- if gt (len .CommonLabels) (len .GroupLabels) -}}\n{{\\" \\"}}(\n{{- with .CommonLabels.Remove .GroupLabels.Names }}\n    {{- range $index, $label := .SortedPairs -}}\n    {{ if $index }}, {{ end }}\n    {{- $label.Name }}=\\"{{ $label.Value -}}\\"\n    {{- end }}\n{{- end -}}\n)\n{{- end }}"`,
					},
				}}
			/>
		</>
	);
};

interface CreateAlertChannelsProps {
	preType?: ChannelType;
}

export default CreateAlertChannels;
