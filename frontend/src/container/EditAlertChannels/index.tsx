import { Form } from 'antd';
import editEmail from 'api/channels/editEmail';
import editMsTeamsApi from 'api/channels/editMsTeams';
import editOpsgenie from 'api/channels/editOpsgenie';
import editPagerApi from 'api/channels/editPager';
import editSlackApi from 'api/channels/editSlack';
import editWebhookApi from 'api/channels/editWebhook';
import testEmail from 'api/channels/testEmail';
import testMsTeamsApi from 'api/channels/testMsTeams';
import testOpsgenie from 'api/channels/testOpsgenie';
import testPagerApi from 'api/channels/testPager';
import testSlackApi from 'api/channels/testSlack';
import testWebhookApi from 'api/channels/testWebhook';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import {
	ChannelType,
	EmailChannel,
	MsTeamsChannel,
	OpsgenieChannel,
	PagerChannel,
	SlackChannel,
	ValidatePagerChannel,
	WebhookChannel,
} from 'container/CreateAlertChannels/config';
import FormAlertChannels from 'container/FormAlertChannels';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

function EditAlertChannels({
	initialValue,
}: EditAlertChannelsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('channels');

	const [formInstance] = Form.useForm();
	const [selectedConfig, setSelectedConfig] = useState<
		Partial<
			SlackChannel &
				WebhookChannel &
				PagerChannel &
				MsTeamsChannel &
				OpsgenieChannel &
				EmailChannel
		>
	>({
		...initialValue,
	});
	const [savingState, setSavingState] = useState<boolean>(false);
	const [testingState, setTestingState] = useState<boolean>(false);
	const { notifications } = useNotifications();
	const { id } = useParams<{ id: string }>();

	const [type, setType] = useState<ChannelType>(
		initialValue?.type ? (initialValue.type as ChannelType) : ChannelType.Slack,
	);

	const onTypeChangeHandler = useCallback((value: string) => {
		setType(value as ChannelType);
	}, []);

	useEffect(() => {
		formInstance.setFieldsValue({
			...initialValue,
		});
	}, [formInstance, initialValue]);

	const prepareSlackRequest = useCallback(
		() => ({
			api_url: selectedConfig?.api_url || '',
			channel: selectedConfig?.channel || '',
			name: selectedConfig?.name || '',
			send_resolved: selectedConfig?.send_resolved || false,
			text: selectedConfig?.text || '',
			title: selectedConfig?.title || '',
			id,
		}),
		[id, selectedConfig],
	);

	const onSlackEditHandler = useCallback(async () => {
		setSavingState(true);

		if (selectedConfig?.api_url === '') {
			notifications.error({
				message: 'Error',
				description: t('webhook_url_required'),
			});
			setSavingState(false);
			return { status: 'failed', statusMessage: t('webhook_url_required') };
		}

		const response = await editSlackApi(prepareSlackRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: t('channel_edit_done'),
			});

			history.replace(ROUTES.ALL_CHANNELS);
			return { status: 'success', statusMessage: t('channel_edit_done') };
		}
		notifications.error({
			message: 'Error',
			description: response.error || t('channel_edit_failed'),
		});
		setSavingState(false);
		return {
			status: 'failed',
			statusMessage: response.error || t('channel_edit_failed'),
		};
	}, [prepareSlackRequest, t, notifications, selectedConfig]);

	const prepareWebhookRequest = useCallback(() => {
		const { name, username, password } = selectedConfig;
		return {
			api_url: selectedConfig?.api_url || '',
			name: name || '',
			send_resolved: selectedConfig?.send_resolved || false,
			username,
			password,
			id,
		};
	}, [id, selectedConfig]);

	const onWebhookEditHandler = useCallback(async () => {
		setSavingState(true);
		const { username, password } = selectedConfig;

		const showError = (msg: string): void => {
			notifications.error({
				message: 'Error',
				description: msg,
			});
		};

		if (selectedConfig?.api_url === '') {
			showError(t('webhook_url_required'));
			setSavingState(false);
			return { status: 'failed', statusMessage: t('webhook_url_required') };
		}

		if (username && (!password || password === '')) {
			showError(t('username_no_password'));
			setSavingState(false);
			return { status: 'failed', statusMessage: t('username_no_password') };
		}

		const response = await editWebhookApi(prepareWebhookRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: t('channel_edit_done'),
			});

			history.replace(ROUTES.ALL_CHANNELS);
			return { status: 'success', statusMessage: t('channel_edit_done') };
		}
		showError(response.error || t('channel_edit_failed'));

		setSavingState(false);
		return {
			status: 'failed',
			statusMessage: response.error || t('channel_edit_failed'),
		};
	}, [prepareWebhookRequest, t, notifications, selectedConfig]);

	const prepareEmailRequest = useCallback(
		() => ({
			name: selectedConfig?.name || '',
			to: selectedConfig.to || '',
			html: selectedConfig.html || '',
			headers: selectedConfig.headers || {},
			id,
		}),
		[id, selectedConfig],
	);

	const onEmailEditHandler = useCallback(async () => {
		setSavingState(true);
		const request = prepareEmailRequest();
		const response = await editEmail(request);
		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: t('channel_edit_done'),
			});
			history.replace(ROUTES.ALL_CHANNELS);
			return { status: 'success', statusMessage: t('channel_edit_done') };
		}
		notifications.error({
			message: 'Error',
			description: response.error || t('channel_edit_failed'),
		});

		setSavingState(false);
		return {
			status: 'failed',
			statusMessage: response.error || t('channel_edit_failed'),
		};
	}, [prepareEmailRequest, t, notifications]);

	const preparePagerRequest = useCallback(
		() => ({
			name: selectedConfig.name || '',
			routing_key: selectedConfig.routing_key,
			client: selectedConfig.client,
			client_url: selectedConfig.client_url,
			description: selectedConfig.description,
			severity: selectedConfig.severity,
			component: selectedConfig.component,
			class: selectedConfig.class,
			group: selectedConfig.group,
			details: selectedConfig.details,
			detailsArray: JSON.parse(selectedConfig.details || '{}'),
			id,
		}),
		[id, selectedConfig],
	);

	const onPagerEditHandler = useCallback(async () => {
		setSavingState(true);
		const validationError = ValidatePagerChannel(selectedConfig as PagerChannel);

		if (validationError !== '') {
			notifications.error({
				message: 'Error',
				description: validationError,
			});
			setSavingState(false);
			return { status: 'failed', statusMessage: validationError };
		}
		const response = await editPagerApi(preparePagerRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: t('channel_edit_done'),
			});

			history.replace(ROUTES.ALL_CHANNELS);
			return { status: 'success', statusMessage: t('channel_edit_done') };
		}
		notifications.error({
			message: 'Error',
			description: response.error || t('channel_edit_failed'),
		});

		setSavingState(false);
		return {
			status: 'failed',
			statusMessage: response.error || t('channel_edit_failed'),
		};
	}, [preparePagerRequest, notifications, selectedConfig, t]);

	const prepareOpsgenieRequest = useCallback(
		() => ({
			name: selectedConfig.name || '',
			api_key: selectedConfig.api_key || '',
			message: selectedConfig.message || '',
			description: selectedConfig.description || '',
			priority: selectedConfig.priority || '',
			id,
		}),
		[id, selectedConfig],
	);

	const onOpsgenieEditHandler = useCallback(async () => {
		setSavingState(true);

		if (selectedConfig?.api_key === '') {
			notifications.error({
				message: 'Error',
				description: t('api_key_required'),
			});
			setSavingState(false);
			return { status: 'failed', statusMessage: t('api_key_required') };
		}

		const response = await editOpsgenie(prepareOpsgenieRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: t('channel_edit_done'),
			});

			history.replace(ROUTES.ALL_CHANNELS);
			return { status: 'success', statusMessage: t('channel_edit_done') };
		}
		notifications.error({
			message: 'Error',
			description: response.error || t('channel_edit_failed'),
		});

		setSavingState(false);
		return {
			status: 'failed',
			statusMessage: response.error || t('channel_edit_failed'),
		};
	}, [prepareOpsgenieRequest, t, notifications, selectedConfig]);

	const prepareMsTeamsRequest = useCallback(
		() => ({
			webhook_url: selectedConfig?.webhook_url || '',
			name: selectedConfig?.name || '',
			send_resolved: selectedConfig?.send_resolved || false,
			text: selectedConfig?.text || '',
			title: selectedConfig?.title || '',
			id,
		}),
		[id, selectedConfig],
	);

	const onMsTeamsEditHandler = useCallback(async () => {
		setSavingState(true);

		if (selectedConfig?.webhook_url === '') {
			notifications.error({
				message: 'Error',
				description: t('webhook_url_required'),
			});
			setSavingState(false);
			return { status: 'failed', statusMessage: t('webhook_url_required') };
		}

		const response = await editMsTeamsApi(prepareMsTeamsRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: t('channel_edit_done'),
			});

			history.replace(ROUTES.ALL_CHANNELS);
			return { status: 'success', statusMessage: t('channel_edit_done') };
		}
		notifications.error({
			message: 'Error',
			description: response.error || t('channel_edit_failed'),
		});

		setSavingState(false);
		return {
			status: 'failed',
			statusMessage: response.error || t('channel_edit_failed'),
		};
	}, [prepareMsTeamsRequest, t, notifications, selectedConfig]);

	const onSaveHandler = useCallback(
		async (value: ChannelType) => {
			let result;
			if (value === ChannelType.Slack) {
				result = await onSlackEditHandler();
			} else if (value === ChannelType.Webhook) {
				result = await onWebhookEditHandler();
			} else if (value === ChannelType.Pagerduty) {
				result = await onPagerEditHandler();
			} else if (value === ChannelType.MsTeams) {
				result = await onMsTeamsEditHandler();
			} else if (value === ChannelType.Opsgenie) {
				result = await onOpsgenieEditHandler();
			} else if (value === ChannelType.Email) {
				result = await onEmailEditHandler();
			}
			logEvent('Alert Channel: Save channel', {
				type: value,
				sendResolvedAlert: selectedConfig?.send_resolved,
				name: selectedConfig?.name,
				new: 'false',
				status: result?.status,
				statusMessage: result?.statusMessage,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			onSlackEditHandler,
			onWebhookEditHandler,
			onPagerEditHandler,
			onMsTeamsEditHandler,
			onOpsgenieEditHandler,
			onEmailEditHandler,
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
						if (request) response = await testMsTeamsApi(request);
						break;
					case ChannelType.Opsgenie:
						request = prepareOpsgenieRequest();
						if (request) response = await testOpsgenie(request);
						break;
					case ChannelType.Email:
						request = prepareEmailRequest();
						if (request) response = await testEmail(request);
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
				logEvent('Alert Channel: Test notification', {
					type: channelType,
					sendResolvedAlert: selectedConfig?.send_resolved,
					name: selectedConfig?.name,
					new: 'false',
					status:
						response && response.statusCode === 200 ? 'Test success' : 'Test failed',
				});
			} catch (error) {
				notifications.error({
					message: 'Error',
					description: t('channel_test_failed'),
				});
			}
			setTestingState(false);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			t,
			prepareWebhookRequest,
			preparePagerRequest,
			prepareSlackRequest,
			prepareMsTeamsRequest,
			prepareOpsgenieRequest,
			prepareEmailRequest,
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
				testingState,
				savingState,
				title: t('page_title_edit'),
				initialValue,
				editing: true,
			}}
		/>
	);
}

interface EditAlertChannelsProps {
	initialValue: {
		[x: string]: unknown;
	};
}

export default EditAlertChannels;
