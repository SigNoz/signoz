import './styles.scss';

import { ExpandAltOutlined } from '@ant-design/icons';
import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import dayjs from 'dayjs';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import _ from 'lodash-es';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ILog } from 'types/api/logs/log';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

function PreviewLogsTable({ logs }: PreviewLogsTableProps): JSX.Element {
	return (
		<div className="logs-preview-list-container">
			{logs.map((log) => (
				<div key={log.id} className="logs-preview-list-item">
					<div className="logs-preview-list-item-timestamp">
						{dayjs(String(log.timestamp)).format('MMM DD HH:mm:ss.SSS')}
					</div>
					<div className="logs-preview-list-item-body">{log.body}</div>
					<div className="logs-preview-list-item-actions">
						<ExpandAltOutlined />
					</div>
				</div>
			))}
		</div>
	);
}

interface PreviewLogsTableProps {
	logs: ILog[];
}

function LogsFilterPreview({ filter }: LogsFilterPreviewProps): JSX.Element {
	const query = useMemo(() => {
		const q = _.cloneDeep(initialQueriesMap.logs);
		q.builder.queryData[0] = {
			...q.builder.queryData[0],
			filters: filter || initialFilters,
			aggregateOperator: LogsAggregatorOperator.NOOP,
			limit: 8,
		};
		return q;
	}, [filter]);

	console.log('preview filter prop', filter);

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	>((state: { globalTime: any }) => state.globalTime);

	const queryResponse = useGetQueryRange({
		graphType: PANEL_TYPES.LIST,
		query,
		selectedTime: 'GLOBAL_TIME',
		globalSelectedInterval,
	});

	console.log(queryResponse);
	let content = null;
	if (queryResponse?.isError) {
		content = <div>could not fetch logs for filter</div>;
	} else if (queryResponse?.isFetching) {
		content = <div>Loading...</div>;
	} else if ((filter?.items?.length || 0) < 1) {
		content = <div />;
	} else {
		const logsList =
			queryResponse?.data?.payload?.data?.newResult?.data?.result[0]?.list || [];
		if (logsList.length > 0) {
			// content = <LiveLogsList logs={logsList} />;
			const logs: ILog[] = logsList.map((item) => ({
				...item.data,
				timestamp: item.timestamp,
			}));
			content = <PreviewLogsTable logs={logs} />;
		} else {
			content = <div>No logs found</div>;
		}
	}

	return (
		<div className="logs-filter-preview-container">
			<div className="logs-filter-preview-header">Preview</div>
			<div className="logs-filter-preview-content">{content}</div>
		</div>
	);
}

interface LogsFilterPreviewProps {
	filter: TagFilter;
}

export default LogsFilterPreview;
