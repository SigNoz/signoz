import './ContextLogRenderer.styles.scss';

import { Skeleton } from 'antd';
import RawLogView from 'components/Logs/RawLogView';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { LOCALSTORAGE } from 'constants/localStorage';
import ShowButton from 'container/LogsContextList/ShowButton';
import { convertKeysToColumnFields } from 'container/LogsExplorerList/utils';
import { useOptionsMenu } from 'container/OptionsMenu';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { FontSize } from 'container/OptionsMenu/types';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import { useContextLogData } from './useContextLogData';

function ContextLogRenderer({
	isEdit,
	query,
	log,
	filters,
}: ContextLogRendererProps): JSX.Element {
	const [prevLogPage, setPrevLogPage] = useState<number>(1);
	const [afterLogPage, setAfterLogPage] = useState<number>(1);
	const [logs, setLogs] = useState<ILog[]>([log]);

	const { initialDataSource, stagedQuery } = useQueryBuilder();

	const listQuery = useMemo(() => {
		if (!stagedQuery || stagedQuery.builder.queryData.length < 1) return null;

		return stagedQuery.builder.queryData.find((item) => !item.disabled) || null;
	}, [stagedQuery]);

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: initialDataSource || DataSource.METRICS,
		aggregateOperator: listQuery?.aggregateOperator || StringOperators.NOOP,
	});

	const {
		logs: previousLogs,
		isFetching: isPreviousLogsFetching,
		handleShowNextLines: handlePreviousLogsShowNextLine,
	} = useContextLogData({
		log,
		filters,
		isEdit,
		query,
		order: ORDERBY_FILTERS.ASC,
		page: prevLogPage,
		setPage: setPrevLogPage,
		fontSize: options.fontSize,
	});

	const {
		logs: afterLogs,
		isFetching: isAfterLogsFetching,
		handleShowNextLines: handleAfterLogsShowNextLine,
	} = useContextLogData({
		log,
		filters,
		isEdit,
		query,
		order: ORDERBY_FILTERS.DESC,
		page: afterLogPage,
		setPage: setAfterLogPage,
		fontSize: options.fontSize,
	});

	useEffect(() => {
		setLogs((prev) => [...previousLogs, ...prev]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [previousLogs]);

	useEffect(() => {
		setLogs((prev) => [...prev, ...afterLogs]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [afterLogs]);

	useEffect(() => {
		setLogs([log]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters]);

	const lengthMultipier = useMemo(() => {
		switch (options.fontSize) {
			case FontSize.SMALL:
				return 24;
			case FontSize.MEDIUM:
				return 28;
			case FontSize.LARGE:
				return 32;
			default:
				return 32;
		}
	}, [options.fontSize]);

	const getItemContent = useCallback(
		(_: number, logTorender: ILog): JSX.Element => (
			<RawLogView
				isActiveLog={logTorender.id === log.id}
				isReadOnly
				isTextOverflowEllipsisDisabled
				key={logTorender.id}
				data={logTorender}
				linesPerRow={1}
				fontSize={options.fontSize}
				selectedFields={convertKeysToColumnFields(defaultLogsSelectedColumns)}
			/>
		),
		[log.id, options.fontSize],
	);

	return (
		<div className="context-log-renderer">
			<ShowButton
				isLoading={isPreviousLogsFetching}
				isDisabled={false}
				order={ORDERBY_FILTERS.ASC}
				onClick={handlePreviousLogsShowNextLine}
			/>
			{isPreviousLogsFetching && (
				<Skeleton
					style={{
						height: '100%',
						padding: '16px',
					}}
				/>
			)}
			<OverlayScrollbar isVirtuoso>
				<Virtuoso
					className="virtuoso-list"
					initialTopMostItemIndex={0}
					data={logs}
					itemContent={getItemContent}
					style={{ height: `calc(${logs.length} * ${lengthMultipier}px)` }}
				/>
			</OverlayScrollbar>
			{isAfterLogsFetching && (
				<Skeleton
					style={{
						height: '100%',
						padding: '16px',
					}}
				/>
			)}
			<ShowButton
				isLoading={isAfterLogsFetching}
				isDisabled={false}
				order={ORDERBY_FILTERS.DESC}
				onClick={handleAfterLogsShowNextLine}
			/>
		</div>
	);
}

interface ContextLogRendererProps {
	isEdit: boolean;
	query: Query;
	log: ILog;
	filters: TagFilter | null;
}

export default ContextLogRenderer;
