import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { Input as AntdInput } from 'antd';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';
import SlackActions from './SlackActions';
import SlackFields from './SlackFields';

const { TextArea } = AntdInput;

function Slack(): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	return (
		<>
			<FormCard title={t('section_connection')}>
				<FormField
					label={t('field_webhook_url')}
					tooltip={t('tooltip_slack_url')}
					error={errors.apiUrl?.message}
					required
				>
					<Input
						{...register('apiUrl')}
						aria-required
						data-testid="webhook-url-textbox"
					/>
				</FormField>

				<FormField
					help={t('slack_channel_help')}
					label={t('field_slack_recipient')}
					error={errors.channel?.message}
				>
					<Input {...register('channel')} data-testid="slack-channel-textbox" />
				</FormField>
			</FormCard>

			<FormCard title={t('section_message')}>
				<FormField label={t('field_slack_title')} error={errors.title?.message}>
					<Controller
						control={control}
						name="title"
						render={({ field }): JSX.Element => (
							<TextArea
								data-testid="title-textarea"
								rows={4}
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>

				<FormField
					label={t('field_slack_title_link')}
					error={errors.titleLink?.message}
				>
					<Input {...register('titleLink')} data-testid="title-link-textbox" />
				</FormField>

				<FormField
					label={t('field_slack_description')}
					error={errors.text?.message}
				>
					<Controller
						control={control}
						name="text"
						render={({ field }): JSX.Element => (
							<TextArea
								placeholder={t('placeholder_slack_description')}
								data-testid="description-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormField>
			</FormCard>

			<FormCard
				title={t('section_advanced')}
				description={t('description_slack_advanced')}
			>
				<FormField
					label={t('field_slack_color')}
					help={t('help_slack_color')}
					error={errors.color?.message}
				>
					<Input
						{...register('color')}
						placeholder={t('placeholder_slack_color')}
						data-testid="slack-color-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_slack_pretext')}
					help={t('help_slack_pretext')}
					error={errors.pretext?.message}
				>
					<Input {...register('pretext')} data-testid="slack-pretext-textbox" />
				</FormField>

				<FormField
					label={t('field_slack_fallback')}
					help={t('help_slack_fallback')}
					error={errors.fallback?.message}
				>
					<Input {...register('fallback')} data-testid="slack-fallback-textbox" />
				</FormField>

				<FormField label={t('field_slack_footer')} error={errors.footer?.message}>
					<Input {...register('footer')} data-testid="slack-footer-textbox" />
				</FormField>

				<SlackFields />

				<SlackActions />
			</FormCard>
		</>
	);
}

export default Slack;
