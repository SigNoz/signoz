import './styles.scss';

import { Select } from 'antd';
import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import {
	RelativeDurationOptions,
	Time,
} from 'container/TopNav/DateTimeSelection/config';
import {
	useGetQueryRange,
	UseQueryRangeResult,
} from 'hooks/queryBuilder/useGetQueryRange';
import _ from 'lodash-es';
import { useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { popupContainer } from 'utils/selectPopupContainer';

import LogsList from '../LogsList';

function TimeIntervalSelector({
	value,
	onChange,
}: TimeIntervalSelectorProps): JSX.Element {
	return (
		<div>
			<Select
				getPopupContainer={popupContainer}
				onSelect={(value: unknown): void => onChange(value as Time)}
				value={value}
			>
				{RelativeDurationOptions.map(({ value, label }) => (
					<Select.Option key={value + label} value={value}>
						{label}
					</Select.Option>
				))}
			</Select>
		</div>
	);
}

interface TimeIntervalSelectorProps {
	value: Time;
	onChange: (interval: Time) => void;
}

function useGetLogSamples(
	filter: TagFilter,
	timeInterval: Time,
): UseQueryRangeResult {
	const query = useMemo(() => {
		const q = _.cloneDeep(initialQueriesMap.logs);
		q.builder.queryData[0] = {
			...q.builder.queryData[0],
			filters: filter || initialFilters,
			aggregateOperator: LogsAggregatorOperator.NOOP,
			orderBy: [{ columnName: 'timestamp', order: 'desc' }],
			limit: 5,
		};
		return q;
	}, [filter]);

	return useGetQueryRange({
		graphType: PANEL_TYPES.LIST,
		query,
		selectedTime: 'GLOBAL_TIME',
		globalSelectedInterval: timeInterval,
	});
}

function MatchedLogsCount({
	filter,
	timeInterval,
}: MatchedLogsCountProps): JSX.Element {
	const query = useMemo(() => {
		const q = _.cloneDeep(initialQueriesMap.logs);
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

	let matchedLogsCount = null;
	if ((filter?.items?.length || 0) > 0 && result.isFetched) {
		matchedLogsCount =
			result?.data?.payload?.data?.newResult?.data?.result?.[0]?.series?.[0]
				?.values?.[0]?.value;
	}

	return (
		<div className="logs-filter-preview-matched-logs-count">
			{matchedLogsCount} matches in{' '}
		</div>
	);
}

interface MatchedLogsCountProps {
	filter: TagFilter;
	timeInterval: Time;
}

function LogsFilterPreview({ filter }: LogsFilterPreviewProps): JSX.Element {
	const last1HourInterval = RelativeDurationOptions[3].value;
	const [previewTimeInterval, setPreviewTimeInterval] = useState(
		last1HourInterval,
	);

	const samplesQueryResponse = useGetLogSamples(filter, previewTimeInterval);

	let content = null;
	// TODO(Raj): Style error and loading states appropriately
	if (samplesQueryResponse?.isError) {
		content = <div>could not fetch logs for filter</div>;
	} else if (samplesQueryResponse?.isFetching) {
		content = <div>Loading...</div>;
	} else if ((filter?.items?.length || 0) < 1) {
		content = <div />;
	} else {
		const logsList =
			samplesQueryResponse?.data?.payload?.data?.newResult?.data?.result[0]
				?.list || [];
		if (logsList.length > 0) {
			const logs: ILog[] = logsList.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			content = <LogsList logs={logs} />;
		} else {
			content = <div>No logs found</div>;
		}
	}

	return (
		<div className="logs-filter-preview-container">
			<div className="logs-filter-preview-header">
				<div>Filtered Logs Preview</div>
				<div className="logs-filter-preview-time-interval-summary">
					<MatchedLogsCount filter={filter} timeInterval={previewTimeInterval} />
					<TimeIntervalSelector
						value={previewTimeInterval}
						onChange={setPreviewTimeInterval}
					/>
				</div>
			</div>
			<div className="logs-filter-preview-content">{content}</div>
		</div>
	);
}

interface LogsFilterPreviewProps {
	filter: TagFilter;
}

export default LogsFilterPreview;
