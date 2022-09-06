// import { IResourceAttributeQuery } from '../ResourceAttributesFilter/types';

import {
	IMetricsBuilderFormula,
	IMetricsBuilderQuery,
} from 'types/api/dashboard/getAll';

// const temp: object[] | undefined = [];
// const resourceAttributeQueriesToTagFilters = (
// 	resourceAttributeQueries: IResourceAttributeQuery[],
// ) => {
// 	resourceAttributeQueries.forEach((res) => {
// 		const temp_obj = {
// 			id: `${res.id}`,
// 			key: `${res.tagKey}`,
// 			op: `${res.operator}`,
// 			value: `${res.tagValue}`,
// 		};
// 		temp.push({ temp_obj });
// 	});
// 	return temp;
// };

// console.log(temp);

export const externalCallErrorPercent = (
	servicename: string | undefined,
	legend: '{{address}}',
	// resourceAttributeQueries: IResourceAttributeQuery[],
): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	return {
		formulas: [
			{
				name: 'F1',
				expression: 'A*100/B',
				disabled: false,
				legend: 'External Call Error Percentage',
			},
		],
		queryBuilder: [
			{
				name: 'A',
				aggregateOperator: 18,
				metricName: 'signoz_external_call_latency_count',
				tagFilters: {
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
						{
							id: '',
							key: 'status_code',
							op: 'IN',
							value: ['STATUS_CODE_ERROR'],
						},
						// ...temp,
					],

					op: 'AND',
				},
				groupBy: ['address'],
				legend,
				disabled: false,
			},
			{
				name: 'B',
				aggregateOperator: 18,
				metricName: 'signoz_external_call_latency_count',
				tagFilters: {
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
						// ...temp,
					],
					op: 'AND',
				},
				groupBy: ['address'],
				legend,
				disabled: false,
			},
		],
	};
};

export const externalCallDuration = (
	servicename: string | undefined,
): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	return {
		formulas: [
			{
				disabled: false,
				expression: 'A/B',
				name: 'F1',
				legend: 'Average Duration',
			},
		],
		queryBuilder: [
			{
				aggregateOperator: 18,
				disabled: true,
				groupBy: [],
				legend: '',
				metricName: 'signoz_external_call_latency_sum',
				name: 'A',
				reduceTo: 1,
				tagFilters: {
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
					],
					op: 'AND',
				},
			},
			{
				aggregateOperator: 18,
				disabled: true,
				groupBy: [],
				legend: '',
				metricName: 'signoz_external_call_latency_count',
				name: 'B',
				reduceTo: 1,
				tagFilters: {
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
						// 	{
						// 		id: '',
						// 		key: 'resource_service_namespace',
						// 		op: 'IN',
						// 		value: ['', 'test'],
						// 	},
					],
					op: 'AND',
				},
			},
		],
	};
};

export const externalCallRpsByAddress = (
	servicename: string | undefined,
	legend: '{{address}}',
): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	return {
		formulas: [],
		queryBuilder: [
			{
				aggregateOperator: 18,
				disabled: false,
				groupBy: ['address'],
				legend,
				metricName: 'signoz_external_call_latency_count',
				name: 'A',
				reduceTo: 1,
				tagFilters: {
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
					],
					op: 'AND',
				},
			},
		],
	};
};

export const externalCallDurationByAddress = (
	servicename: string | undefined,
	legend: '{{address}}',
): {
	formulas: IMetricsBuilderFormula[];
	queryBuilder: IMetricsBuilderQuery[];
} => {
	return {
		formulas: [
			{
				disabled: false,
				expression: 'A/B',
				name: 'F1',
				legend,
			},
		],
		queryBuilder: [
			{
				aggregateOperator: 18,
				disabled: false,
				groupBy: ['address'],
				legend,
				metricName: 'signoz_external_call_latency_sum',
				name: 'A',
				reduceTo: 1,
				tagFilters: {
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
					],
					op: 'AND',
				},
			},
			{
				aggregateOperator: 18,
				disabled: false,
				groupBy: ['address'],
				legend,
				metricName: 'signoz_external_call_latency_count',
				name: 'B',
				reduceTo: 1,
				tagFilters: {
					items: [
						{
							id: '',
							key: 'service_name',
							op: 'IN',
							value: [`${servicename}`],
						},
					],
					op: 'AND',
				},
			},
		],
	};
};
