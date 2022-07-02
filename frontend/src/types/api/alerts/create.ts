import { AlertDef } from 'types/api/alerts/def';

export interface Props {
	data: AlertDef;
}

export interface PayloadProps {
	status: string;
	data: string;
}

export const alertDefaults: AlertDef = {
	condition: {
		compositeMetricQuery: {
			builderQueries: {
				A: {
					queryName: 'A',
					metricName: 'signoz_latency_count',
					tagFilters: {
						op: 'AND',
						items: [],
					},
					groupBy: [],
					aggregateOperator: 17,
					expression: 'A',
					disabled: false,
					toggleDisable: false,
					toggleDelete: false,
				},
			},
			promQueries: {},
			queryType: 1,
		},
		op: 'above',
		matchType: '0',
	},
	labels: {
		severity: 'warning',
	},
	annotations: {
		description: 'A new alert',
	},
	evalWindow: '5m0s',
};
