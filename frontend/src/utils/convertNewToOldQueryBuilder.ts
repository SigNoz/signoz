import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { BuilderQuery, QueryBuilderFormula } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

// Helper functions

const getDataSourceFromSignal = (signal: string): DataSource => {
	switch (signal) {
		case 'metrics':
			return DataSource.METRICS;
		case 'logs':
			return DataSource.LOGS;
		case 'traces':
			return DataSource.TRACES;
		default:
			return DataSource.METRICS;
	}
};

/**
 * Converts new BuilderQuery to old IBuilderQuery
 */
export const convertBuilderQueryToIBuilderQuery = (
	builderQuery: BuilderQuery,
): IBuilderQuery => {
	// Determine data source based on signal
	const dataSource = getDataSourceFromSignal(builderQuery.signal);

	const result: IBuilderQuery = ({
		...builderQuery,
		queryName: builderQuery.name,
		dataSource,
		legend: builderQuery.legend,
		groupBy:
			builderQuery.groupBy?.map((group) => ({
				key: group?.name,
				dataType: group?.fieldDataType,
				type: group?.fieldContext,
				id: `${group?.name}--${group?.fieldDataType}--${group?.fieldContext}`,
			})) || [],
		orderBy:
			builderQuery.order?.map((order) => ({
				columnName: order?.key?.name,
				order: order?.direction,
			})) || [],
	} as unknown) as IBuilderQuery;

	return result;
};

/**
 * Converts new QueryBuilderFormula to old IBuilderFormula
 */
export const convertQueryBuilderFormulaToIBuilderFormula = (
	formula: QueryBuilderFormula,
): IBuilderFormula => {
	const result: IBuilderFormula = ({
		...formula,
		expression: formula.expression,
		queryName: formula.name,
		legend: formula.legend,
		limit: formula.limit || null,
		orderBy: formula.order?.map((order) => ({
			columnName: order?.key?.name,
			order: order?.direction,
		})),
	} as unknown) as IBuilderFormula;

	return result;
};
