import { useMemo } from 'react';
import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import cloneDeep from 'lodash-es/cloneDeep';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

import './styles.scss';

function LogsCountInInterval({
	filter,
	timeInterval,
}: LogsCountInIntervalProps): JSX.Element | null {
	const query = useMemo(() => {
		const q = cloneDeep(initialQueriesMap.logs);
		q.builder.queryData[0] = {
			...q.builder.queryData[0],
			filters: filter || initialFilters,
			aggregateOperator: LogsAggregatorOperator.COUNT,
		};
		return q;
	}, [filter]);

	const result = useGetQueryRange({
		graphType: PANEL_TYPES.TABLE,
		query,
		selectedTime: 'GLOBAL_TIME',
		globalSelectedInterval: timeInterval,
	});

	const count = useMemo(() => {
		const table = result.data?.payload?.data?.result?.[0]?.table;
		const countColumn = table?.columns.find((column) => column.isValueColumn);
		return (
			countColumn && table?.rows[0]?.data[countColumn.id || countColumn.name]
		);
	}, [result.data]);

	if (!result.isFetched) {
		return null;
	}

	return (
		<div
			className="logs-filter-preview-matched-logs-count"
			data-testid="pipeline-filter-preview-count"
		>
			{count} matches in
		</div>
	);
}

interface LogsCountInIntervalProps {
	filter: TagFilter;
	timeInterval: Time;
}

export default LogsCountInInterval;
