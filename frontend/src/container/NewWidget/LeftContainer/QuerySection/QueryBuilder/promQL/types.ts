import { IPromQLQuery } from 'types/api/queryBuilder/queryBuilderData';

export interface IPromQLQueryHandleChange {
	queryIndex: number | string;
	query: IPromQLQuery;
}
