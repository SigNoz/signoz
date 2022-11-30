import { IClickHouseQuery } from 'types/api/dashboard/getAll';

export interface IClickHouseQueryHandleChange {
	queryIndex: number | string;
	rawQuery?: IClickHouseQuery['rawQuery'];
	legend?: IClickHouseQuery['legend'];
	toggleDisable?: IClickHouseQuery['disabled'];
	toggleDelete?: boolean;
}
