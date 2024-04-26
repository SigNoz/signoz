import './styles.scss';

import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import cloneDeep from 'lodash-es/cloneDeep';
import { useMemo } from 'react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

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

	const result = useGetQueryRange(
		{
			graphType: PANEL_TYPES.TABLE,
			query,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: timeInterval,
		},
		DEFAULT_ENTITY_VERSION,
	);

	if (!result.isFetched) {
		return null;
	}

	const count =
		result?.data?.payload?.data?.newResult?.data?.result?.[0]?.series?.[0]
			?.values?.[0]?.value;
	return (
		<div className="logs-filter-preview-matched-logs-count">
			{count} matches in
		</div>
	);
}

interface LogsCountInIntervalProps {
	filter: TagFilter;
	timeInterval: Time;
}

export default LogsCountInInterval;
