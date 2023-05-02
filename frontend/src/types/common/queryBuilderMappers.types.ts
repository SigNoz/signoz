import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';

export type MapQuery = Record<string, IBuilderQuery>;
export type MapFormula = Record<string, IBuilderFormula>;

export type QueryDataResourse = Record<string, IBuilderQuery | IBuilderFormula>;

export type MapQueryDataToApiResult = {
	data: QueryDataResourse;
	newLegendMap: Record<string, string>;
};
