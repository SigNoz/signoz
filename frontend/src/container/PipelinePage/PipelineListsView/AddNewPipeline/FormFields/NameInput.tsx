import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import { ProcessorFormField } from '../../AddNewProcessor/config';
import { formValidationRules } from '../../config';
import { FormLabelStyle } from '../styles';

function NameInput({ fieldData }: NameInputProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<Form.Item
			required={false}
			label={<FormLabelStyle>{fieldData.fieldName}</FormLabelStyle>}
			key={fieldData.id}
			rules={formValidationRules}
			name={fieldData.name}
		>
			<Input placeholder={t(fieldData.placeholder)} />
		</Form.Item>
	);
}

interface NameInputProps {
	fieldData: ProcessorFormField;
}
export default NameInput;
