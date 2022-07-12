import { InfoCircleOutlined } from '@ant-design/icons';
import GridGraphComponent from 'container/GridGraphComponent';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import getChartData from 'lib/getChartData';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { GetMetricQueryRange } from 'store/actions/dashboard/getQueryResults';
import { Query } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

import { ChartContainer, FailedMessageContainer } from './styles';

export interface ChartPreviewProps {
	name: string;
	query: Query | undefined;
	graphType?: GRAPH_TYPES;
	selectedTime?: timePreferenceType;
	selectedInterval?: Time;
	headline?: JSX.Element;
	threshold?: number;
}

function ChartPreview({
	name,
	query,
	graphType = 'TIME_SERIES',
	selectedTime = 'GLOBAL_TIME',
	selectedInterval = '5min',
	headline,
	threshold,
}: ChartPreviewProps): JSX.Element | null {
	const { t } = useTranslation('rules');
	const annotations = [
		{
			type: 'line',
			yMin: threshold,
			yMax: threshold,
			borderColor: '#f14',
			borderWidth: 1,
			label: {
				content: `${t('preview_chart_threshold_label')} (y=${threshold})`,
				enabled: true,
				font: {
					size: 10,
				},
				borderWidth: 0,
				position: 'start',
				backgroundColor: 'transparent',
				color: '#f14',
			},
		},
	];
	const queryKey = JSON.stringify(query);
	const queryResponse = useQuery({
		queryKey: ['chartPreview', queryKey, selectedInterval],
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
		? null
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
			{headline}
			{(queryResponse?.data?.error || queryResponse?.isError) && (
				<FailedMessageContainer color="red" title="Failed to refresh the chart">
					<InfoCircleOutlined />{' '}
					{queryResponse?.data?.error ||
						queryResponse?.error ||
						t('preview_chart_unexpected_error')}
				</FailedMessageContainer>
			)}

			{chartDataSet && !queryResponse.isError && (
				<GridGraphComponent
					title={name}
					data={chartDataSet}
					isStacked
					GRAPH_TYPES={graphType || 'TIME_SERIES'}
					name={name || 'Chart Preview'}
					annotations={threshold && threshold > 0 ? annotations : undefined}
				/>
			)}
		</ChartContainer>
	);
}

ChartPreview.defaultProps = {
	graphType: 'TIME_SERIES',
	selectedTime: 'GLOBAL_TIME',
	selectedInterval: '5min',
	headline: undefined,
	threshold: 0,
};

export default ChartPreview;
