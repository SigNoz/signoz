import './styles.scss';

import { ExpandAltOutlined } from '@ant-design/icons';
import LogDetail from 'components/LogDetail';
import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import dayjs from 'dayjs';
import { useActiveLog } from 'hooks/logs/useActiveLog';
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

function LogsFilterPreview({ filter }: LogsFilterPreviewProps): JSX.Element {
	const query = useMemo(() => {
		const q = _.cloneDeep(initialQueriesMap.logs);
		q.builder.queryData[0] = {
			...q.builder.queryData[0],
			filters: filter || initialFilters,
			aggregateOperator: LogsAggregatorOperator.NOOP,
			limit: 5,
		};
		return q;
	}, [filter]);

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

	let content = null;
	// TODO(Raj): Style error and loading states appropriately
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
