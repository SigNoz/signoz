import { IClickHouseQuery } from 'types/api/queryBuilder/queryBuilderData';

export interface IClickHouseQueryHandleChange {
	queryIndex: number | string;
	query?: IClickHouseQuery['query'];
	legend?: IClickHouseQuery['legend'];
	toggleDisable?: IClickHouseQuery['disabled'];
	toggleDelete?: boolean;
}
