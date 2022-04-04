import { Form, notification } from 'antd';
import editPagerApi from 'api/channels/editPager';
import editSlackApi from 'api/channels/editSlack';
import editWebhookApi from 'api/channels/editWebhook';
import ROUTES from 'constants/routes';
import {
	ChannelType,
	PagerChannel,
	PagerType,
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
		Partial<SlackChannel & WebhookChannel & PagerChannel>
	>({
		...initialValue,
	});
	const [savingState, setSavingState] = useState<boolean>(false);
	const [notifications, NotificationElement] = notification.useNotification();
	const { id } = useParams<{ id: string }>();

	const [type, setType] = useState<ChannelType>(
		initialValue?.type ? (initialValue.type as ChannelType) : SlackType,
	);

	const onTypeChangeHandler = useCallback((value: string) => {
		setType(value as ChannelType);
	}, []);

	const onSlackEditHandler = useCallback(async () => {
		setSavingState(true);
		const response = await editSlackApi({
			api_url: selectedConfig?.api_url || '',
			channel: selectedConfig?.channel || '',
			name: selectedConfig?.name || '',
			send_resolved: true,
			text: selectedConfig?.text || '',
			title: selectedConfig?.title || '',
			id,
		});

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
	}, [selectedConfig, notifications, id]);

	const onWebhookEditHandler = useCallback(async () => {
		setSavingState(true);
		const { name, username, password } = selectedConfig;

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

		const response = await editWebhookApi({
			api_url: selectedConfig?.api_url || '',
			name: name || '',
			send_resolved: true,
			username,
			password,
			id,
		});

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
	}, [selectedConfig, notifications, id]);

	const onPagerEditHandler = useCallback(async () => {
		if (
			!selectedConfig ||
			selectedConfig?.name === '' ||
			selectedConfig?.routing_key === ''
		) {
			notifications.error({
				message: 'Error',
				description: 'unexpected inputs while updating the Channels.',
			});
			return;
		}

		setSavingState(true);
		const response = await editPagerApi({
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
			id,
		});

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
	}, [selectedConfig, notifications, id]);

	const onSaveHandler = useCallback(
		(value: ChannelType) => {
			if (value === SlackType) {
				onSlackEditHandler();
			} else if (value === WebhookType) {
				onWebhookEditHandler();
			} else if (value === PagerType) {
				onPagerEditHandler();
			}
		},
		[onSlackEditHandler, onWebhookEditHandler, onPagerEditHandler],
	);

	const onTestHandler = useCallback(() => {
		console.log('test');
	}, []);

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
				title: 'Edit Notification Channels',
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
