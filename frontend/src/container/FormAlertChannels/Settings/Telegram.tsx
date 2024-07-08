import { Form, Input } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { TelegramChannel } from '../../CreateAlertChannels/config';

function TelegramProps({ setSelectedConfig }: TelegramFormProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item name="token" label={t('field_telegram_api_key')}>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							token: event.target.value,
						}));
					}}
				/>
			</Form.Item>
			<Form.Item name="chat" label={t('field_telegram_chat_id')}>
				<Input
					onChange={(event): void => {
						const num = parseInt(event.target.value, 10);
						if (Number.isNaN(num)) {
							return;
						}
						setSelectedConfig((value) => ({
							...value,
							chat: num,
						}));
					}}
				/>
			</Form.Item>
			<Form.Item name="message" label={t('field_telegram_message')}>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							message: event.target.value,
						}));
					}}
				/>
			</Form.Item>
		</>
	);
}

interface TelegramFormProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<TelegramChannel>>>;
}

export default TelegramProps;
