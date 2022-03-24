import { Form, notification } from 'antd';
import createSlackApi from 'api/channels/createSlack';
import createWebhookApi from 'api/channels/createWebhook';
import createPagerApi from 'api/channels/createPager';
import { PagerInitialConfig } from './defaults';
import ROUTES from 'constants/routes';
import FormAlertChannels from 'container/FormAlertChannels';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';

import {
	ChannelType,
	SlackChannel,
	WebhookChannel,
	SlackType,
	WebhookType,
	PagerType,
	PagerChannel,
} from './config';

function CreateAlertChannels({
	preType = 'slack',
}: CreateAlertChannelsProps): JSX.Element {
	const [formInstance] = Form.useForm();
	const [selectedConfig, setSelectedConfig] = useState<
		Partial<SlackChannel & WebhookChannel & PagerChannel>
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
		const currentType = type;
		setType(value as ChannelType);
		if (value === PagerType && currentType !== value) {
			// reset config to pager defaults
			setSelectedConfig(PagerInitialConfig);
		}
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
			setSavingState(false);
		}
	}, [notifications, selectedConfig]);

	const onPagerHandler = useCallback(async () => {
		try {
			var inputError = '';
			if (selectedConfig.name === '') {
				inputError = 'Name is mandatory for this channel';
			} else if (selectedConfig.routing_key === '') {
				inputError = 'routing_key is mandatory for this channel';
			}

			if (inputError != '') {
				notifications.error({
					message: 'Error',
					description: inputError || 'Error while creating the channel',
				});
			}

			setSavingState(true);
			const response = await createPagerApi({
				name: selectedConfig?.name || '',
				send_resolved: true,
				routing_key: selectedConfig?.routing_key || '',
				client: selectedConfig?.client || '',
				client_url: selectedConfig?.client_url || '',
				description: selectedConfig?.description || '',
				severity: selectedConfig?.severity || '',
				component: selectedConfig?.component || '',
				group: selectedConfig?.group || '',
				class: selectedConfig?.class || '',
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
			setSavingState(false);
		}
	}, [notifications, selectedConfig]);

	const onWebhookHandler = useCallback(async () => {
		try {
			setSavingState(true);
			var request: WebhookChannel = {
				api_url: selectedConfig?.api_url || '',
				name: selectedConfig?.name || '',
				send_resolved: true,
			};
			if (selectedConfig?.username !== '' || selectedConfig?.password !== '') {
				if (selectedConfig?.username !== '') {
					// if username is not null then password must be passed
					if (selectedConfig?.password !== '') {
						request.username = selectedConfig.username;
						request.password = selectedConfig.password;
					} else {
						notifications.error({
							message: 'Error',
							description:
								'password must be provided with user name, for bearer tokens leave user name empty',
						});
					}
				} else if (selectedConfig?.password !== '') {
					// only password entered, set bearer token
					request.password = selectedConfig.password;
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
			setSavingState(false);
		} catch (error) {
			setSavingState(false);
		}
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
				case PagerType:
					onPagerHandler();
					break;
				default:
					notifications.error({
						message: 'Error',
						description: 'channel type selected is invalid',
					});
					setSavingState(false);
			}
		},
		[onSlackHandler, onWebhookHandler],
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
					...PagerInitialConfig,
				},
			}}
		/>
	);
}

interface CreateAlertChannelsProps {
	preType?: ChannelType;
}

export default CreateAlertChannels;
