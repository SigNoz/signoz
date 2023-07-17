import { InputNumber } from 'antd';
import { useMemo } from 'react';
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

	const isDisabled = isMetricsDataSource && !query.aggregateAttribute.key;

	return (
		<InputNumber
			min={1}
			type="number"
			value={query.limit}
			style={selectStyle}
			disabled={isDisabled}
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
