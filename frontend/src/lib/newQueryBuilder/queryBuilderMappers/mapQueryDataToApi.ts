import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';

type MapQueryDataToApiResult = {
	data: Record<string, IBuilderQuery | IBuilderFormula>;
	newLegendMap: Record<string, string>;
};
type MapQuery = Record<string, IBuilderQuery>;
type MapFormula = Record<string, IBuilderFormula>;

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

			return newResult;
		},
		{},
	);

	return {
		data: { ...preparedQueryData, ...preparedFormulaData },
		newLegendMap,
	};
};
