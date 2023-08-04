import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';

import { ProcessorFormField } from '../../AddNewProcessor/config';
import { formValidationRules } from '../../config';
import { FormLabelStyle } from '../styles';

function FilterSearch({ fieldData }: FilterSearchProps): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<Form.Item
			required={false}
			label={<FormLabelStyle>{fieldData.fieldName}</FormLabelStyle>}
			key={fieldData.id}
			rules={formValidationRules}
			name={fieldData.name}
		>
			<Input.Search
				id={fieldData.id.toString()}
				name={fieldData.name}
				placeholder={t(fieldData.placeholder)}
				allowClear
			/>
		</Form.Item>
	);
}
interface FilterSearchProps {
	fieldData: ProcessorFormField;
}
export default FilterSearch;
