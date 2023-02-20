import React from 'react';

import { processorFields } from './config';
import NameInput from './FormFields/NameInput';
import ParsingRulesTextArea from './FormFields/ParsingRulesTextArea';

export const renderProcessorForm = (): Array<JSX.Element> =>
	processorFields.map((item) => {
		if (item.id === '1') {
			return <NameInput key={item.id} fieldData={item} />;
		}
		return <ParsingRulesTextArea key={item.id} fieldData={item} />;
	});
