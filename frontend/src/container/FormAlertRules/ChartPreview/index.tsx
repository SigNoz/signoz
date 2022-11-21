import { InfoCircleOutlined } from '@ant-design/icons';
import { notification } from 'antd';
import { StaticLineProps } from 'components/Graph';
import GridGraphComponent from 'container/GridGraphComponent';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import getChartData from 'lib/getChartData';
import React, { useEffect, useState } from 'react';
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
	threshold?: number | undefined;
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
	const { t } = useTranslation('alerts');
	const [fetchError, setFetchError] = useState('');
	const staticLine: StaticLineProps | undefined =
		threshold !== undefined
			? {
					yMin: threshold,
					yMax: threshold,
					borderColor: '#f14',
					borderWidth: 1,
					lineText: `${t('preview_chart_threshold_label')} (y=${threshold})`,
					textColor: '#f14',
			  }
			: undefined;

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
			query &&
			((query.queryType === EQueryType.PROM &&
				query.promQL?.length > 0 &&
				query.promQL[0].query !== '') ||
				(query.queryType === EQueryType.CLICKHOUSE &&
					query.clickHouse?.length > 0 &&
					query.clickHouse[0].rawQuery &&
					query.clickHouse[0].rawQuery.length > 25) ||
				(query.queryType === EQueryType.QUERY_BUILDER &&
					query.metricsBuilder?.queryBuilder?.length > 0 &&
					query.metricsBuilder?.queryBuilder[0].metricName !== '')),
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

	useEffect(() => {
		if (queryResponse?.data?.error || queryResponse?.isError) {
			const errorMessage =
				queryResponse?.data?.error || t('preview_chart_unexpected_error');

			setFetchError(errorMessage as string);
			notification.error({
				message: errorMessage,
			});
		}
	}, [t, queryResponse?.data?.error, fetchError, queryResponse?.isError]);

	return (
		<ChartContainer>
			{headline}
			{fetchError && (
				<FailedMessageContainer color="red" title="Failed to refresh the chart">
					<InfoCircleOutlined /> {fetchError}
				</FailedMessageContainer>
			)}

			{chartDataSet && !queryResponse.isError && (
				<GridGraphComponent
					title={name}
					data={chartDataSet}
					isStacked
					GRAPH_TYPES={graphType || 'TIME_SERIES'}
					name={name || 'Chart Preview'}
					staticLine={staticLine}
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
	threshold: undefined,
};

export default ChartPreview;
