import { InputNumber } from 'antd';
import React from 'react';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

import { selectStyle } from '../QueryBuilderSearch/config';

function LimitFilter({ onChange, query }: LimitFilterProps): JSX.Element {
	const onChangeHandler = (value: number | null): void => {
		onChange(value);
	};

	return (
		<InputNumber
			min={1}
			type="number"
			disabled={!query.aggregateAttribute.key}
			style={selectStyle}
			onChange={onChangeHandler}
		/>
	);
}

interface LimitFilterProps {
	onChange: (values: number | null) => void;
	query: IBuilderQueryForm;
}

export default LimitFilter;
