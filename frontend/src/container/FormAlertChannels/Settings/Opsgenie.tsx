import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import { OpsgenieChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

function OpsgenieForm({ setSelectedConfig }: OpsgenieFormProps): JSX.Element {
	const { t } = useTranslation('channels');
	return (
		<>
			<Form.Item name="api_key" label={t('field_opsgenie_api_key')} required>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							api_key: event.target.value,
						}));
					}}
				/>
			</Form.Item>

			<Form.Item
				name="description"
				help={t('help_opsgenie_description')}
				label={t('field_opsgenie_description')}
				required
			>
				<TextArea
					rows={4}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							description: event.target.value,
						}))
					}
					placeholder={t('placeholder_opsgenie_description')}
				/>
			</Form.Item>
		</>
	);
}

interface OpsgenieFormProps {
	setSelectedConfig: React.Dispatch<
		React.SetStateAction<Partial<OpsgenieChannel>>
	>;
}

export default OpsgenieForm;
