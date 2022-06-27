import { AlertDef } from 'types/api/alerts/create';

export type QueryType = 0 | 1 | 2;

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
