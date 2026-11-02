import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { Input as AntdInput } from 'antd';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

const { TextArea } = AntdInput;

function MattermostSettings(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	return (
		<>
			<FormCard title={t('section_connection')}>
				<Typography.Text
					color="muted"
					size="sm"
					testId="mattermost-tip"
					style={{ display: 'block', marginBottom: 16 }}
				>
					{t('mattermost_tip')}{' '}
					<Typography.Link
						href="https://developers.mattermost.com/integrate/webhooks/incoming/"
						target="_blank"
						rel="noopener noreferrer"
					>
						{t('mattermost_tip_link')}
					</Typography.Link>
				</Typography.Text>

				<FormField
					label={t('field_webhook_url')}
					tooltip={t('tooltip_mattermost_url')}
					error={errors.webhookUrl?.message}
					required
				>
					<Input
						{...register('webhookUrl')}
						aria-required
						data-testid="webhook-url-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_mattermost_channel')}
					tooltip={t('tooltip_mattermost_channel')}
					error={errors.channel?.message}
				>
					<Input {...register('channel')} data-testid="mattermost-channel-textbox" />
				</FormField>
			</FormCard>

			<FormCard title={t('section_message')}>
				<FormField
					label={t('field_mattermost_text')}
					tooltip={t('tooltip_mattermost_text')}
					error={errors.text?.message}
				>
					<Controller
						control={control}
						name="text"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={6}
								data-testid="mattermost-text-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>
			</FormCard>

			<FormCard title={t('section_advanced')}>
				<FormField
					label={t('field_mattermost_username')}
					tooltip={t('tooltip_mattermost_username')}
					error={errors.username?.message}
				>
					<Input
						{...register('username')}
						data-testid="mattermost-username-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_mattermost_icon_url')}
					tooltip={t('tooltip_mattermost_icon_url')}
					error={errors.iconUrl?.message}
				>
					<Input
						{...register('iconUrl')}
						data-testid="mattermost-icon-url-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_mattermost_icon_emoji')}
					tooltip={t('tooltip_mattermost_icon_emoji')}
					error={errors.iconEmoji?.message}
				>
					<Input
						{...register('iconEmoji')}
						data-testid="mattermost-icon-emoji-textbox"
					/>
				</FormField>
			</FormCard>
		</>
	);
}

export default MattermostSettings;
