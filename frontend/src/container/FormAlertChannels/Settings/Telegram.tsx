import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';

/**
 * The API models the chat and the topic as integers, so a half-typed or cleared
 * box has to send nothing rather than NaN, which would serialise as null and be
 * rejected.
 */
const toNumber = (value: string): number | undefined => {
	const parsed = Number(value);
	return value.trim() === '' || Number.isNaN(parsed) ? undefined : parsed;
};

function TelegramSettings({
	setSelectedConfig,
	initialDisableNotifications,
}: TelegramProps): JSX.Element {
	const { t } = useTranslation('channels');

	const update = (patch: Partial<ChannelSpecFormValues>): void =>
		setSelectedConfig((value) => ({ ...value, ...patch }));

	return (
		<>
			<Typography.Text
				color="muted"
				size="sm"
				testId="telegram-tip"
				style={{ display: 'block', marginBottom: 16 }}
			>
				{t('telegram_tip')}{' '}
				<Typography.Link
					href="https://core.telegram.org/bots#how-do-i-create-a-bot"
					target="_blank"
					rel="noopener noreferrer"
				>
					{t('telegram_tip_link')}
				</Typography.Link>
			</Typography.Text>

			<Form.Item
				name="botToken"
				label={t('field_telegram_bot_token')}
				help={t('help_telegram_bot_token')}
				required
			>
				<Input
					type="password"
					onChange={(event): void => update({ botToken: event.target.value })}
					data-testid="telegram-bot-token-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="chatId"
				label={t('field_telegram_chat_id')}
				help={t('help_telegram_chat_id')}
				required
			>
				<Input
					type="number"
					placeholder={t('placeholder_telegram_chat_id')}
					onChange={(event): void =>
						update({ chatId: toNumber(event.target.value) })
					}
					data-testid="telegram-chat-id-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="messageThreadId"
				label={t('field_telegram_message_thread_id')}
				help={t('help_telegram_message_thread_id')}
			>
				<Input
					type="number"
					onChange={(event): void =>
						update({ messageThreadId: toNumber(event.target.value) })
					}
					data-testid="telegram-message-thread-id-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="title"
				label={t('field_telegram_title')}
				help={t('help_telegram_title')}
			>
				<Input.TextArea
					rows={2}
					onChange={(event): void => update({ title: event.target.value })}
					data-testid="telegram-title-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="message"
				label={t('field_telegram_message')}
				help={t('help_telegram_message')}
			>
				<Input.TextArea
					rows={6}
					onChange={(event): void => update({ message: event.target.value })}
					data-testid="telegram-message-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="apiUrl"
				label={t('field_telegram_api_url')}
				help={t('help_telegram_api_url')}
			>
				<Input
					onChange={(event): void => update({ apiUrl: event.target.value })}
					data-testid="telegram-api-url-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="disableNotifications"
				label={t('field_telegram_disable_notifications')}
				help={t('help_telegram_disable_notifications')}
			>
				<Switch
					defaultValue={initialDisableNotifications}
					testId="telegram-disable-notifications-switch"
					onChange={(value): void => update({ disableNotifications: value })}
				/>
			</Form.Item>
		</>
	);
}

interface TelegramProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<ChannelSpecFormValues>>>;
	initialDisableNotifications?: boolean;
}

TelegramSettings.defaultProps = {
	initialDisableNotifications: undefined,
};

export default TelegramSettings;
