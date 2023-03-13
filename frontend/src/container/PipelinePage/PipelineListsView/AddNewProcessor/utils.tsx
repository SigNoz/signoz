import React from 'react';

import { processorConfig, ProcessorFormField } from './config';
import NameInput from './FormFields/NameInput';

export const renderProcessorForm = (
	processorType: string,
): Array<JSX.Element> =>
	processorConfig[processorType]?.map((fieldName: ProcessorFormField) => (
		<NameInput key={fieldName.id} fieldData={fieldName} />
	));
