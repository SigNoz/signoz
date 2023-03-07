import React from 'react';

import { processorFields } from './config';
import NameInput from './FormFields/NameInput';
import ParsingRulesTextArea from './FormFields/ParsingRulesTextArea';

export const renderProcessorForm = (): Array<JSX.Element> =>
	processorFields.map((fieldName) => {
		if (fieldName.id === '1') {
			return <NameInput key={fieldName.id} fieldData={fieldName} />;
		}
		return <ParsingRulesTextArea key={fieldName.id} fieldData={fieldName} />;
	});
