import { Form, notification } from 'antd';
import editSlackApi from 'api/channels/editSlack';
import editWebhookApi from 'api/channels/editWebhook';
import testSlackApi from 'api/channels/testSlack';
import testWebhookApi from 'api/channels/testWebhook';
import ROUTES from 'constants/routes';
import {
	ChannelType,
	SlackChannel,
	SlackType,
	WebhookChannel,
	WebhookType,
} from 'container/CreateAlertChannels/config';
import FormAlertChannels from 'container/FormAlertChannels';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

function EditAlertChannels({
	initialValue,
}: EditAlertChannelsProps): JSX.Element {
	// init namespace for translations
	const { t } = useTranslation('channels');

	const [formInstance] = Form.useForm();
	const [selectedConfig, setSelectedConfig] = useState<
		Partial<SlackChannel & WebhookChannel>
	>({
		...initialValue,
	});
	const [savingState, setSavingState] = useState<boolean>(false);
	const [testingState, setTestingState] = useState<boolean>(false);
	const [notifications, NotificationElement] = notification.useNotification();
	const { id } = useParams<{ id: string }>();

	const [type, setType] = useState<ChannelType>(
		initialValue?.type ? (initialValue.type as ChannelType) : SlackType,
	);

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
			id,
		};
	}, [id, selectedConfig]);

	const onSlackEditHandler = useCallback(async () => {
		setSavingState(true);

		if (selectedConfig?.api_url === '') {
			notifications.error({
				message: 'Error',
				description: t('webhook_url_required'),
			});
			setSavingState(false);
			return;
		}

		const response = await editSlackApi(prepareSlackRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: t('channel_edit_done'),
			});

			setTimeout(() => {
				history.replace(ROUTES.SETTINGS);
			}, 2000);
		} else {
			notifications.error({
				message: 'Error',
				description: response.error || t('channel_edit_failed'),
			});
		}
		setSavingState(false);
	}, [prepareSlackRequest, t, notifications, selectedConfig]);

	const prepareWebhookRequest = useCallback(() => {
		const { name, username, password } = selectedConfig;
		return {
			api_url: selectedConfig?.api_url || '',
			name: name || '',
			send_resolved: true,
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
			return;
		}

		if (username && (!password || password === '')) {
			showError(t('username_no_password'));
			setSavingState(false);
			return;
		}

		const response = await editWebhookApi(prepareWebhookRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: t('channel_edit_done'),
			});

			setTimeout(() => {
				history.replace(ROUTES.SETTINGS);
			}, 2000);
		} else {
			showError(response.error || t('channel_edit_failed'));
		}
		setSavingState(false);
	}, [prepareWebhookRequest, t, notifications, selectedConfig]);

	const onSaveHandler = useCallback(
		(value: ChannelType) => {
			if (value === SlackType) {
				onSlackEditHandler();
			} else if (value === WebhookType) {
				onWebhookEditHandler();
			}
		},
		[onSlackEditHandler, onWebhookEditHandler],
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
							description: t('test_unsupported'),
						});
						setTestingState(false);
						return;
				}

				if (response.statusCode === 200) {
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
					description: t('channel_test_failed'),
				});
			}
			setTestingState(false);
		},
		[prepareWebhookRequest, t, prepareSlackRequest, notifications],
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
				NotificationElement,
				title: t('page_title_edit'),
				initialValue,
				nameDisable: true,
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
