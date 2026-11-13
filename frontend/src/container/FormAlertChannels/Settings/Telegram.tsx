import { useTranslation } from 'react-i18next';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { Input as AntdInput } from 'antd';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import FormCard from '../FormCard';
import FormField from '../FormField';

const { TextArea } = AntdInput;

/**
 * The API models the chat and the topic as integers. An empty or half-typed box
 * has to become `undefined`, not `NaN`: `omitBlank` keeps `NaN`, which
 * serialises as `null` and the API rejects it. react-hook-form also runs this
 * over the value already in the form, which arrives as a number, not a string.
 */
const asOptionalNumber = (value: unknown): number | undefined => {
	if (typeof value === 'number') {
		return Number.isNaN(value) ? undefined : value;
	}

	if (typeof value !== 'string' || value.trim() === '') {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isNaN(parsed) ? undefined : parsed;
};

interface TelegramSettingsProps {
	readOnly: boolean;
}

function TelegramSettings({ readOnly }: TelegramSettingsProps): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ChannelSpecFormValues>();

	return (
		<>
			<FormCard title={t('section_connection')}>
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="secondary"
					as="p"
					marginBottom={8}
					textOverflow="wrap"
					testId="telegram-tip"
				>
					{t('telegram_tip')}{' '}
					<Typography.Link
						variant="paragraph"
						size="base"
						weight="regular"
						textOverflow="wrap"
						href="https://core.telegram.org/bots#how-do-i-create-a-bot"
						target="_blank"
					>
						{t('telegram_tip_link')}
					</Typography.Link>
				</Typography>

				<FormField
					label={t('field_telegram_bot_token')}
					tooltip={t('tooltip_telegram_bot_token')}
					error={errors.botToken?.message}
					required
				>
					<Input
						{...register('botToken')}
						aria-required
						type="password"
						testId="telegram-bot-token-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_telegram_chat_id')}
					tooltip={t('tooltip_telegram_chat_id')}
					error={errors.chatId?.message}
					required
				>
					<Input
						{...register('chatId', { setValueAs: asOptionalNumber })}
						aria-required
						type="number"
						placeholder={t('placeholder_telegram_chat_id')}
						testId="telegram-chat-id-textbox"
					/>
				</FormField>

				<FormField
					label={t('field_telegram_message_thread_id')}
					tooltip={t('tooltip_telegram_message_thread_id')}
					error={errors.messageThreadId?.message}
				>
					<Input
						{...register('messageThreadId', { setValueAs: asOptionalNumber })}
						type="number"
						testId="telegram-message-thread-id-textbox"
					/>
				</FormField>
			</FormCard>

			<FormCard title={t('section_message')}>
				<FormField
					label={t('field_telegram_title')}
					tooltip={t('tooltip_telegram_title')}
					error={errors.title?.message}
				>
					<Controller
						control={control}
						name="title"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={2}
								data-testid="telegram-title-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
								disabled={readOnly}
							/>
						)}
					/>
				</FormField>

				<FormField
					label={t('field_telegram_message')}
					tooltip={t('tooltip_telegram_message')}
					error={errors.message?.message}
				>
					<Controller
						control={control}
						name="message"
						render={({ field }): JSX.Element => (
							<TextArea
								rows={6}
								data-testid="telegram-message-textarea"
								value={(field.value as string) ?? ''}
								onChange={field.onChange}
								disabled={readOnly}
							/>
						)}
					/>
				</FormField>
			</FormCard>

			<FormCard title={t('section_advanced')}>
				<FormField
					label={t('field_telegram_api_url')}
					tooltip={t('tooltip_telegram_api_url')}
					error={errors.apiUrl?.message}
				>
					<Input {...register('apiUrl')} testId="telegram-api-url-textbox" />
				</FormField>

				<FormField
					label={t('field_telegram_disable_notifications')}
					tooltip={t('tooltip_telegram_disable_notifications')}
				>
					<Controller
						control={control}
						name="disableNotifications"
						render={({ field }): JSX.Element => (
							<Switch
								color="primary"
								textPlacement="right"
								testId="telegram-disable-notifications-switch"
								value={!!field.value}
								onChange={field.onChange}
								disabled={readOnly}
								disabledTooltip={undefined}
							/>
						)}
					/>
				</FormField>
			</FormCard>
		</>
	);
}

export default TelegramSettings;
