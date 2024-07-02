import { Form, Input } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { TelegramChannel } from '../../CreateAlertChannels/config';

function TelegramProps({ setSelectedConfig }: TelegramFormProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<>
			<Form.Item name="api_key" label={t('field_telegram_api_key')}>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							api_key: event.target.value,
						}));
					}}
				/>
			</Form.Item>
			<Form.Item name="chat_id" label={t('field_telegram_chat_id')}>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							chat_id: event.target.value,
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
