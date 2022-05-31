import { PlusOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { ClickHouseQueryTemplate } from 'constants/dashboard';
import GetQueryName from 'lib/query/GetQueryName';
import React, { useEffect, useState } from 'react';

import {
	WIDGET_CLICKHOUSE_QUERY_KEY_NAME,
	WIDGET_PROMQL_QUERY_KEY_NAME,
} from '../../constants';
import { QueryButton } from '../../styles';
import ClickHouseQueryBuilder from './query';

function ClickHouseQueryContainer({
	queryData,
	updateQueryData,
	clickHouseQueries,
}): JSX.Element | null {
	const handleClickHouseQueryChange = ({
		queryIndex,
		rawQuery,
		toggleDisable,
		toggleDelete,
	}): void => {
		const allQueries = queryData[WIDGET_CLICKHOUSE_QUERY_KEY_NAME];
		const currentIndexQuery = allQueries[queryIndex];

		if (rawQuery !== undefined) {
			currentIndexQuery.rawQuery = rawQuery;
		}
		if (toggleDisable) {
			currentIndexQuery.disabled = !currentIndexQuery.disabled;
		}
		if (toggleDelete) {
			allQueries.splice(queryIndex, 1);
		}
		updateQueryData({ updatedQuery: { ...queryData } });
	};
	const addQueryHandler = (): void => {
		queryData[WIDGET_CLICKHOUSE_QUERY_KEY_NAME].push({
			name: GetQueryName(queryData[WIDGET_CLICKHOUSE_QUERY_KEY_NAME]),
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
