import { PlusOutlined } from '@ant-design/icons';
import { PromQLQueryTemplate } from 'constants/dashboard';
import GetQueryName from 'lib/query/GetQueryName';
import React from 'react';

import { WIDGET_PROMQL_QUERY_KEY_NAME } from '../../constants';
import { QueryButton } from '../../styles';
import PromQLQueryBuilder from './query';

function PromQLQueryContainer({
	queryData,
	updateQueryData,
	promQLQueries,
	onQueryChange,
	onQueryAdd,
}): JSX.Element | null {
	const handlePromQLQueryChange = ({
		queryIndex,
		query,
		legend,
		toggleDisable,
		toggleDelete,
	}): void => {
		const allQueries = queryData[WIDGET_PROMQL_QUERY_KEY_NAME];
		const currentIndexQuery = allQueries[queryIndex];
		if (query) currentIndexQuery.query = query;
		if (legend) currentIndexQuery.legend = legend;

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
			name: GetQueryName(queryData[WIDGET_PROMQL_QUERY_KEY_NAME]),
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
				(q, idx): JSX.Element => (
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
