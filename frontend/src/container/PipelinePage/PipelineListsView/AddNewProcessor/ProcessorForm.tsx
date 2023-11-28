import { Form } from 'antd';
import { useWatch } from 'antd/es/form/Form';

import { processorFields, ProcessorFormField } from './config';
import NameInput from './FormFields/NameInput';
import SelectInput from './FormFields/SelectInput';

function ProcessorFieldInput({
	fieldData,
}: ProcessorFieldInputProps): JSX.Element | null {
	const form = Form.useFormInstance();
	useWatch([], form);

	if (fieldData.shouldRender && !fieldData.shouldRender(form)) {
		return null;
	}

	if (fieldData?.options) {
		return <SelectInput key={fieldData.id} fieldData={fieldData} />;
	}
	return <NameInput key={fieldData.id} fieldData={fieldData} />;
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
