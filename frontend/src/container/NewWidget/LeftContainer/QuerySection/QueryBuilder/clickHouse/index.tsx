import { PlusOutlined } from '@ant-design/icons';
import { ClickHouseQueryTemplate } from 'constants/dashboard';
import GetQueryName from 'lib/query/GetQueryName';
import React from 'react';
import { Query } from 'types/api/dashboard/getAll';

import { WIDGET_CLICKHOUSE_QUERY_KEY_NAME } from '../../constants';
import { QueryButton } from '../../styles';
import { IHandleUpdatedQuery } from '../../types';
import ClickHouseQueryBuilder from './query';
import { IClickHouseQueryHandleChange } from './types';

interface IClickHouseQueryContainerProps {
	queryData: Query;
	updateQueryData: (args: IHandleUpdatedQuery) => void;
	clickHouseQueries: Query['clickHouse'];
}
function ClickHouseQueryContainer({
	queryData,
	updateQueryData,
	clickHouseQueries,
}: IClickHouseQueryContainerProps): JSX.Element | null {
	const handleClickHouseQueryChange = ({
		queryIndex,
		rawQuery,
		legend,
		toggleDisable,
		toggleDelete,
	}: IClickHouseQueryHandleChange): void => {
		// we must check if queryIndex is number type. because -
		// ClickHouseQueryBuilder.handleQueryChange has a queryIndex
		// parameter which supports both number and string formats.
		// it is because, the dashboard side of query builder has queryIndex as number
		// while the alert builder uses string format for query index (similar to backend)
		// hence, this method is only applies when queryIndex is in number format.

		if (typeof queryIndex === 'number') {
			const allQueries = queryData[WIDGET_CLICKHOUSE_QUERY_KEY_NAME];

			const currentIndexQuery = allQueries[queryIndex];

			if (rawQuery !== undefined) {
				currentIndexQuery.rawQuery = rawQuery;
			}

			if (legend !== undefined) {
				currentIndexQuery.legend = legend;
			}

			if (toggleDisable) {
				currentIndexQuery.disabled = !currentIndexQuery.disabled;
			}
			if (toggleDelete) {
				allQueries.splice(queryIndex, 1);
			}
			updateQueryData({ updatedQuery: { ...queryData } });
		}
	};
	const addQueryHandler = (): void => {
		queryData[WIDGET_CLICKHOUSE_QUERY_KEY_NAME].push({
			name: GetQueryName(queryData[WIDGET_CLICKHOUSE_QUERY_KEY_NAME]) || '',
			...ClickHouseQueryTemplate,
		});
		updateQueryData({ updatedQuery: { ...queryData } });
	};

	if (!clickHouseQueries) {
		return null;
	}
	return (
		<>
			{clickHouseQueries.map((q, idx) => (
				<ClickHouseQueryBuilder
					key={q.name}
					queryIndex={idx}
					queryData={q}
					handleQueryChange={handleClickHouseQueryChange}
				/>
			))}
			<QueryButton onClick={addQueryHandler} icon={<PlusOutlined />}>
				Query
			</QueryButton>
		</>
	);
}

export default ClickHouseQueryContainer;
