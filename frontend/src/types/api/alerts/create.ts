import { AlertDef } from 'types/api/alerts/def';

import { defaultCompareOp, defaultEvalWindow, defaultMatchType } from './def';

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
					name: 'A',
					formulaOnly: false,
					metricName: '',
					tagFilters: {
						op: 'AND',
						items: [],
					},
					groupBy: [],
					aggregateOperator: 1,
					expression: 'A',
					disabled: false,
					toggleDisable: false,
					toggleDelete: false,
				},
			},
			promQueries: {},
			queryType: 1,
		},
		op: defaultCompareOp,
		matchType: defaultMatchType,
	},
	labels: {
		severity: 'warning',
	},
	annotations: {
		description: 'A new alert',
	},
	evalWindow: defaultEvalWindow,
};
