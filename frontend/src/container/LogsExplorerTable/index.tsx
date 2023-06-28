import { initialQueriesMap } from 'constants/queryBuilder';
import { QueryTable } from 'container/QueryTable';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useMemo } from 'react';

function LogsExplorerTable(): JSX.Element {
	const { stagedQuery } = useQueryBuilder();
	const { data, isFetching } = useGetExplorerQueryRange(stagedQuery);

	const currentData = useMemo(
		() => data?.payload.data.newResult.data.result || [],
		[data],
	);

	return (
		<QueryTable
			query={stagedQuery || initialQueriesMap.metrics}
			queryTableData={currentData}
			loading={isFetching}
		/>
	);
}

export default memo(LogsExplorerTable);
