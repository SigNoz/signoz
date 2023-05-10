import { QueryBuilderData } from 'types/common/queryBuilder';
import {
	MapFormula,
	MapQuery,
	MapQueryDataToApiResult,
} from 'types/common/queryBuilderMappers.types';

export const mapQueryDataToApi = (
	data: QueryBuilderData,
): MapQueryDataToApiResult => {
	const newLegendMap: Record<string, string> = {};

	const preparedQueryData: MapQuery = data.queryData.reduce<MapQuery>(
		(acc, query) => {
			const newResult: MapQuery = {
				...acc,
				[query.queryName]: {
					...query,
				},
			};

			newLegendMap[query.queryName] = query.legend;

			return newResult;
		},
		{},
	);

	const preparedFormulaData: MapFormula = data.queryFormulas.reduce<MapFormula>(
		(acc, formula) => {
			const newResult: MapFormula = {
				...acc,
				[formula.queryName]: {
					...formula,
				},
			};

			newLegendMap[formula.queryName] = formula.legend;

			return newResult;
		},
		{},
	);

	return {
		data: { ...preparedQueryData, ...preparedFormulaData },
		newLegendMap,
	};
};
