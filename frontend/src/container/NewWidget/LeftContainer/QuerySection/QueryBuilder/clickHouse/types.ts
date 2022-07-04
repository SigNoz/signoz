import { IClickHouseQuery } from 'types/api/dashboard/getAll';

export interface IClickHouseQueryHandleChange {
	queryIndex: number;
	rawQuery?: IClickHouseQuery['rawQuery'];
	legend?: IClickHouseQuery['legend'];
	toggleDisable?: IClickHouseQuery['disabled'];
	toggleDelete?: boolean;
}
