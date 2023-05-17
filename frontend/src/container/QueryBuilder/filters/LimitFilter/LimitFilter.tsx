import { InputNumber } from 'antd';
import React, { useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

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

	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);

	return (
		<InputNumber
			min={1}
			type="number"
			defaultValue={query.limit ?? 1}
			disabled={isMetricsDataSource && !query.aggregateAttribute.key}
			style={selectStyle}
			onChange={onChange}
			onKeyDown={handleKeyDown}
		/>
	);
}

interface LimitFilterProps {
	onChange: (values: number | null) => void;
	query: IBuilderQuery;
}

export default LimitFilter;
