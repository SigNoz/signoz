import './PaginatedTraceFlamegraph.styles.scss';

import { Progress, Skeleton, Tooltip, Typography } from 'antd';
import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import { themeColors } from 'constants/theme';
import useGetTraceFlamegraph from 'hooks/trace/useGetTraceFlamegraph';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TraceDetailFlamegraphURLProps } from 'types/api/trace/getTraceFlamegraph';
import { Span } from 'types/api/trace/getTraceV2';

import { TraceFlamegraphStates } from './constants';
import Error from './TraceFlamegraphStates/Error/Error';
import NoData from './TraceFlamegraphStates/NoData/NoData';
import Success from './TraceFlamegraphStates/Success/Success';

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

	const { data, isFetching, error } = useGetTraceFlamegraph({
		traceId,
		selectedSpanId: firstSpanAtFetchLevel,
	});
	const isDarkMode = useIsDarkMode();

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
		selectedSpan,
		spans,
		traceFlamegraphState,
		traceId,
	]);

	return (
		<div className="flamegraph">
			<div
				className="flamegraph-stats"
				style={{ width: `${traceFlamegraphStatsWidth + 22}px` }}
			>
				<div className="exec-time-service">% exec time</div>
				<div className="stats">
					{Object.keys(serviceExecTime).map((service) => {
						const spread = endTime - startTime;
						const value = (serviceExecTime[service] * 100) / spread;
						const color = generateColor(
							service,
							isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
						);
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
