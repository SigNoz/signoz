import { Form, Input } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { normalizeEmail } from 'utils/emailUtils';

import { EmailChannel } from '../../CreateAlertChannels/config';

function EmailForm({ setSelectedConfig }: EmailFormProps): JSX.Element {
	const { t } = useTranslation('channels');

	const handleInputChange = (field: string) => (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	): void => {
		const value =
			field === 'to' ? normalizeEmail(event.target.value) : event.target.value;
		setSelectedConfig((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	return (
		<>
			<Form.Item
				name="to"
				help={t('help_email_to')}
				label={t('field_email_to')}
				required
			>
				<Input
					onChange={handleInputChange('to')}
					placeholder={t('placeholder_email_to')}
					data-testid="email-to-textbox"
				/>
			</Form.Item>

			{/* <Form.Item name="html" label={t('field_email_html')} required>
				<TextArea
					rows={4}
					onChange={handleInputChange('html')}
					placeholder={t('placeholder_email_html')}
				/>
			</Form.Item> */}
		</>
	);
}

interface EmailFormProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<EmailChannel>>>;
}

export default EmailForm;
