import { Form, notification } from 'antd';
import createPagerApi from 'api/channels/createPager';
import createSlackApi from 'api/channels/createSlack';
import createWebhookApi from 'api/channels/createWebhook';
import ROUTES from 'constants/routes';
import FormAlertChannels from 'container/FormAlertChannels';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';

import {
	ChannelType,
	PagerChannel,
	PagerType,
	SlackChannel,
	SlackType,
	ValidatePagerChannel,
	WebhookChannel,
	WebhookType,
} from './config';
import { PagerInitialConfig } from './defaults';
import {
	OnErrorMessage,
	OnSuccessMessage,
	UnexpectedError,
} from './message_constants';

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
	const onTypeChangeHandler = useCallback(
		(value: string) => {
			const currentType = type;
			setType(value as ChannelType);

			if (value === PagerType && currentType !== value) {
				// reset config to pager defaults
				setSelectedConfig({
					name: selectedConfig?.name,
					send_resolved: selectedConfig.send_resolved,
					...PagerInitialConfig,
				});
			}
		},
		[type, selectedConfig],
	);

	const onTestHandler = useCallback(() => {
		console.log('test');
	}, []);

	const showError = useCallback(
		(msg: string | undefined | null): void => {
			notifications.error({
				message: 'Error',
				description: msg || OnErrorMessage,
			});
		},
		[notifications],
	);

	const onSlackHandler = useCallback(async () => {
		setSavingState(true);

		try {
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
					description: OnSuccessMessage,
				});
				setTimeout(() => {
					history.replace(ROUTES.SETTINGS);
				}, 2000);
			} else {
				showError(response.error);
			}
		} catch (error) {
			showError(UnexpectedError);
		}
		setSavingState(false);
	}, [notifications, selectedConfig, showError]);

	const onPagerHandler = useCallback(async () => {
		setSavingState(true);
		const validationError = ValidatePagerChannel(selectedConfig as PagerChannel);

		if (validationError !== '') {
			showError(validationError);
			setSavingState(false);
			return;
		}

		try {
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
				details: selectedConfig.details || '',
				detailsArray: JSON.parse(selectedConfig.details || '{}'),
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description: OnSuccessMessage,
				});
				setTimeout(() => {
					history.replace(ROUTES.SETTINGS);
				}, 2000);
			} else {
				showError(response.error);
			}
		} catch (e) {
			showError(UnexpectedError);
		}
		setSavingState(false);
	}, [notifications, selectedConfig, showError]);

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
					description: OnSuccessMessage,
				});
				setTimeout(() => {
					history.replace(ROUTES.SETTINGS);
				}, 2000);
			} else {
				showError(response.error);
			}
		} catch (error) {
			showError(UnexpectedError);
		}
		setSavingState(false);
	}, [notifications, selectedConfig, showError]);

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
			}
		},
		[onSlackHandler, onWebhookHandler, onPagerHandler, notifications],
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
	preType: ChannelType;
}

export default CreateAlertChannels;
