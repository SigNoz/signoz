import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';

import { ProcessorFormField } from '../../AddNewProcessor/config';

function DescriptionTextArea({
	fieldData,
}: DescriptionTextAreaProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<Form.Item
			required={false}
			name={fieldData.name}
			label={fieldData.fieldName}
			key={fieldData.id}
		>
			<Input.TextArea rows={3} placeholder={t(fieldData.placeholder)} />
		</Form.Item>
	);
}

interface DescriptionTextAreaProps {
	fieldData: ProcessorFormField;
}
export default DescriptionTextArea;
