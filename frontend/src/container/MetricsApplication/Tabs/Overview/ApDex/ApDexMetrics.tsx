import { Space, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';
import {
	apDexToolTipText,
	apDexToolTipUrl,
	apDexToolTipUrlText,
} from 'constants/apDex';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import Graph from 'container/GridCardLayout/GridCard';
import DisplayThreshold from 'container/GridCardLayout/WidgetHeader/DisplayThreshold';
import {
	GraphTitle,
	SERVICE_CHART_ID,
} from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { apDexMetricsQueryBuilderQueries } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { ReactNode, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EQueryType } from 'types/common/dashboard';
import { v4 as uuid } from 'uuid';

import { IServiceName } from '../../types';
import { ApDexMetricsProps } from './types';

function ApDexMetrics({
	delta,
	metricsBuckets,
	thresholdValue,
	onDragSelect,
	tagFilterItems,
	topLevelOperationsRoute,
	handleGraphClick,
}: ApDexMetricsProps): JSX.Element {
	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const servicename = decodeURIComponent(encodedServiceName);

	const apDexMetricsWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: apDexMetricsQueryBuilderQueries({
						servicename,
						tagFilterItems,
						topLevelOperationsRoute,
						threashold: thresholdValue || 0,
						delta: delta || false,
						metricsBuckets: metricsBuckets || [],
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				title: (
					<Space>
						<Typography>{GraphTitle.APDEX}</Typography>
						<TextToolTip
							text={apDexToolTipText}
							url={apDexToolTipUrl}
							useFilledIcon={false}
							urlText={apDexToolTipUrlText}
						/>
					</Space>
				),
				panelTypes: PANEL_TYPES.TIME_SERIES,
				id: SERVICE_CHART_ID.apdex,
			}),
		[
			delta,
			metricsBuckets,
			servicename,
			tagFilterItems,
			thresholdValue,
			topLevelOperationsRoute,
		],
	);

	const threshold: ReactNode = useMemo(() => {
		if (thresholdValue) return <DisplayThreshold threshold={thresholdValue} />;
		return null;
	}, [thresholdValue]);

	const isQueryEnabled =
		topLevelOperationsRoute.length > 0 &&
		!!metricsBuckets &&
		metricsBuckets?.length > 0 &&
		delta !== undefined;

	return (
		<Graph
			widget={apDexMetricsWidget}
			onDragSelect={onDragSelect}
			onClickHandler={handleGraphClick('ApDex')}
			threshold={threshold}
			isQueryEnabled={isQueryEnabled}
			version={ENTITY_VERSION_V4}
		/>
	);
}

ApDexMetrics.defaultProps = {
	delta: undefined,
	le: undefined,
};

export default ApDexMetrics;
