import { Input } from 'antd';
import getStep from 'lib/getStep';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { selectStyle } from '../QueryBuilderSearch/config';

function AggregateEveryFilter({
	onChange,
	query,
}: AggregateEveryFilterProps): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const stepInterval = useMemo(
		() =>
			getStep({
				start: minTime,
				end: maxTime,
				inputFormat: 'ns',
			}),
		[maxTime, minTime],
	);

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
		<Input
			type="text"
			placeholder="Enter in seconds"
			disabled={isMetricsDataSource && !query.aggregateAttribute.key}
			style={selectStyle}
			defaultValue={query.stepInterval ?? stepInterval}
			onChange={(event): void => onChange(Number(event.target.value))}
			onKeyDown={handleKeyDown}
		/>
	);
}

interface AggregateEveryFilterProps {
	onChange: (values: number) => void;
	query: IBuilderQuery;
}

export default AggregateEveryFilter;
