import { useMemo } from 'react';
import InputNumber from 'components/InputNumber';
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

	const onChangeHandler = (value: number | null): void => {
		if (value !== null && value >= 0) {
			onChange(value);
		}
	};

	const isDisabled =
		(isMetricsDataSource && !query.aggregateAttribute?.key) || disabled;

	return (
		<InputNumber
			placeholder="Enter in seconds"
			disabled={isDisabled}
			style={selectStyle}
			value={query?.stepInterval}
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
