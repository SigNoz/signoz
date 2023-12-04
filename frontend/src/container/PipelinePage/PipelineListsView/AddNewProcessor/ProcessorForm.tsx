import { Form, Input, Select } from 'antd';
import { ModalFooterTitle } from 'container/PipelinePage/styles';
import { useTranslation } from 'react-i18next';

import { formValidationRules } from '../config';
import { processorFields, ProcessorFormField } from './config';
import {
	Container,
	FormWrapper,
	PipelineIndexIcon,
	StyledSelect,
} from './styles';

function ProcessorFieldInput({
	fieldData,
}: ProcessorFieldInputProps): JSX.Element | null {
	const { t } = useTranslation('pipeline');

	// Watch form values so we can evaluate shouldRender on
	// conditional fields when form values are updated.
	const form = Form.useFormInstance();
	Form.useWatch(fieldData?.dependencies || [], form);

	if (fieldData.shouldRender && !fieldData.shouldRender(form)) {
		return null;
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
					{fieldData?.options ? (
						<StyledSelect>
							{fieldData.options.map(({ value, label }) => (
								<Select.Option key={value + label} value={value}>
									{label}
								</Select.Option>
							))}
						</StyledSelect>
					) : (
						<Input placeholder={t(fieldData.placeholder)} />
					)}
				</Form.Item>
			</FormWrapper>
		</Container>
	);
}

interface ProcessorFieldInputProps {
	fieldData: ProcessorFormField;
}

function ProcessorForm({ processorType }: ProcessorFormProps): JSX.Element {
	return (
		<div>
			{processorFields[processorType]?.map((fieldData: ProcessorFormField) => (
				<ProcessorFieldInput key={fieldData.id} fieldData={fieldData} />
			))}
		</div>
	);
}

interface ProcessorFormProps {
	processorType: string;
}

export default ProcessorForm;
