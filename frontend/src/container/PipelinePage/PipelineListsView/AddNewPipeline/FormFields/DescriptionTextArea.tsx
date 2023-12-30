import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import { ProcessorFormField } from '../../AddNewProcessor/config';
import { FormLabelStyle } from '../styles';

function DescriptionTextArea({
	fieldData,
}: DescriptionTextAreaProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<Form.Item
			required={false}
			name={fieldData.name}
			label={<FormLabelStyle>{fieldData.fieldName}</FormLabelStyle>}
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
