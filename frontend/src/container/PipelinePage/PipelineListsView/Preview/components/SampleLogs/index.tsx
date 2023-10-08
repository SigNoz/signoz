import './styles.scss';

import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import cloneDeep from 'lodash-es/cloneDeep';
import { useMemo } from 'react';
import { ILog } from 'types/api/logs/log';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

import LogsList from '../LogsList';

function SampleLogs({ filter, timeInterval }: SampleLogsProps): JSX.Element {
	const sampleLogsQuery = useMemo(() => {
		const q = cloneDeep(initialQueriesMap.logs);
		q.builder.queryData[0] = {
			...q.builder.queryData[0],
			filters: filter || initialFilters,
			aggregateOperator: LogsAggregatorOperator.NOOP,
			orderBy: [{ columnName: 'timestamp', order: 'desc' }],
			limit: 5,
		};
		return q;
	}, [filter]);

	const sampleLogsResponse = useGetQueryRange({
		graphType: PANEL_TYPES.LIST,
		query: sampleLogsQuery,
		selectedTime: 'GLOBAL_TIME',
		globalSelectedInterval: timeInterval,
	});

	if (sampleLogsResponse?.isError) {
		return (
			<div className="sample-logs-notice-container">
				could not fetch logs for filter
			</div>
		);
	}

	if (sampleLogsResponse?.isFetching) {
		return <div className="sample-logs-notice-container">Loading...</div>;
	}

	if ((filter?.items?.length || 0) < 1) {
		return (
			<div className="sample-logs-notice-container">Please select a filter</div>
		);
	}

	const logsList =
		sampleLogsResponse?.data?.payload?.data?.newResult?.data?.result[0]?.list ||
		[];

	if (logsList.length < 1) {
		return <div className="sample-logs-notice-container">No logs found</div>;
	}

	const logs: ILog[] = logsList.map((item) => ({
		...item.data,
		timestamp: item.timestamp,
	}));
	return <LogsList logs={logs} />;
}

interface SampleLogsProps {
	filter: TagFilter;
	timeInterval: Time;
}

export default SampleLogs;
