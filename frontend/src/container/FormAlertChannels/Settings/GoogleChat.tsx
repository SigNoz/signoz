import { Form, Input } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { GoogleChatChannel } from '../../CreateAlertChannels/config';

function GoogleChatSettings({
	setSelectedConfig,
}: GoogleChatWebhookProps): JSX.Element {
	const { t } = useTranslation('channels');

	return (
		<Form.Item name="api_url" label={t('Webhook URL')}>
			<Input
				placeholder="https://chat.googleapis.com/v1/spaces/..."
				onChange={(event): void => {
					setSelectedConfig((value) => ({
						...value,
						api_url: event.target.value,
					}));
				}}
			/>
		</Form.Item>
	);
}

interface GoogleChatWebhookProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<GoogleChatChannel>>>;
}

export default GoogleChatSettings;
