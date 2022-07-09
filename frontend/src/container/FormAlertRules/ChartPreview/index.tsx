import GridGraphComponent from 'container/GridGraphComponent';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import getChartData from 'lib/getChartData';
import React, { useEffect } from 'react';
import { useQuery } from 'react-query';
import { GetMetricQueryRange } from 'store/actions/dashboard/getQueryResults';
import { Query } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { ChartContainer } from './styles';

export interface ChartPreviewProps {
	name: string;
	query: Query | undefined;
	graphType: GRAPH_TYPES | undefined;
	selectedTime: timePreferenceType | undefined;
	selectedInterval: Time | undefined;
}

function ChartPreview({
	name,
	query,
	graphType = 'TIME_SERIES',
	selectedTime = 'GLOBAL_TIME',
	selectedInterval = '5min',
}: ChartPreviewProps): JSX.Element | null {
	const queryKey = JSON.stringify(query);
	const queryResponse = useQuery({
		queryKey: ['chartPreview', queryKey],
		queryFn: () =>
			GetMetricQueryRange({
				query: query || {
					queryType: 1,
					promQL: [],
					metricsBuilder: {
						formulas: [],
						queryBuilder: [],
					},
					clickHouse: [],
				},
				globalSelectedInterval: selectedInterval,
				graphType,
				selectedTime,
			}),
		enabled:
			query != null &&
			(query.queryType !== EQueryType.PROM ||
				(query.promQL?.length > 0 && query.promQL[0].query !== '')),
	});

	const chartDataSet = queryResponse.isError
		? []
		: getChartData({
				queryData: [
					{
						queryData: queryResponse?.data?.payload?.data?.result
							? queryResponse?.data?.payload?.data?.result
							: [],
					},
				],
		  });

	return (
		<ChartContainer>
			{chartDataSet && !queryResponse.isError && (
				<GridGraphComponent
					title={name}
					data={chartDataSet}
					isStacked
					GRAPH_TYPES={graphType || 'TIME_SERIES'}
					name={name || 'Chart Preview'}
				/>
			)}
		</ChartContainer>
	);
}

export default ChartPreview;
