// @ts-nocheck
/* eslint-disable */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Progress, Skeleton, Tooltip, Typography } from 'antd';
import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import { themeColors } from 'constants/theme';
import useGetTraceFlamegraph from 'hooks/trace/useGetTraceFlamegraph';
import useDebounce from 'hooks/useDebounce';
import useUrlQuery from 'hooks/useUrlQuery';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { TraceDetailFlamegraphURLProps } from 'types/api/trace/getTraceFlamegraph';
import { Span } from 'types/api/trace/getTraceV2';

import { TraceFlamegraphStates } from './constants';
import Error from './TraceFlamegraphStates/Error/Error';
import NoData from './TraceFlamegraphStates/NoData/NoData';
// import Success from './TraceFlamegraphStates/Success/SuccessV2';
// import Success from './TraceFlamegraphStates/Success/SuccessV3_without_minimap_best';
import Success from './TraceFlamegraphStates/Success/Success_zoom';

// import Success from './TraceFlamegraphStates/Success/Success_zoom_api';
// import Success from './TraceFlamegraphStates/Success/SuccessCursor';
// import Success from './TraceFlamegraphStates/Success/Success';
import './PaginatedTraceFlamegraph.styles.scss';

interface ViewWindow {
	viewStart: number;
	viewEnd: number;
	topSpanId: string;
}

interface ITraceFlamegraphProps {
	serviceExecTime: Record<string, number>;
	startTime: number;
	endTime: number;
	traceFlamegraphStatsWidth: number;
	selectedSpan: Span | undefined;
}

