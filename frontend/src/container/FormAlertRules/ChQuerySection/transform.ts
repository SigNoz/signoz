import { IChQuery } from 'types/api/alerts/compositeQuery';
import { IClickHouseQuery } from 'types/api/dashboard/getAll';

// @description rawQueryToIChQuery transforms raw query (from ClickHouseQueryBuilder)
// to alert specific IChQuery format
export const rawQueryToIChQuery = (
	src: IChQuery,
	rawQuery: string | undefined,
	legend: string | undefined,
	toggleDelete: boolean | undefined,
): IChQuery => {
	if (toggleDelete) {
		return {
			rawQuery: '',
			legend: '',
			name: 'A',
			disabled: false,
			query: '',
		};
	}

	return {
		rawQuery: rawQuery !== undefined ? rawQuery : src.rawQuery,
		query: rawQuery !== undefined ? rawQuery : src.rawQuery,
		legend: legend !== undefined ? legend : src.legend,
		name: 'A',
		disabled: false,
	};
};

// @description toIClickHouseQuery transforms IChQuery (alert specific) to
// ClickHouseQueryBuilder format. The main difference is
// use of rawQuery (in ClickHouseQueryBuilder)
// and query (in alert builder)
export const toIClickHouseQuery = (src: IChQuery): IClickHouseQuery => {
	return { ...src, name: 'A', rawQuery: src.query };
};
