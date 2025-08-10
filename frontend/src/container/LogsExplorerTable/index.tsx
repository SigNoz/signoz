import './LogsExplorerTable.styles.scss';

import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { initialQueriesMap } from 'constants/queryBuilder';
import { LogsLoading } from 'container/LogsLoading/LogsLoading';
import { QueryTable } from 'container/QueryTable';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo } from 'react';
import APIError from 'types/api/error';

import { LogsExplorerTableProps } from './LogsExplorerTable.interfaces';

function LogsExplorerTable({
	data,
	isLoading,
	isError,
	error,
}: LogsExplorerTableProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	if (isLoading) {
		return <LogsLoading />;
	}

	if (isError && error) {
		return <ErrorInPlace error={error as APIError} />;
	}

	return (
		<QueryTable
			query={stagedQuery || initialQueriesMap.metrics}
			queryTableData={data}
			loading={isLoading}
			rootClassName="logs-table"
			sticky
		/>
	);
}

export default memo(LogsExplorerTable);
