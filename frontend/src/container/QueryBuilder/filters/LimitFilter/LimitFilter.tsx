import { InputNumber } from 'antd';
import React, { useState } from 'react';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

import { selectStyle } from '../QueryBuilderSearch/config';

function LimitFilter({ onChange, query }: LimitFilterProps): JSX.Element {
	const [isData, setIsData] = useState<number | null>(null);
	const onChangeHandler = (value: number | null): void => {
		setIsData(value);
	};

	const handleEnter = (e: { key: string }): void => {
		if (e.key === 'Enter') {
			onChange(isData);
		}
	};

	return (
		<InputNumber
			min={1}
			type="number"
			placeholder="e.g 10"
			disabled={!query.aggregateAttribute.key}
			style={selectStyle}
			onChange={onChangeHandler}
			onPressEnter={handleEnter}
		/>
	);
}

interface LimitFilterProps {
	onChange: (values: number | null) => void;
	query: IBuilderQueryForm;
}

export default LimitFilter;
