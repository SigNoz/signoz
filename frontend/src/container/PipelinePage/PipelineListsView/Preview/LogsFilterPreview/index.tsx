import './styles.scss';

import { ExpandAltOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import LogDetail from 'components/LogDetail';
import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import {
	RelativeDurationOptions,
	Time,
} from 'container/TopNav/DateTimeSelection/config';
import dayjs from 'dayjs';
import { useActiveLog } from 'hooks/logs/useActiveLog';
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

function PreviewLogsTable({ logs }: PreviewLogsTableProps): JSX.Element {
	const {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
	} = useActiveLog();

	return (
		<div className="logs-preview-list-container">
			{logs.map((log) => (
				<div key={log.id} className="logs-preview-list-item">
					<div className="logs-preview-list-item-timestamp">
						{dayjs(String(log.timestamp)).format('MMM DD HH:mm:ss.SSS')}
					</div>
					<div className="logs-preview-list-item-body">{log.body}</div>
					{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
					<div
						className="logs-preview-list-item-expand"
						onClick={(): void => onSetActiveLog(log)}
					>
						<ExpandAltOutlined />
					</div>
				</div>
			))}
			<LogDetail
				log={activeLog}
				onClose={onClearActiveLog}
				onAddToQuery={onAddToQuery}
				onClickActionItem={onAddToQuery}
			/>
		</div>
	);
}

interface PreviewLogsTableProps {
	logs: ILog[];
}

function PreviewTimeIntervalSelector({
	value,
	onChange,
}: PreviewTimeIntervalSelectorProps): JSX.Element {
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

interface PreviewTimeIntervalSelectorProps {
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

function useGetLogCount(
	filter: TagFilter,
	timeInterval: Time,
): UseQueryRangeResult {
	const query = useMemo(() => {
		const q = _.cloneDeep(initialQueriesMap.logs);
		q.builder.queryData[0] = {
			...q.builder.queryData[0],
			filters: filter || initialFilters,
			aggregateOperator: LogsAggregatorOperator.COUNT,
		};
		return q;
	}, [filter]);

	return useGetQueryRange({
		graphType: PANEL_TYPES.TABLE,
		query,
		selectedTime: 'GLOBAL_TIME',
		globalSelectedInterval: timeInterval,
	});
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
			content = <PreviewLogsTable logs={logs} />;
		} else {
			content = <div>No logs found</div>;
		}
	}

	const countQueryResponse = useGetLogCount(filter, previewTimeInterval);
	let matchedLogsCount;
	if ((filter?.items?.length || 0) > 0 && countQueryResponse.isFetched) {
		matchedLogsCount =
			countQueryResponse?.data?.payload?.data?.newResult?.data?.result?.[0]
				?.series?.[0]?.values?.[0]?.value;
	}

	return (
		<div className="logs-filter-preview-container">
			<div className="logs-filter-preview-header">
				<div>Filtered Logs Preview</div>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					{matchedLogsCount !== undefined && (
						<div style={{ marginRight: '0.5rem' }}>
							{matchedLogsCount} matches in{' '}
						</div>
					)}
					<PreviewTimeIntervalSelector
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
