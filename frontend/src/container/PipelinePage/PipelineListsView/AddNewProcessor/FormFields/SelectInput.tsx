import { Form, Select } from 'antd';
import { ModalFooterTitle } from 'container/PipelinePage/styles';

import { formValidationRules } from '../../config';
import { ProcessorFormField } from '../config';
import {
	Container,
	FormWrapper,
	PipelineIndexIcon,
	StyledSelect,
} from '../styles';

export type SelectInputOption = {
	value: string;
	label: string;
};

function SelectInput({ fieldData }: SelectInputProps): JSX.Element {
	if (!fieldData.options) {
		throw new Error(`Invalid SelectInput field data: ${fieldData}`);
	}

	return (
		<Container>
			<PipelineIndexIcon size="small">
				{Number(fieldData.id) + 1}
			</PipelineIndexIcon>
			<FormWrapper>
				<Form.Item
					required={false}
					label={<ModalFooterTitle>{fieldData.fieldName}</ModalFooterTitle>}
					key={fieldData.id}
					name={fieldData.name}
					initialValue={fieldData.initialValue}
					rules={fieldData.rules ? fieldData.rules : formValidationRules}
					dependencies={fieldData.dependencies || []}
				>
					<StyledSelect>
						{fieldData.options.map(({ value, label }) => (
							<Select.Option key={value + label} value={value}>
								{label}
							</Select.Option>
						))}
					</StyledSelect>
				</Form.Item>
			</FormWrapper>
		</Container>
	);
}

interface SelectInputProps {
	fieldData: ProcessorFormField;
}
export default SelectInput;
