import { PlusOutlined } from '@ant-design/icons';
import { PromQLQueryTemplate } from 'constants/dashboard';
import GetQueryName from 'lib/query/GetQueryName';
import React from 'react';
import { IPromQLQuery, Query } from 'types/api/dashboard/getAll';

import { WIDGET_PROMQL_QUERY_KEY_NAME } from '../../constants';
import { QueryButton } from '../../styles';
import { IHandleUpdatedQuery } from '../../types';
import PromQLQueryBuilder from './query';
import { IPromQLQueryHandleChange } from './types';

interface IPromQLQueryContainerProps {
	queryData: Query;
	updateQueryData: (args: IHandleUpdatedQuery) => void;
	promQLQueries: IPromQLQuery[];
}

function PromQLQueryContainer({
	queryData,
	updateQueryData,
	promQLQueries,
}: IPromQLQueryContainerProps): JSX.Element | null {
	const handlePromQLQueryChange = ({
		queryIndex,
		query,
		legend,
		toggleDisable,
		toggleDelete,
	}: IPromQLQueryHandleChange): void => {
		const allQueries = queryData[WIDGET_PROMQL_QUERY_KEY_NAME];
		const currentIndexQuery = allQueries[queryIndex];
		if (query !== undefined) currentIndexQuery.query = query;
		if (legend !== undefined) currentIndexQuery.legend = legend;

		if (toggleDisable) {
			currentIndexQuery.disabled = !currentIndexQuery.disabled;
		}
		if (toggleDelete) {
			allQueries.splice(queryIndex, 1);
		}
		updateQueryData({ updatedQuery: { ...queryData } });
	};
	const addQueryHandler = (): void => {
		queryData[WIDGET_PROMQL_QUERY_KEY_NAME].push({
			name: GetQueryName(queryData[WIDGET_PROMQL_QUERY_KEY_NAME]) || '',
			...PromQLQueryTemplate,
		});
		updateQueryData({ updatedQuery: { ...queryData } });
	};

	if (!promQLQueries) {
		return null;
	}
	return (
		<>
			{promQLQueries.map(
				(q: IPromQLQuery, idx: number): JSX.Element => (
					<PromQLQueryBuilder
						key={q.name}
						queryIndex={idx}
						queryData={q}
						handleQueryChange={handlePromQLQueryChange}
					/>
				),
			)}
			<QueryButton onClick={addQueryHandler} icon={<PlusOutlined />}>
				Query
			</QueryButton>
		</>
	);
}

export default PromQLQueryContainer;
