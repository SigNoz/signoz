import { initialQueriesMap } from 'constants/queryBuilder';
import { QueryTable } from 'container/QueryTable';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo } from 'react';

import { LogsExplorerTableProps } from './LogsExplorerTable.interfaces';

function LogsExplorerTable({
	data,
	isLoading,
}: LogsExplorerTableProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	return (
		<QueryTable
			query={stagedQuery || initialQueriesMap.metrics}
			queryTableData={data}
			loading={isLoading}
		/>
	);
}

export default memo(LogsExplorerTable);
