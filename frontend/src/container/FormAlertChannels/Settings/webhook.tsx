import { Input } from 'antd';
import FormItem from 'antd/lib/form/FormItem';
import React from 'react';

import { WebhookChannel } from '../../CreateAlertChannels/config';

function WebhookSettings({ setSelectedConfig }: WebhookProps): JSX.Element {
	return (
		<>
			<FormItem name="api_url" label="Webhook URL">
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
				label="User Name (optional)"
				help="Leave empty for bearer auth or when authentication is not necessary."
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
				help="Specify a password or bearer token"
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
