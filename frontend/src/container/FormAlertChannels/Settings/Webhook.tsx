import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

function WebhookSettings(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	return (
		<>
			<FormCard title={t('section_connection')}>
				<FormField
					label={t('field_webhook_url')}
					tooltip={t('tooltip_webhook_url')}
					error={errors.url?.message}
					required
				>
					<Input
						{...register('url')}
						aria-required
						data-testid="webhook-url-textbox"
					/>
				</FormField>
				<FormField
					label={t('field_webhook_username')}
					help={t('help_webhook_username')}
					error={errors.username?.message}
				>
					<Input {...register('username')} data-testid="webhook-username-textbox" />
				</FormField>
				<FormField
					label="Password (optional)"
					help={t('help_webhook_password')}
					error={errors.password?.message}
				>
					<Input
						{...register('password')}
						type="password"
						data-testid="webhook-password-textbox"
					/>
				</FormField>
				<FormField
					label={t('field_webhook_bearer_token')}
					help={t('help_webhook_bearer_token')}
					error={errors.bearerToken?.message}
				>
					<Input
						{...register('bearerToken')}
						type="password"
						data-testid="webhook-bearer-token-textbox"
					/>
				</FormField>
			</FormCard>
		</>
	);
}

export default WebhookSettings;
