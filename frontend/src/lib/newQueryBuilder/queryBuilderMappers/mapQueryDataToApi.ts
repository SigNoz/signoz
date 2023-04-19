import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { QueryBuilderData } from 'types/common/queryBuilder';

type MapQueryDataToApiResult = Record<string, IBuilderQuery | IBuilderFormula>;
type MapQuery = Record<string, IBuilderQuery>;
type MapFormula = Record<string, IBuilderFormula>;

export const mapQueryDataToApi = (
	data: QueryBuilderData,
): MapQueryDataToApiResult => {
	const preparedQueryData: MapQuery = data.queryData.reduce<MapQuery>(
		(acc, query) => {
			const { legend, ...restQuery } = query;

			const newResult: MapQuery = {
				...acc,
				[restQuery.queryName]: {
					...restQuery,
				},
			};

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

	return { ...preparedQueryData, ...preparedFormulaData };
};
