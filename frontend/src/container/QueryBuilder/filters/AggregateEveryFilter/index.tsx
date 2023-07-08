import { InputNumber, InputNumberProps } from 'antd';
import { useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { selectStyle } from '../QueryBuilderSearch/config';

function AggregateEveryFilter({
	onChange,
	query,
	disabled,
}: AggregateEveryFilterProps): JSX.Element {
	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);

	const onChangeHandler: InputNumberProps<number>['onChange'] = (event) => {
		if (event && event >= 0) {
			onChange(event);
		}
	};

	const isDisabled =
		(isMetricsDataSource && !query.aggregateAttribute.key) || disabled;

	return (
		<InputNumber
			placeholder="Enter in seconds"
			disabled={isDisabled}
			style={selectStyle}
			value={query.stepInterval}
			onChange={onChangeHandler}
			min={0}
		/>
	);
}

interface AggregateEveryFilterProps {
	onChange: (values: number) => void;
	query: IBuilderQuery;
	disabled: boolean;
}

export default AggregateEveryFilter;
