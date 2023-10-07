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
import _ from 'lodash-es';
import { useMemo } from 'react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';

function useLogsCountStr({
	filter,
	timeInterval,
}: MatchedLogsCountProps): string | undefined {
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

	if ((filter?.items?.length || 0) > 0 && result.isFetched) {
		return result?.data?.payload?.data?.newResult?.data?.result?.[0]?.series?.[0]
			?.values?.[0]?.value;
	}
	return undefined;
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
	const matchedLogsCount = useLogsCountStr({
		filter: previewFilter,
		timeInterval: value,
	});

	return (
		<div className="logs-filter-preview-time-interval-summary">
			{matchedLogsCount && (
				<div className="logs-filter-preview-matched-logs-count">
					{matchedLogsCount} matches in{' '}
				</div>
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
