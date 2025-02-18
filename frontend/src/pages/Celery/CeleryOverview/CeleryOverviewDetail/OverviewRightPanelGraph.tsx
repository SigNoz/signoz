import { Color } from '@signozhq/design-tokens';
import { Card } from 'antd';
import logEvent from 'api/common/logEvent';
import { useGetGraphCustomSeries } from 'components/CeleryTask/useGetGraphCustomSeries';
import { useNavigateToTraces } from 'components/CeleryTask/useNavigateToTraces';
import { QueryParams } from 'constants/query';
import { ViewMenuAction } from 'container/GridCardLayout/config';
import GridCard from 'container/GridCardLayout/GridCard';
import { Button } from 'container/MetricsApplication/Tabs/styles';
import { onGraphClickHandler } from 'container/MetricsApplication/Tabs/util';
import useUrlQuery from 'hooks/useUrlQuery';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	celeryOverviewAvgLatencyGraphData,
	celeryOverviewErrorRateGraphData,
	celeryOverviewRequestRateGraphData,
} from '../CeleryOverviewGraphUtils';

export default function OverviewRightPanelGraph({
	groupByFilter,
	filters,
}: {
	groupByFilter?: BaseAutocompleteData;
	filters?: TagFilterItem[];
}): JSX.Element {
	const history = useHistory();
	const { pathname } = useLocation();
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, history, pathname, urlQuery],
	);

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const requestRateWidget = useMemo(
		() =>
			celeryOverviewRequestRateGraphData(minTime, maxTime, filters, groupByFilter),
		[minTime, maxTime, filters, groupByFilter],
	);

	const errorRateWidget = useMemo(
		() =>
			celeryOverviewErrorRateGraphData(minTime, maxTime, filters, groupByFilter),
		[minTime, maxTime, filters, groupByFilter],
	);

	const avgLatencyWidget = useMemo(
		() =>
			celeryOverviewAvgLatencyGraphData(minTime, maxTime, filters, groupByFilter),
		[minTime, maxTime, filters, groupByFilter],
	);
	const [selectedTimeStamp, setSelectedTimeStamp] = useState<number>(0);

	const handleSetTimeStamp = useCallback((selectTime: number) => {
		setSelectedTimeStamp(selectTime);
	}, []);

	const navigateToTraces = useNavigateToTraces();

	const handleGraphClick = useCallback(
		(type: string): OnClickPluginOpts['onClick'] => (
			xValue,
			yValue,
			mouseX,
			mouseY,
		): Promise<void> =>
			onGraphClickHandler(handleSetTimeStamp)(
				xValue,
				yValue,
				mouseX,
				mouseY,
				type,
			),
		[handleSetTimeStamp],
	);

	const goToTraces = useCallback(
		(widget: Widgets) => {
			const { stepInterval } = widget?.query?.builder?.queryData?.[0] ?? {};
			navigateToTraces(
				filters ?? [],
				selectedTimeStamp,
				selectedTimeStamp + (stepInterval ?? 60),
			);
		},
		[navigateToTraces, filters, selectedTimeStamp],
	);

	const { getCustomSeries } = useGetGraphCustomSeries({
		isDarkMode: false,
		drawStyle: 'bars',
		colorMapping: {
			True: Color.BG_CHERRY_500,
			False: Color.BG_FOREST_400,
			None: Color.BG_SLATE_200,
			'Request Rate': Color.BG_ROBIN_500,
		},
	});

	const [requestRateStatus, setRequestRateStatus] = useState<boolean | null>(
		null,
	);
	const [errorRateStatus, setErrorRateStatus] = useState<boolean | null>(null);
	const [avgLatencyStatus, setAvgLatencyStatus] = useState<boolean | null>(null);

	useEffect(() => {
		if (
			requestRateStatus !== null &&
			errorRateStatus !== null &&
			avgLatencyStatus !== null
		) {
			logEvent('MQ Overview Page: Right Drawer - graphs', {
				requestRate: requestRateStatus,
				errorRate: errorRateStatus,
				avgLatency: avgLatencyStatus,
			});
		}
	}, [requestRateStatus, errorRateStatus, avgLatencyStatus]);

	return (
		<Card className="overview-right-panel-graph-card">
			<div className="request-rate-card">
				<Button
					type="default"
					size="small"
					id="Celery_request_rate_button"
					onClick={(): void => {
						goToTraces(requestRateWidget);
					}}
				>
					View Traces
				</Button>
				<GridCard
					widget={requestRateWidget}
					headerMenuList={[...ViewMenuAction]}
					onDragSelect={onDragSelect}
					onClickHandler={handleGraphClick('Celery_request_rate')}
					customSeries={getCustomSeries}
					dataAvailable={(isDataAvailable: boolean): void => {
						setRequestRateStatus(isDataAvailable);
					}}
				/>
			</div>
			<div className="error-rate-card">
				<Button
					type="default"
					size="small"
					id="Celery_error_rate_button"
					onClick={(): void => goToTraces(errorRateWidget)}
				>
					View Traces
				</Button>
				<GridCard
					widget={errorRateWidget}
					headerMenuList={[...ViewMenuAction]}
					onDragSelect={onDragSelect}
					onClickHandler={handleGraphClick('Celery_error_rate')}
					customSeries={getCustomSeries}
					dataAvailable={(isDataAvailable: boolean): void => {
						setErrorRateStatus(isDataAvailable);
					}}
				/>
			</div>
			<div className="avg-latency-card">
				<Button
					type="default"
					size="small"
					id="Celery_avg_latency_button"
					onClick={(): void => goToTraces(avgLatencyWidget)}
				>
					View Traces
				</Button>
				<GridCard
					widget={avgLatencyWidget}
					headerMenuList={[...ViewMenuAction]}
					onDragSelect={onDragSelect}
					onClickHandler={handleGraphClick('Celery_avg_latency')}
					dataAvailable={(isDataAvailable: boolean): void => {
						setAvgLatencyStatus(isDataAvailable);
					}}
				/>
			</div>
		</Card>
	);
}

OverviewRightPanelGraph.defaultProps = {
	groupByFilter: undefined,
	filters: undefined,
};
