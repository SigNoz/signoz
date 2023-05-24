import { IClickHouseQuery } from 'types/api/queryBuilder/queryBuilderData';

export interface IClickHouseQueryHandleChange {
	queryIndex: number | string;
	rawQuery?: IClickHouseQuery['rawQuery'];
	legend?: IClickHouseQuery['legend'];
	toggleDisable?: IClickHouseQuery['disabled'];
	toggleDelete?: boolean;
}
