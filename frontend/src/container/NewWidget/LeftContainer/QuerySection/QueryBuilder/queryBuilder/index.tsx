import { PlusOutlined } from '@ant-design/icons';
import { notification } from 'antd';
import {
	QueryBuilderFormulaTemplate,
	QueryBuilderQueryTemplate,
} from 'constants/dashboard';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import GetFormulaName from 'lib/query/GetFormulaName';
import GetQueryName from 'lib/query/GetQueryName';
import React from 'react';
import { Query } from 'types/api/dashboard/getAll';

import {
	WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME,
	WIDGET_QUERY_BUILDER_QUERY_KEY_NAME,
} from '../../constants';
import { QueryButton } from '../../styles';
import { IHandleUpdatedQuery } from '../../types';
import MetricsBuilderFormula from './formula';
import MetricsBuilder from './query';
import {
	IQueryBuilderFormulaHandleChange,
	IQueryBuilderQueryHandleChange,
} from './types';
import { canCreateQueryAndFormula } from './utils';

interface IQueryBuilderQueryContainerProps {
	queryData: Query;
	updateQueryData: (args: IHandleUpdatedQuery) => void;
	metricsBuilderQueries: Query['metricsBuilder'];
	selectedGraph: GRAPH_TYPES;
}

function QueryBuilderQueryContainer({
	queryData,
	updateQueryData,
	metricsBuilderQueries,
	selectedGraph,
}: IQueryBuilderQueryContainerProps): JSX.Element | null {
	const handleQueryBuilderQueryChange = ({
		queryIndex,
		aggregateFunction,
		metricName,
		tagFilters,
		groupBy,
		legend,
		toggleDisable,
		toggleDelete,
		reduceTo,
	}: IQueryBuilderQueryHandleChange): void => {
		const allQueries =
			queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME].queryBuilder;
		const currentIndexQuery = allQueries[queryIndex as number];
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

		if (reduceTo) {
			currentIndexQuery.reduceTo = reduceTo;
		}

		if (legend !== undefined) {
			currentIndexQuery.legend = legend;
		}
		if (toggleDisable) {
			currentIndexQuery.disabled = !currentIndexQuery.disabled;
		}
		if (toggleDelete) {
			allQueries.splice(queryIndex as number, 1);
		}
		updateQueryData({ updatedQuery: { ...queryData } });
	};
	const handleQueryBuilderFormulaChange = ({
		formulaIndex,
		expression,
		toggleDisable,
		toggleDelete,
	}: IQueryBuilderFormulaHandleChange): void => {
		const allFormulas =
			queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME][
				WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME
			];
		const currentIndexFormula = allFormulas[formulaIndex as number];

		if (expression) {
			currentIndexFormula.expression = expression;
		}

		if (toggleDisable) {
			currentIndexFormula.disabled = !currentIndexFormula.disabled;
		}

		if (toggleDelete) {
			allFormulas.splice(formulaIndex as number, 1);
		}
		updateQueryData({ updatedQuery: { ...queryData } });
	};
	const addQueryHandler = (): void => {
		if (!canCreateQueryAndFormula(queryData)) {
			notification.error({
				message:
					'Unable to create query. You can create at max 10 queries and formulae.',
			});
			return;
		}
		queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME].queryBuilder.push({
			name:
				GetQueryName(queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME].queryBuilder) ||
				'',
			...QueryBuilderQueryTemplate,
		});
		updateQueryData({ updatedQuery: { ...queryData } });
	};

	const addFormulaHandler = (): void => {
		if (!canCreateQueryAndFormula(queryData)) {
			notification.error({
				message:
					'Unable to create formula. You can create at max 10 queries and formulae.',
			});
			return;
		}
		queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME][
			WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME
		].push({
			name:
				GetFormulaName(
					queryData[WIDGET_QUERY_BUILDER_QUERY_KEY_NAME][
						WIDGET_QUERY_BUILDER_FORMULA_KEY_NAME
					],
				) || '',
			...QueryBuilderFormulaTemplate,
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
					selectedGraph={selectedGraph}
				/>
			))}
			<QueryButton onClick={addQueryHandler} icon={<PlusOutlined />}>
				Query
			</QueryButton>
			<div style={{ marginTop: '1rem' }}>
				{metricsBuilderQueries.formulas.map((f, idx) => (
					<MetricsBuilderFormula
						key={f.name}
						formulaIndex={idx}
						formulaData={f}
						handleFormulaChange={handleQueryBuilderFormulaChange}
					/>
				))}
				<QueryButton onClick={addFormulaHandler} icon={<PlusOutlined />}>
					Formula
				</QueryButton>
			</div>
		</>
	);
}

export default QueryBuilderQueryContainer;
