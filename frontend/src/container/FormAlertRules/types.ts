import { AlertDef } from 'types/api/alerts/create';
import { MetricQuery } from 'types/api/metrics/compositeQuery';

export type QueryType = 0 | 1 | 2;
/* unused
export interface MetricQueryList {
	[key: string]: MetricQueryLocal;
}

export type MetricQueryLocal = MetricQuery & {
	name: string;
	disabled: boolean;
	toggleDisable: boolean;
	toggleDelete: boolean;
}

export type Query = {
	name: string;
	disabled: boolean;
	promQL: {};
	clickHouseQuery: string;
	queryBuilder: {};
};

export const defaultAlert: AlertDef = {
	alert: '',
}

export const baseQuery: Query = {
	name: 'A',
	disabled: false,

	promQL: {
		query: '',
		legend: '',
	},
	clickHouseQuery: '',
	queryBuilder: {
		metricName: null,
		aggregateOperator: null,
		tagFilters: {
			op: 'AND',
			items: [],
		},
		groupBy: [],
	},
};

*/