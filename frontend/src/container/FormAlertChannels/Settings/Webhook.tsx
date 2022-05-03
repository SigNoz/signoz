import { Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { WebhookChannel } from '../../CreateAlertChannels/config';

function WebhookSettings({ setSelectedConfig }: WebhookProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<FormItem name="api_url" label={t('field_webhook_url')}>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							api_url: event.target.value,
						}));
					}}
				/>
			</FormItem>
			<FormItem
				name="username"
				label={t('field_webhook_username')}
				help={t('help_webhook_username')}
			>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							username: event.target.value,
						}));
					}}
				/>
			</FormItem>
			<FormItem
				name="password"
				label="Password (optional)"
				help={t('help_webhook_password')}
			>
				<Input
					type="password"
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							password: event.target.value,
						}));
					}}
				/>
			</FormItem>
		</>
	);
}

interface WebhookProps {
	setSelectedConfig: React.Dispatch<
		React.SetStateAction<Partial<WebhookChannel>>
	>;
}

export default WebhookSettings;
