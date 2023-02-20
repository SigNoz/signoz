import { Form, Input } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ProcessorFormField } from '../../AddNewProcessor/config';
import { FormLabelStyle } from '../styles';

function NameInput({ fieldData }: NameInputProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<Form.Item
			required={false}
			label={<FormLabelStyle>{fieldData.fieldName}</FormLabelStyle>}
			key={fieldData.id}
			rules={[
				{
					required: true,
				},
			]}
			name={fieldData.name}
		>
			<Input name={fieldData.name} placeholder={t(fieldData.placeholder)} />
		</Form.Item>
	);
}

interface NameInputProps {
	fieldData: ProcessorFormField;
}
export default NameInput;
