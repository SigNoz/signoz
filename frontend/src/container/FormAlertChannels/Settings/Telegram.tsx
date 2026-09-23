import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, InputNumber } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import { TelegramChannel } from '../../CreateAlertChannels/config';

function Telegram({ setSelectedConfig }: TelegramProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item
				name="bot_token"
				label={t('field_telegram_bot_token')}
				required
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_telegram_bot_token')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input.Password
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							bot_token: event.target.value,
						}));
					}}
					data-testid="telegram-bot-token-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="chat_id"
				label={t('field_telegram_chat_id')}
				required
				help={t('help_telegram_chat_id')}
			>
				<InputNumber
					style={{ width: '100%' }}
					onChange={(chatId): void => {
						setSelectedConfig((value) => ({
							...value,
							chat_id: typeof chatId === 'number' ? chatId : undefined,
						}));
					}}
					data-testid="telegram-chat-id-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="message_thread_id"
				label={t('field_telegram_message_thread_id')}
				help={t('help_telegram_message_thread_id')}
			>
				<InputNumber
					style={{ width: '100%' }}
					min={1}
					onChange={(threadId): void => {
						setSelectedConfig((value) => ({
							...value,
							message_thread_id: typeof threadId === 'number' ? threadId : undefined,
						}));
					}}
					data-testid="telegram-message-thread-id-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="message"
				label={t('field_telegram_message')}
				help={t('help_telegram_message')}
			>
				<Input.TextArea
					rows={6}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							message: event.target.value,
						}))
					}
					data-testid="telegram-message-textarea"
				/>
			</Form.Item>
		</>
	);
}

interface TelegramProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<TelegramChannel>>>;
}

export default Telegram;
