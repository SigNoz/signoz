import './styles.scss';

import { Form, Input, Select } from 'antd';
import { ModalFooterTitle } from 'container/PipelinePage/styles';
import { useTranslation } from 'react-i18next';

import { formValidationRules } from '../config';
import { processorFields, ProcessorFormField } from './config';
import CSVInput from './FormFields/CSVInput';
import { FormWrapper, PipelineIndexIcon, StyledSelect } from './styles';

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

	// Do not render display elements for hidden inputs.
	if (fieldData?.hidden) {
		return (
			<Form.Item
				name={fieldData.name}
				initialValue={fieldData.initialValue}
				dependencies={fieldData.dependencies || []}
				style={{ display: 'none' }}
			>
				<Input type="hidden" />
			</Form.Item>
		);
	}

	let inputField;
	if (fieldData?.options) {
		inputField = (
			<StyledSelect>
				{fieldData.options.map(({ value, label }) => (
					<Select.Option key={value + label} value={value}>
						{label}
					</Select.Option>
				))}
			</StyledSelect>
		);
	} else if (Array.isArray(fieldData?.initialValue)) {
		inputField = <CSVInput placeholder={t(fieldData.placeholder)} />;
	} else {
		inputField = <Input placeholder={t(fieldData.placeholder)} />;
	}

	return (
		<div
			className={
				fieldData?.compact
					? 'compact-processor-field-container'
					: 'processor-field-container'
			}
		>
			{!fieldData?.compact && (
				<PipelineIndexIcon size="small">
					{Number(fieldData.id) + 1}
				</PipelineIndexIcon>
			)}
			<FormWrapper>
				<Form.Item
					required={false}
					label={<ModalFooterTitle>{fieldData.fieldName}</ModalFooterTitle>}
					name={fieldData.name}
					initialValue={fieldData.initialValue}
					rules={fieldData.rules ? fieldData.rules : formValidationRules}
					dependencies={fieldData.dependencies || []}
				>
					{inputField}
				</Form.Item>
			</FormWrapper>
		</div>
	);
}

interface ProcessorFieldInputProps {
	fieldData: ProcessorFormField;
}

function ProcessorForm({ processorType }: ProcessorFormProps): JSX.Element {
	return (
		<div className="processor-form-container">
			{processorFields[processorType]?.map((fieldData: ProcessorFormField) => (
				<ProcessorFieldInput
					key={fieldData.name + String(fieldData.initialValue)}
					fieldData={fieldData}
				/>
			))}
		</div>
	);
}

interface ProcessorFormProps {
	processorType: string;
}

export default ProcessorForm;
