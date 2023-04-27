import { Time } from 'container/TopNav/DateTimeSelection/config';
import { GetQueryResultsProps } from 'store/actions/dashboard/getQueryResults';
import { EAggregateOperator, EQueryType } from 'types/common/dashboard';

export const resultQueryName = 'RESULT';

export type MakeDurationQueryProps = {
	widgetId: string;
	selectedTime: Time;
	serviceName: string;
};

export function makeDurationQuery(
	props: MakeDurationQueryProps,
): GetQueryResultsProps {
	return {
		globalSelectedInterval: props.selectedTime,
		graphType: 'TIME_SERIES',
		variables: {},
		selectedTime: 'GLOBAL_TIME',
		widgetId: props.widgetId,
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			metricsBuilder: {
				queryBuilder: [
					{
						name: 'A',
						disabled: true,
						tagFilters: {
							items: [
								{
									id: '',
									key: 'service_name',
									op: 'IN',
									value: [props.serviceName],
								},
							],
							op: 'AND',
						},
						legend: 'A',
						aggregateOperator: EAggregateOperator.SUM_RATE,
						metricName: 'signoz_external_call_latency_sum',
						groupBy: ['address'],
					},
					{
						name: 'B',
						disabled: true,
						tagFilters: {
							items: [
								{
									id: '',
									key: 'service_name',
									op: 'IN',
									value: [props.serviceName],
								},
							],
							op: 'AND',
						},
						legend: 'B',
						aggregateOperator: EAggregateOperator.SUM_RATE,
						metricName: 'signoz_external_call_latency_count',
						groupBy: ['address'],
					},
				],
				formulas: [
					{
						disabled: false,
						expression: 'A/B',
						legend: '{{address}}',
						name: resultQueryName,
					},
				],
			},
			clickHouse: [],
			promQL: [],
		},
	};
}

export type MakeErrPercentQueryProps = {
	widgetId: string;
	selectedTime: Time;
	serviceName: string;
};

export function makeErrPercentQuery(
	props: MakeErrPercentQueryProps,
): GetQueryResultsProps {
	return {
		globalSelectedInterval: props.selectedTime,
		graphType: 'TIME_SERIES',
		variables: {},
		selectedTime: 'GLOBAL_TIME',
		widgetId: props.widgetId,
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			metricsBuilder: {
				queryBuilder: [
					{
						name: 'A',
						disabled: true,
						tagFilters: {
							items: [
								{
									id: '',
									key: 'service_name',
									op: 'IN',
									value: [props.serviceName],
								},
							],
							op: 'AND',
						},
						legend: 'A',
						aggregateOperator: EAggregateOperator.SUM_RATE,
						metricName: 'signoz_external_call_latency_count',
						groupBy: ['address'],
					},
					{
						name: 'B',
						disabled: true,
						tagFilters: {
							items: [
								{
									id: '',
									key: 'service_name',
									op: 'IN',
									value: [props.serviceName],
								},
							],
							op: 'AND',
						},
						legend: 'B',
						aggregateOperator: EAggregateOperator.SUM_RATE,
						metricName: 'signoz_external_call_latency_count',
						groupBy: ['address'],
					},
				],
				formulas: [
					{
						disabled: false,
						expression: 'A*100/B',
						legend: '{{address}}',
						name: resultQueryName,
					},
				],
			},
			clickHouse: [],
			promQL: [],
		},
	};
}

export type MakeReqRateQueryProps = {
	widgetId: string;
	selectedTime: Time;
	serviceName: string;
};
export function makeReqRateQuery(
	props: MakeErrPercentQueryProps,
): GetQueryResultsProps {
	return {
		globalSelectedInterval: props.selectedTime,
		graphType: 'TIME_SERIES',
		variables: {},
		selectedTime: 'GLOBAL_TIME',
		widgetId: props.widgetId,
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			metricsBuilder: {
				queryBuilder: [
					{
						name: 'A',
						disabled: true,
						tagFilters: {
							items: [
								{
									id: '',
									key: 'service_name',
									op: 'IN',
									value: [props.serviceName],
								},
							],
							op: 'AND',
						},
						legend: '{{address}}',
						aggregateOperator: EAggregateOperator.SUM_RATE,
						metricName: 'signoz_external_call_latency_count',
						groupBy: ['address'],
					},
				],
				formulas: [
					{
						disabled: false,
						expression: 'A',
						legend: '{{address}}',
						name: resultQueryName,
					},
				],
			},
			clickHouse: [],
			promQL: [],
		},
	};
}
