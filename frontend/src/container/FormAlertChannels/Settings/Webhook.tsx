import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@signozhq/ui/input';
import { Form } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';

function WebhookSettings({ setSelectedConfig }: WebhookProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item
				name="url"
				label={t('field_webhook_url')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_webhook_url')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							url: event.target.value,
						}));
					}}
					data-testid="webhook-url-textbox"
				/>
			</Form.Item>
			<Form.Item
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
					data-testid="webhook-username-textbox"
				/>
			</Form.Item>
			<Form.Item
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
					data-testid="webhook-password-textbox"
				/>
			</Form.Item>
			<Form.Item
				name="bearerToken"
				label={t('field_webhook_bearer_token')}
				help={t('help_webhook_bearer_token')}
			>
				<Input
					type="password"
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							bearerToken: event.target.value,
						}));
					}}
					data-testid="webhook-bearer-token-textbox"
				/>
			</Form.Item>
		</>
	);
}

interface WebhookProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<ChannelSpecFormValues>>>;
}

export default WebhookSettings;
