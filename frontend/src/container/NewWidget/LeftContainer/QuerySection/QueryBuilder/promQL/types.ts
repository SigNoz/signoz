import { IPromQLQuery } from 'types/api/dashboard/getAll';

export interface IPromQLQueryHandleChange {
	queryIndex: number;
	query?: IPromQLQuery['query'];
	legend?: IPromQLQuery['legend'];
	toggleDisable?: IPromQLQuery['disabled'];
	toggleDelete?: boolean;
}
