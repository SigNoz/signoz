import { useTranslation } from 'react-i18next';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { RadioGroup } from '@signozhq/ui/radio-group';

import {
	ChannelFormValues,
	WebhookAuth,
} from '../../CreateAlertChannels/types';
import { webhookAuthOf } from '../../CreateAlertChannels/utils';
import FormCard from '../FormCard';
import FormField from '../FormField';

import styles from './Webhook.module.scss';

function WebhookSettings(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ChannelFormValues>();
	const [webhookAuth, username, password, bearerToken] = useWatch({
		control,
		name: ['webhookAuth', 'username', 'password', 'bearerToken'],
	});
	const auth = webhookAuthOf({ webhookAuth, username, password, bearerToken });

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
				<FormField label={t('field_webhook_auth')}>
					<Controller
						control={control}
						name="webhookAuth"
						render={({ field }): JSX.Element => (
							<div className={styles.auth}>
								<RadioGroup
									color="primary"
									aria-label={t('field_webhook_auth')}
									value={auth}
									onChange={field.onChange}
									testId="webhook-auth-radio"
									items={[
										{
											value: WebhookAuth.none,
											label: t('option_webhook_auth_none'),
										},
										{
											value: WebhookAuth.basic,
											label: t('option_webhook_auth_basic'),
										},
										{
											value: WebhookAuth.bearer,
											label: t('option_webhook_auth_bearer'),
										},
									]}
								/>
							</div>
						)}
					/>
				</FormField>
				{auth === WebhookAuth.basic && (
					<>
						<FormField
							label={t('field_webhook_username')}
							error={errors.username?.message}
						>
							<Input
								{...register('username')}
								data-testid="webhook-username-textbox"
							/>
						</FormField>
						<FormField
							label={t('field_webhook_password')}
							error={errors.password?.message}
						>
							<Input
								{...register('password')}
								type="password"
								data-testid="webhook-password-textbox"
							/>
						</FormField>
					</>
				)}
				{auth === WebhookAuth.bearer && (
					<FormField
						label={t('field_webhook_bearer_token')}
						help={t('help_webhook_bearer_token')}
						error={errors.bearerToken?.message}
						required
					>
						<Input
							{...register('bearerToken')}
							type="password"
							aria-required
							data-testid="webhook-bearer-token-textbox"
						/>
					</FormField>
				)}
			</FormCard>
		</>
	);
}

export default WebhookSettings;
