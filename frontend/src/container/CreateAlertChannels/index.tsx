import { Form } from 'antd';
import createMsTeamsApi from 'api/channels/createMsTeams';
import createOpsgenie from 'api/channels/createOpsgenie';
import createPagerApi from 'api/channels/createPager';
import createSlackApi from 'api/channels/createSlack';
import createWebhookApi from 'api/channels/createWebhook';
import testMsTeamsApi from 'api/channels/testMsTeams';
import testOpsGenie from 'api/channels/testOpsgenie';
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
	MsTeamsChannel,
	OpsgenieChannel,
	PagerChannel,
	SlackChannel,
	ValidatePagerChannel,
	WebhookChannel,
} from './config';
import { OpsgenieInitialConfig, PagerInitialConfig } from './defaults';
import { isChannelType } from './utils';

function CreateAlertChannels({
	preType = ChannelType.Slack,
}: CreateAlertChannelsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('channels');

	const [formInstance] = Form.useForm();

	const [selectedConfig, setSelectedConfig] = useState<
		Partial<
			SlackChannel &
				WebhookChannel &
				PagerChannel &
				MsTeamsChannel &
				OpsgenieChannel
		>
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

			if (value === ChannelType.Pagerduty && currentType !== value) {
				// reset config to pager defaults
				setSelectedConfig({
					name: selectedConfig?.name,
					send_resolved: selectedConfig.send_resolved,
					...PagerInitialConfig,
				});
			}

			if (value === ChannelType.Opsgenie && currentType !== value) {
				setSelectedConfig((selectedConfig) => ({
					...selectedConfig,
					...OpsgenieInitialConfig,
				}));
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
				history.replace(ROUTES.ALL_CHANNELS);
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
				history.replace(ROUTES.ALL_CHANNELS);
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
					history.replace(ROUTES.ALL_CHANNELS);
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

	const prepareOpsgenieRequest = useCallback(
		() => ({
			api_key: selectedConfig?.api_key || '',
			name: selectedConfig?.name || '',
			send_resolved: true,
			description: selectedConfig?.description || '',
			message: selectedConfig?.message || '',
			priority: selectedConfig?.priority || '',
		}),
		[selectedConfig],
	);

	const onOpsgenieHandler = useCallback(async () => {
		setSavingState(true);

		try {
			const response = await createOpsgenie(prepareOpsgenieRequest());

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description: t('channel_creation_done'),
				});
				history.replace(ROUTES.ALL_CHANNELS);
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
	}, [prepareOpsgenieRequest, t, notifications]);

	const prepareMsTeamsRequest = useCallback(
		() => ({
			webhook_url: selectedConfig?.webhook_url || '',
			name: selectedConfig?.name || '',
			send_resolved: true,
			text: selectedConfig?.text || '',
			title: selectedConfig?.title || '',
		}),
		[selectedConfig],
	);

	const onMsTeamsHandler = useCallback(async () => {
		setSavingState(true);

		try {
			const response = await createMsTeamsApi(prepareMsTeamsRequest());

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Success',
					description: t('channel_creation_done'),
				});
				history.replace(ROUTES.ALL_CHANNELS);
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
	}, [prepareMsTeamsRequest, t, notifications]);

	const onSaveHandler = useCallback(
		async (value: ChannelType) => {
			const functionMapper = {
				[ChannelType.Slack]: onSlackHandler,
				[ChannelType.Webhook]: onWebhookHandler,
				[ChannelType.Pagerduty]: onPagerHandler,
				[ChannelType.Opsgenie]: onOpsgenieHandler,
				[ChannelType.MsTeams]: onMsTeamsHandler,
			};

			if (isChannelType(value)) {
				const functionToCall = functionMapper[value as keyof typeof functionMapper];

				if (functionToCall) {
					functionToCall();
				} else {
					notifications.error({
						message: 'Error',
						description: t('selected_channel_invalid'),
					});
				}
			}
		},
		[
			onSlackHandler,
			onWebhookHandler,
			onPagerHandler,
			onOpsgenieHandler,
			onMsTeamsHandler,
			notifications,
			t,
		],
	);

	const performChannelTest = useCallback(
		async (channelType: ChannelType) => {
			setTestingState(true);
			try {
				let request;
				let response;
				switch (channelType) {
					case ChannelType.Webhook:
						request = prepareWebhookRequest();
						response = await testWebhookApi(request);
						break;
					case ChannelType.Slack:
						request = prepareSlackRequest();
						response = await testSlackApi(request);
						break;
					case ChannelType.Pagerduty:
						request = preparePagerRequest();
						if (request) response = await testPagerApi(request);
						break;
					case ChannelType.MsTeams:
						request = prepareMsTeamsRequest();
						response = await testMsTeamsApi(request);
						break;
					case ChannelType.Opsgenie:
						request = prepareOpsgenieRequest();
						response = await testOpsGenie(request);
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
			prepareOpsgenieRequest,
			prepareSlackRequest,
			prepareMsTeamsRequest,
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
					...OpsgenieInitialConfig,
				},
			}}
		/>
	);
}

interface CreateAlertChannelsProps {
	preType: ChannelType;
}

export default CreateAlertChannels;
