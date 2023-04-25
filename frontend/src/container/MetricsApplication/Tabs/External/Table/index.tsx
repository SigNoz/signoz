import { ResizeTable } from 'components/ResizeTable';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import React from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import {
	GetMetricQueryRange,
	GetQueryResults,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Query } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import {
	EAggregateOperator,
	EQueryType,
	EReduceOperator,
} from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';

function Table(props: TableProps): JSX.Element {
	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const getQueryResultsProps: GetQueryResultsProps = {
		globalSelectedInterval: selectedTime,
		graphType: 'VALUE',
		variables: {},
		selectedTime: 'GLOBAL_TIME',
		widgetId: 'abc',
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			metricsBuilder: {
				formulas: [],
				queryBuilder: [
					{
						name: 'A',
						disabled: false,
						tagFilters: {
							items: [
								{
									id: '',
									key: 'service_name',
									op: 'IN',
									value: ['frontend'],
								},
							],
							op: 'AND',
						},
						legend: 'A',
						aggregateOperator: EAggregateOperator.SUM,
						metricName: 'signoz_external_call_latency_count',
						groupBy: ['address'],
						reduceTo: EReduceOperator['Average of values in timeframe'],
					},
				],
			},
			clickHouse: [],
			promQL: [],
		},
	};

	const response = useQuery<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>(`Abc`, () => GetMetricQueryRange(getQueryResultsProps));

	console.log('timez', minTime, maxTime, selectedTime);
	console.log('response', response);

	return (
		<div>
			<ResizeTable
				columns={[
					{
						title: 'Address',
						dataIndex: 'address',
						key: 'address',
					},
					{
						title: 'Req. rate',
						dataIndex: 'reqRate',
						key: 'reqRate',
					},
					{
						title: 'Error %',
						dataIndex: 'errPercentage',
						key: 'errPercentage',
					},
					{
						title: 'Duration (ms)',
						dataIndex: 'duration',
						key: 'duration',
					},
				]}
			/>
		</div>
	);
}

interface TableProps {
	queries: Query[];
}

export default Table;
