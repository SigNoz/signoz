import { InputNumber } from 'antd';
import React from 'react';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

import { selectStyle } from '../QueryBuilderSearch/config';

function LimitFilter({ onChange, query }: LimitFilterProps): JSX.Element {
	const handleKeyDown = (event: {
		keyCode: number;
		which: number;
		preventDefault: () => void;
	}): void => {
		const keyCode = event.keyCode || event.which;
		const isBackspace = keyCode === 8;
		const isNumeric =
			(keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105);

		if (!isNumeric && !isBackspace) {
			event.preventDefault();
		}
	};

	return (
		<InputNumber
			min={1}
			type="number"
			disabled={!query.aggregateAttribute.key}
			style={selectStyle}
			onChange={onChange}
			onKeyDown={handleKeyDown}
		/>
	);
}

interface LimitFilterProps {
	onChange: (values: number | null) => void;
	query: IBuilderQueryForm;
}

export default LimitFilter;
