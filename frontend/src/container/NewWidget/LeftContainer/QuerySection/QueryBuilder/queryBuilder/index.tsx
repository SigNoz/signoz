import { PlusOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import {
	ClickHouseQueryTemplate,
	QueryBuilderQueryTemplate,
} from 'constants/dashboard';
import GetQueryName from 'lib/query/GetQueryName';
import React, { useEffect, useState } from 'react';

import {
	WIDGET_CLICKHOUSE_QUERY_KEY_NAME,
	WIDGET_PROMQL_QUERY_KEY_NAME,
	WIDGET_QUERY_BUILDER_QUERY_KEY_NAME,
} from '../../constants';
import { QueryButton } from '../../styles';
import QueryHeader from '../QueryHeader';
import MetricsBuilder from './query';
import ClickHouseQueryBuilder from './query';

function QueryBuilderQueryContainer({
	queryData,
	updateQueryData,
	metricsBuilderQueries,
}): JSX.Element | null {
	const handleQueryBuilderQueryChange = ({
		queryIndex,
		aggregateFunction,
		metricName,
		tagFilters,
		groupBy,
		toggleDisable,
		toggleDelete,
	}): void => {
		const allQueries =
			queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME].queryBuilder;
		const currentIndexQuery = allQueries[queryIndex];
		if (aggregateFunction) {
			currentIndexQuery.aggregateOperator = aggregateFunction;
		}

		if (metricName) {
			currentIndexQuery.metricName = metricName;
		}

		if (tagFilters) {
			currentIndexQuery.tagFilters.items = tagFilters;
		}
		if (groupBy) {
			currentIndexQuery.groupBy = groupBy;
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
		queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME].queryBuilder.push({
			name: GetQueryName(
				queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME].queryBuilder,
			),
			...QueryBuilderQueryTemplate,
		});
		updateQueryData({ updatedQuery: { ...queryData } });
	};

	if (!metricsBuilderQueries) {
		return null;
	}
	return (
		<>
			{metricsBuilderQueries.queryBuilder.map((q, idx) => (
				<MetricsBuilder
					key={q.name}
					queryIndex={idx}
					queryData={q}
					handleQueryChange={handleQueryBuilderQueryChange}
				/>
			))}
			<QueryButton onClick={addQueryHandler} icon={<PlusOutlined />}>
				Query
			</QueryButton>
			<QueryButton onClick={addQueryHandler} icon={<PlusOutlined />}>
				Formula
			</QueryButton>
		</>
	);
}

export default QueryBuilderQueryContainer;
