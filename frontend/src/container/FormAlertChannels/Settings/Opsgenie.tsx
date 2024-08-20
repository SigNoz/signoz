import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import { OpsgenieChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

function OpsgenieForm({ setSelectedConfig }: OpsgenieFormProps): JSX.Element {
	const { t } = useTranslation('channels');

	const handleInputChange = (field: string) => (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	): void => {
		setSelectedConfig((value) => ({
			...value,
			[field]: event.target.value,
		}));
	};

	return (
		<>
			<Form.Item name="api_key" label={t('field_opsgenie_api_key')} required>
				<Input
					onChange={handleInputChange('api_key')}
					data-testid="opsgenie-api-key-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="message"
				help={t('help_opsgenie_message')}
				label={t('field_opsgenie_message')}
				required
			>
				<TextArea
					rows={4}
					onChange={handleInputChange('message')}
					placeholder={t('placeholder_opsgenie_message')}
					data-testid="opsgenie-message-textarea"
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
					onChange={handleInputChange('description')}
					placeholder={t('placeholder_opsgenie_description')}
					data-testid="opsgenie-description-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="priority"
				help={t('help_opsgenie_priority')}
				label={t('field_opsgenie_priority')}
				required
			>
				<TextArea
					rows={4}
					onChange={handleInputChange('priority')}
					placeholder={t('placeholder_opsgenie_priority')}
					data-testid="opsgenie-priority-textarea"
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
