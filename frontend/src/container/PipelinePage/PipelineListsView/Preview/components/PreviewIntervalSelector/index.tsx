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
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { cloneDeep } from 'lodash-es';
import { useMemo } from 'react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

function MatchedLogsCount({
	filter,
	timeInterval,
}: MatchedLogsCountProps): JSX.Element {
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

	if (result.isFetched) {
		const count =
			result?.data?.payload?.data?.newResult?.data?.result?.[0]?.series?.[0]
				?.values?.[0]?.value;
		return (
			<div className="logs-filter-preview-matched-logs-count">
				{count} matches in
			</div>
		);
	}
	return <div />;
}

interface MatchedLogsCountProps {
	filter: TagFilter;
	timeInterval: Time;
}

function PreviewIntervalSelector({
	previewFilter,
	value,
	onChange,
}: PreviewIntervalSelectorProps): JSX.Element {
	const isEmptyFilter = (previewFilter?.items?.length || 0) < 1;

	return (
		<div className="logs-filter-preview-time-interval-summary">
			{!isEmptyFilter && (
				<MatchedLogsCount filter={previewFilter} timeInterval={value} />
			)}
			<div>
				<Select
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
		</div>
	);
}

interface PreviewIntervalSelectorProps {
	value: Time;
	onChange: (interval: Time) => void;
	previewFilter: TagFilter;
}

export default PreviewIntervalSelector;
