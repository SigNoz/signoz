import RawLogView from 'components/Logs/RawLogView';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { useCallback, useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { useContextLogData } from './useContextLogData';

function ContextLogRenderer({
	isEdit,
	query,
	log,
	filters,
}: ContextLogRendererProps): JSX.Element {
	const { logs: beforeLogs } = useContextLogData({
		log,
		filters,
		isEdit,
		query,
		order: ORDERBY_FILTERS.ASC,
	});

	console.log({ beforeLogs });

	const { logs: afterLogs } = useContextLogData({
		log,
		filters,
		isEdit,
		query,
		order: ORDERBY_FILTERS.DESC,
	});

	const [logs, setLogs] = useState<ILog[]>([log]);

	useEffect(() => {
		setLogs((prev) => [...beforeLogs, ...prev]);
	}, [beforeLogs]);

	useEffect(() => {
		setLogs((prev) => [...prev, ...afterLogs]);
	}, [afterLogs]);

	const getItemContent = useCallback(
		(_: number, logTorender: ILog): JSX.Element => (
			<RawLogView
				isActiveLog={logTorender.id === log.id}
				isReadOnly
				isTextOverflowEllipsisDisabled
				key={logTorender.id}
				data={logTorender}
				linesPerRow={1}
			/>
		),
		[log.id],
	);

	return (
		<Virtuoso
			className="virtuoso-list"
			initialTopMostItemIndex={0}
			data={logs}
			itemContent={getItemContent}
			style={{ height: '80vh' }}
			// followOutput={order === ORDERBY_FILTERS.DESC}
		/>
	);
}

interface ContextLogRendererProps {
	isEdit: boolean;
	query: Query;
	log: ILog;
	filters: TagFilter | null;
}

export default ContextLogRenderer;
