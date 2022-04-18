import { Form, notification } from 'antd';
import createSlackApi from 'api/channels/createSlack';
import createWebhookApi from 'api/channels/createWebhook';
import testSlackApi from 'api/channels/testSlack';
import testWebhookApi from 'api/channels/testWebhook';
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
		text: `{{ range .Alerts -}}
     *Alert:* {{ .Labels.alertname }}{{ if .Labels.severity }} - {{ .Labels.severity }}{{ end }}

     *Summary:* {{ .Annotations.summary }}
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
	const [testingState, setTestingState] = useState<boolean>(false);
	const [notifications, NotificationElement] = notification.useNotification();

	const [type, setType] = useState<ChannelType>(preType);
	const onTypeChangeHandler = useCallback((value: string) => {
		setType(value as ChannelType);
	}, []);

	const prepareSlackRequest = useCallback(() => {
		return {
			api_url: selectedConfig?.api_url || '',
			channel: selectedConfig?.channel || '',
			name: selectedConfig?.name || '',
			send_resolved: true,
			text: selectedConfig?.text || '',
			title: selectedConfig?.title || '',
		};
	}, [selectedConfig]);

	const onSlackHandler = useCallback(async () => {
		try {
			setSavingState(true);
			const response = await createSlackApi(prepareSlackRequest());

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
	}, [prepareSlackRequest, notifications]);

	const prepareWebhookRequest = useCallback(() => {
		// initial api request without auth params
		let request: WebhookChannel = {
			api_url: selectedConfig?.api_url || '',
			name: selectedConfig?.name || '',
			send_resolved: true,
		};

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
		return request;
	}, [notifications, selectedConfig]);

	const onWebhookHandler = useCallback(async () => {
		setSavingState(true);
		try {
			const request = prepareWebhookRequest();
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
	}, [prepareWebhookRequest, notifications]);
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

	const performChannelTest = useCallback(
		async (channelType: ChannelType) => {
			setTestingState(true);
			try {
				let request;
				let response;
				switch (channelType) {
					case WebhookType:
						request = prepareWebhookRequest();
						response = await testWebhookApi(request);
						break;
					case SlackType:
						request = prepareSlackRequest();
						response = await testSlackApi(request);
						break;
					default:
						notifications.error({
							message: 'Error',
							description: 'Sorry, this channel type does not support test yet',
						});
						setTestingState(false);
						return;
				}

				if (response.statusCode === 200) {
					notifications.success({
						message: 'Success',
						description: 'An alert has been sent to this channel',
					});
				} else {
					notifications.error({
						message: 'Error',
						description:
							'Failed to send a test message to this channel, please confirm that the parameters are set correctly',
					});
				}
			} catch (error) {
				notifications.error({
					message: 'Error',
					description:
						'An unexpected error occurred while sending a message to this channel, please try again',
				});
			}
			setTestingState(false);
		},
		[prepareWebhookRequest, prepareSlackRequest, notifications],
	);

	const onTestHandler = useCallback(
		async (value: ChannelType) => {
			performChannelTest(value);
		},
		[performChannelTest],
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
				testingState,
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
