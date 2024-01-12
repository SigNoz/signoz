import RawLogView from 'components/Logs/RawLogView';
import LogsContextList from 'container/LogsContextList';
import useInitialQuery from 'container/LogsExplorerContext/useInitialQuery';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { useState } from 'react';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';

function LogContext({ log }: { log: ILog }): JSX.Element {
	const initialContextQuery = useInitialQuery(log);

	const [contextQuery, setContextQuery] = useState<Query>(initialContextQuery);
	const [filters, setFilters] = useState<TagFilter | null>(null);
	const [isEdit, setIsEdit] = useState<boolean>(false);

	console.log({ setContextQuery, setFilters, setIsEdit });

	return (
		<div>
			<LogsContextList
				order={ORDERBY_FILTERS.ASC}
				filters={filters}
				isEdit={isEdit}
				log={log}
				query={contextQuery}
			/>
			<div>
				<RawLogView
					isActiveLog
					isReadOnly
					isTextOverflowEllipsisDisabled
					data={log}
					linesPerRow={1}
				/>
			</div>
			<LogsContextList
				order={ORDERBY_FILTERS.DESC}
				filters={filters}
				isEdit={isEdit}
				log={log}
				query={contextQuery}
			/>
		</div>
	);
}

export default LogContext;
