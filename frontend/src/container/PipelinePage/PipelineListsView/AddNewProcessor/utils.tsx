import { processorFields, ProcessorFormField } from './config';
import NameInput from './FormFields/NameInput';

export const renderProcessorForm = (
	processorType: string,
): Array<JSX.Element> =>
	processorFields[processorType]?.map((fieldName: ProcessorFormField) => (
		<NameInput key={fieldName.id} fieldData={fieldName} />
	));
