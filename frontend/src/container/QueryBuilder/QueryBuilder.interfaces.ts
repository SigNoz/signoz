import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';

export type QueryBuilderProps = {
	queryData: IBuilderQuery[];
	queryFormula: IBuilderFormula[];
};
