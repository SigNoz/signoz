import { InfoCircleOutlined } from '@ant-design/icons';
import { StaticLineProps } from 'components/Graph';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GridGraphComponent from 'container/GridGraphComponent';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { timePreferenceType } from 'container/NewWidget/RightContainer/timeItems';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import getChartData from 'lib/getChartData';
import React, { useMemo } from 'react';
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
	userQueryKey?: string;
}
interface QueryResponseError {
	message?: string;
}

function ChartPreview({
	name,
	query,
	graphType = PANEL_TYPES.TIME_SERIES,
	selectedTime = 'GLOBAL_TIME',
	selectedInterval = '5min',
	headline,
	threshold,
	userQueryKey,
}: ChartPreviewProps): JSX.Element | null {
	const { t } = useTranslation('alerts');
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

	const canQuery = useMemo((): boolean => {
		if (!query || query == null) {
			return false;
		}

		switch (query?.queryType) {
			case EQueryType.PROM:
				return query.promql?.length > 0 && query.promql[0].query !== '';
			case EQueryType.CLICKHOUSE:
				return (
					query.clickhouse_sql?.length > 0 &&
					query.clickhouse_sql[0].rawQuery?.length > 0
				);
			case EQueryType.QUERY_BUILDER:
				return (
					query.builder.queryData.length > 0 &&
					query.builder.queryData[0].queryName !== ''
				);
			default:
				return false;
		}
	}, [query]);

	const queryResponse = useQuery({
		queryKey: [
			'chartPreview',
			userQueryKey || JSON.stringify(query),
			selectedInterval,
		],
		queryFn: () =>
			GetMetricQueryRange({
				query: query || {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: {
						queryFormulas: [],
						queryData: [],
					},
					clickhouse_sql: [],
				},
				globalSelectedInterval: selectedInterval,
				graphType,
				selectedTime,
			}),
		retry: false,
		enabled: canQuery,
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
			{(queryResponse?.isError || queryResponse?.error) && (
				<FailedMessageContainer color="red" title="Failed to refresh the chart">
					<InfoCircleOutlined />{' '}
					{(queryResponse?.error as QueryResponseError).message ||
						t('preview_chart_unexpected_error')}
				</FailedMessageContainer>
			)}
			{queryResponse.isLoading && <Spinner size="large" tip="Loading..." />}
			{chartDataSet && !queryResponse.isError && (
				<GridGraphComponent
					title={name}
					data={chartDataSet}
					isStacked
					GRAPH_TYPES={graphType || PANEL_TYPES.TIME_SERIES}
					name={name || 'Chart Preview'}
					staticLine={staticLine}
				/>
			)}
		</ChartContainer>
	);
}

ChartPreview.defaultProps = {
	graphType: PANEL_TYPES.TIME_SERIES,
	selectedTime: 'GLOBAL_TIME',
	selectedInterval: '5min',
	headline: undefined,
	threshold: undefined,
	userQueryKey: '',
};

export default ChartPreview;