function TraceFlamegraph(props: ITraceFlamegraphProps): JSX.Element {
	const {
		serviceExecTime,
		startTime,
		endTime,
		traceFlamegraphStatsWidth,
		selectedSpan,
	} = props;
	const { id: traceId } = useParams<TraceDetailFlamegraphURLProps>();
	const urlQuery = useUrlQuery();
	const [firstSpanAtFetchLevel, setFirstSpanAtFetchLevel] = useState<string>(
		urlQuery.get('spanId') || '',
	);
	useEffect(() => {
		setFirstSpanAtFetchLevel(urlQuery.get('spanId') || '');
	}, [urlQuery]);

	// --- Zoom-based API re-fetch orchestration ---

	// Raw view window from the canvas child (updated on every zoom/drag frame)
	const [rawViewWindow, setRawViewWindow] = useState<ViewWindow | null>(null);

	// Debounced view window — settles 300ms after the last zoom/drag interaction
	const debouncedViewWindow = useDebounce(rawViewWindow, 300);

	// Store trace extents from data in a ref to break the circular dependency
	// (apiParams depends on extents, data depends on apiParams)
	const traceExtentsRef = useRef({ fullStart: 0, fullEnd: 0 });

	// Callback for the canvas child to report its current visible window
	const handleViewWindowChange = useCallback(
		(viewStart: number, viewEnd: number, topSpanId: string) => {
			setRawViewWindow({ viewStart, viewEnd, topSpanId });
		},
		[],
	);

	// Derive API params from the debounced view window
	const apiParams = useMemo(() => {
		const { fullStart, fullEnd } = traceExtentsRef.current;
		const fullSpan = fullEnd - fullStart;

		if (!debouncedViewWindow || fullSpan <= 0) {
			return {
				selectedSpanId: firstSpanAtFetchLevel,
				boundaryStartTsMilli: undefined,
				boundarEndTsMilli: undefined,
			};
		}

		const { viewStart, viewEnd, topSpanId } = debouncedViewWindow;
		const viewSpan = viewEnd - viewStart;
		const ratio = viewSpan / fullSpan;

		// Only send boundaries when zoomed in past 80% threshold
		if (ratio < 0.8) {
			const padding = viewSpan * 0.5; // 2x fetch width (50% padding each side)
			return {
				// CRITICAL: always use firstSpanAtFetchLevel (never topSpanId) so the
				// backend's lowerLimit/upperLimit stays constant across all zoom fetches.
				// Changing selectedSpanId shifts lowerLimit → Spans[i] represents a
				// different absolute level → wrong canvas Y-positions → spans don't appear.
				selectedSpanId: firstSpanAtFetchLevel,
				boundaryStartTsMilli: Math.floor(Math.max(fullStart, viewStart - padding)),
				boundarEndTsMilli: Math.ceil(Math.min(fullEnd, viewEnd + padding)),
			};
		}

		// Not zoomed enough — use default params (no boundaries)
		return {
			selectedSpanId: firstSpanAtFetchLevel,
			boundaryStartTsMilli: undefined,
			boundarEndTsMilli: undefined,
		};
	}, [debouncedViewWindow, firstSpanAtFetchLevel]);

	// Single query with dynamic params
	const { data, isFetching, error } = useGetTraceFlamegraph({
		traceId,
		selectedSpanId: apiParams.selectedSpanId,
		limit: 10001,
		boundaryStartTsMilli: apiParams.boundaryStartTsMilli,
		boundarEndTsMilli: apiParams.boundarEndTsMilli,
	});

	// Update trace extents ref when data arrives (breaks circular dep)
	useEffect(() => {
		if (data?.payload) {
			traceExtentsRef.current = {
				fullStart: data.payload.startTimestampMillis,
				fullEnd: data.payload.endTimestampMillis,
			};
		}
	}, [data?.payload]);

	// Is this a zoom-triggered fetch (vs initial load)?
	const isZoomFetching = isFetching && apiParams.boundaryStartTsMilli !== undefined;

	// get the current state of trace flamegraph based on the API lifecycle
	const traceFlamegraphState = useMemo(() => {
		if (isFetching) {
			if (
				data &&
				data.payload &&
				data.payload.spans &&
				data.payload.spans.length > 0
			) {
				return TraceFlamegraphStates.FETCHING_WITH_OLD_DATA_PRESENT;
			}
			return TraceFlamegraphStates.LOADING;
		}
		if (error) {
			return TraceFlamegraphStates.ERROR;
		}
		if (
			data &&
			data.payload &&
			data.payload.spans &&
			data.payload.spans.length === 0
		) {
			return TraceFlamegraphStates.NO_DATA;
		}

		return TraceFlamegraphStates.SUCCESS;
	}, [error, isFetching, data]);

	// capture the spans from the response, since we do not need to do any manipulation on the same we will keep this as a simple constant [ memoized ]
	const spans = useMemo(() => data?.payload?.spans || [], [
		data?.payload?.spans,
	]);

	// get the content based on the current state of the trace waterfall
	const getContent = useMemo(() => {
		switch (traceFlamegraphState) {
			case TraceFlamegraphStates.LOADING:
				return (
					<div className="loading-skeleton">
						<Skeleton active paragraph={{ rows: 3 }} />
					</div>
				);
			case TraceFlamegraphStates.ERROR:
				return <Error error={error as AxiosError} />;
			case TraceFlamegraphStates.NO_DATA:
				return <NoData id={traceId} />;
			case TraceFlamegraphStates.SUCCESS:
			case TraceFlamegraphStates.FETCHING_WITH_OLD_DATA_PRESENT:
				return (
					<Success
						spans={spans}
						firstSpanAtFetchLevel={firstSpanAtFetchLevel}
						setFirstSpanAtFetchLevel={setFirstSpanAtFetchLevel}
						traceMetadata={{
							startTime: data?.payload?.startTimestampMillis || 0,
							endTime: data?.payload?.endTimestampMillis || 0,
						}}
						selectedSpan={selectedSpan}
						onViewWindowChange={handleViewWindowChange}
						isZoomFetching={isZoomFetching}
					/>
				);
			default:
				return <Spinner tip="Fetching the trace!" />;
		}
	}, [
		data?.payload?.endTimestampMillis,
		data?.payload?.startTimestampMillis,
		error,
		firstSpanAtFetchLevel,
		handleViewWindowChange,
		isZoomFetching,
		selectedSpan,
		spans,
		traceFlamegraphState,
		traceId,
	]);

	const spread = useMemo(() => endTime - startTime, [endTime, startTime]);

	return (
		<div className="flamegraph">
			<div
				className="flamegraph-stats"
				style={{ width: `${traceFlamegraphStatsWidth + 22}px` }}
			>
				<div className="exec-time-service">% exec time</div>
				<div className="stats">
					{Object.keys(serviceExecTime)
						.sort((a, b) => {
							if (spread <= 0) {
								return 0;
							}
							const aValue = (serviceExecTime[a] * 100) / spread;
							const bValue = (serviceExecTime[b] * 100) / spread;
							return bValue - aValue;
						})
						.map((service) => {
							const value =
								spread <= 0 ? 0 : (serviceExecTime[service] * 100) / spread;
							const color = generateColor(service, themeColors.traceDetailColors);
							return (
								<div key={service} className="value-row">
									<section className="service-name">
										<div className="square-box" style={{ backgroundColor: color }} />
										<Tooltip title={service}>
											<Typography.Text className="service-text" ellipsis>
												{service}
											</Typography.Text>
										</Tooltip>
									</section>
									<section className="progress-service">
										<Progress
											percent={parseFloat(value.toFixed(2))}
											className="service-progress-indicator"
											showInfo={false}
										/>
										<Typography.Text className="percent-value">
											{parseFloat(value.toFixed(2))}%
										</Typography.Text>
									</section>
								</div>
							);
						})}
				</div>
			</div>
			<div
				className="flamegraph-chart"
				style={{ width: `calc(100% - ${traceFlamegraphStatsWidth + 22}px)` }}
			>
				{getContent}
			</div>
		</div>
	);
}

export default TraceFlamegraph;
