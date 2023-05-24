import { Form } from 'antd';
import createPagerApi from 'api/channels/createPager';
import createSlackApi from 'api/channels/createSlack';
import createWebhookApi from 'api/channels/createWebhook';
import testPagerApi from 'api/channels/testPager';
import testSlackApi from 'api/channels/testSlack';
import testWebhookApi from 'api/channels/testWebhook';
import ROUTES from 'constants/routes';
import FormAlertChannels from 'container/FormAlertChannels';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

function CreateAlertChannels({
	preType = 'slack',
}: CreateAlertChannelsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('channels');

	const [formInstance] = Form.useForm();

	const [selectedConfig, setSelectedConfig] = useState<
		Partial<SlackChannel & WebhookChannel & PagerChannel>
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
	const { notifications } = useNotifications();

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

	const prepareSlackRequest = useCallback(
		() => ({
			api_url: selectedConfig?.api_url || '',
			channel: selectedConfig?.channel || '',
			name: selectedConfig?.name || '',
			send_resolved: true,
			text: selectedConfig?.text || '',
			title: selectedConfig?.title || '',
		}),
		[selectedConfig],
	);

	const onSlackHandler = useCallback(async () => {
		setSavingState(true);

		try {
			const response = await createSlackApi(prepareSlackRequest());

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description: t('channel_creation_done'),
				});
				setTimeout(() => {
					history.replace(ROUTES.SETTINGS);
				}, 2000);
			} else {
				notifications.error({
					message: 'Error',
					description: response.error || t('channel_creation_failed'),
				});
			}
		} catch (error) {
			notifications.error({
				message: 'Error',
				description: t('channel_creation_failed'),
			});
		}
		setSavingState(false);
	}, [prepareSlackRequest, t, notifications]);

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
						description: t('username_no_password'),
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
	}, [notifications, t, selectedConfig]);

	const onWebhookHandler = useCallback(async () => {
		setSavingState(true);
		try {
			const request = prepareWebhookRequest();
			const response = await createWebhookApi(request);
			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description: t('channel_creation_done'),
				});
				setTimeout(() => {
					history.replace(ROUTES.SETTINGS);
				}, 2000);
			} else {
				notifications.error({
					message: 'Error',
					description: response.error || t('channel_creation_failed'),
				});
			}
		} catch (error) {
			notifications.error({
				message: 'Error',
				description: t('channel_creation_failed'),
			});
		}
		setSavingState(false);
	}, [prepareWebhookRequest, t, notifications]);

	const preparePagerRequest = useCallback(() => {
		const validationError = ValidatePagerChannel(selectedConfig as PagerChannel);
		if (validationError !== '') {
			notifications.error({
				message: 'Error',
				description: validationError,
			});
			return null;
		}

		return {
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
		};
	}, [selectedConfig, notifications]);

	const onPagerHandler = useCallback(async () => {
		setSavingState(true);
		const request = preparePagerRequest();

		if (request) {
			try {
				const response = await createPagerApi(request);

				if (response.statusCode === 200) {
					notifications.success({
						message: 'Success',
						description: t('channel_creation_done'),
					});
					setTimeout(() => {
						history.replace(ROUTES.SETTINGS);
					}, 2000);
				} else {
					notifications.error({
						message: 'Error',
						description: response.error || t('channel_creation_failed'),
					});
				}
			} catch (e) {
				notifications.error({
					message: 'Error',
					description: t('channel_creation_failed'),
				});
			}
		}
		setSavingState(false);
	}, [t, notifications, preparePagerRequest]);

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
						description: t('selected_channel_invalid'),
					});
			}
		},
		[onSlackHandler, t, onPagerHandler, onWebhookHandler, notifications],
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
					case PagerType:
						request = preparePagerRequest();
						if (request) response = await testPagerApi(request);
						break;
					default:
						notifications.error({
							message: 'Error',
							description: t('test_unsupported'),
						});
						setTestingState(false);
						return;
				}

				if (response && response.statusCode === 200) {
					notifications.success({
						message: 'Success',
						description: t('channel_test_done'),
					});
				} else {
					notifications.error({
						message: 'Error',
						description: t('channel_test_failed'),
					});
				}
			} catch (error) {
				notifications.error({
					message: 'Error',
					description: t('channel_test_unexpected'),
				});
			}
			setTestingState(false);
		},
		[
			prepareWebhookRequest,
			t,
			preparePagerRequest,
			prepareSlackRequest,
			notifications,
		],
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
				title: t('page_title_create'),
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
