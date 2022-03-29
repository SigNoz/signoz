import { Form, notification } from 'antd';
import createSlackApi from 'api/channels/createSlack';
import createWebhookApi from 'api/channels/createWebhook';
import ROUTES from 'constants/routes';
import FormAlertChannels from 'container/FormAlertChannels';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';

import {
	ChannelType,
	SlackChannel,
	SlackType,
	WebhookChannel,
	WebhookType,
} from './config';

function CreateAlertChannels({
	preType = 'slack',
}: CreateAlertChannelsProps): JSX.Element {
	const [formInstance] = Form.useForm();
	const [selectedConfig, setSelectedConfig] = useState<
		Partial<SlackChannel & WebhookChannel>
	>({
		text: ` {{ range .Alerts -}}
     *Alert:* {{ .Annotations.title }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Description:* {{ .Annotations.description }}

     *Details:*
       {{ range .Labels.SortedPairs }} • *{{ .Name }}:* {{ .Value }}
       {{ end }}
     {{ end }}`,
		title: `[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }} for {{ .CommonLabels.job }}
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
	});
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
					description: response.error || 'Error while creating the channel',
				});
			}
			setSavingState(false);
		} catch (error) {
			notifications.error({
				message: 'Error',
				description:
					'An unexpected error occurred while creating this channel, please try again',
			});
			setSavingState(false);
		}
	}, [notifications, selectedConfig]);

	const onWebhookHandler = useCallback(async () => {
		// initial api request without auth params
		let request: WebhookChannel = {
			api_url: selectedConfig?.api_url || '',
			name: selectedConfig?.name || '',
			send_resolved: true,
		};

		setSavingState(true);

		try {
			if (selectedConfig?.username !== '' || selectedConfig?.password !== '') {
				if (selectedConfig?.username !== '') {
					// if username is not null then password must be passed
					if (selectedConfig?.password !== '') {
						request = {
							...request,
							username: selectedConfig.username,
							password: selectedConfig.password,
						};
					} else {
						notifications.error({
							message: 'Error',
							description: 'A Password must be provided with user name',
						});
					}
				} else if (selectedConfig?.password !== '') {
					// only password entered, set bearer token
					request = {
						...request,
						username: '',
						password: selectedConfig.password,
					};
				}
			}

			const response = await createWebhookApi(request);
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
					description: response.error || 'Error while creating the channel',
				});
			}
		} catch (error) {
			notifications.error({
				message: 'Error',
				description:
					'An unexpected error occurred while creating this channel, please try again',
			});
		}
		setSavingState(false);
	}, [notifications, selectedConfig]);

	const onSaveHandler = useCallback(
		async (value: ChannelType) => {
			switch (value) {
				case SlackType:
					onSlackHandler();
					break;
				case WebhookType:
					onWebhookHandler();
					break;
				default:
					notifications.error({
						message: 'Error',
						description: 'channel type selected is invalid',
					});
			}
		},
		[onSlackHandler, onWebhookHandler, notifications],
	);

	return (
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
					type,
					...selectedConfig,
				},
			}}
		/>
	);
}

interface CreateAlertChannelsProps {
	preType: ChannelType;
}

export default CreateAlertChannels;
