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
import { useParams } from 'react-router-dom';

function EditAlertChannels({
	initialValue,
}: EditAlertChannelsProps): JSX.Element {
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
				description: 'Webhook URL is mandatory',
			});
			setSavingState(false);
			return;
		}

		const response = await editSlackApi(prepareSlackRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: 'Channels Edited Successfully',
			});

			setTimeout(() => {
				history.replace(ROUTES.SETTINGS);
			}, 2000);
		} else {
			notifications.error({
				message: 'Error',
				description: response.error || 'error while updating the Channels',
			});
		}
		setSavingState(false);
	}, [prepareSlackRequest, notifications, selectedConfig]);

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
			showError('Webhook URL is mandatory');
			setSavingState(false);
			return;
		}

		if (username && (!password || password === '')) {
			showError('Please enter a password');
			setSavingState(false);
			return;
		}

		const response = await editWebhookApi(prepareWebhookRequest());

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: 'Channels Edited Successfully',
			});

			setTimeout(() => {
				history.replace(ROUTES.SETTINGS);
			}, 2000);
		} else {
			showError(response.error || 'error while updating the Channels');
		}
		setSavingState(false);
	}, [prepareWebhookRequest, notifications, selectedConfig]);

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
				testingState,
				savingState,
				NotificationElement,
				title: 'Edit Notification Channels',
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
