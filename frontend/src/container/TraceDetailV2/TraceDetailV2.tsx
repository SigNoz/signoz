import './TraceDetailsV2.styles.scss';

import { CaretDownFilled, CaretRightFilled } from '@ant-design/icons';
import { Typography } from 'antd';
import TimelineV2 from 'container/TimelineV2/TimelineV2';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import { ListRange, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import {
	GetTraceDetailsSuccessResponse,
	SpanItem,
} from 'types/api/trace/getTraceDetails';

import { LEFT_COL_WIDTH } from './constants';

interface ITraceDetailV2Props {
	uncollapsedNodes: string[];
	spanID: string;
	setSpanID: React.Dispatch<React.SetStateAction<string>>;
	setUncollapsedNodes: React.Dispatch<React.SetStateAction<string[]>>;
	traceDetailsResponse?: GetTraceDetailsSuccessResponse;
}

function getSpanItemRenderer(
	index: number,
	data: SpanItem,
	uncollapsedNodes: string[],
	setUncollapsedNodes: React.Dispatch<React.SetStateAction<string[]>>,
	setSpanID: React.Dispatch<React.SetStateAction<string>>,
	startTimeTraceTimeline: number,
	endTimeTraceTimeline: number,
): JSX.Element {
	// this is the total duration of the trace
	const baseSpread = endTimeTraceTimeline - startTimeTraceTimeline;
	const currentSpanShare = (data.durationNano / (baseSpread * 1000000)) * 100;
	const currentSpanLeftOffsert =
		((data.timestamp * 1000 - startTimeTraceTimeline) / baseSpread) * 100;

	function handleOnCollapseExpand(collapse: boolean): void {
		if (collapse) {
			setUncollapsedNodes((prev) => prev.filter((id) => id !== data.spanID));
		} else {
			setUncollapsedNodes((prev) => [...prev, data.spanID]);
		}
		setSpanID(data.spanID);
	}
	return (
		<div key={index} className="span-container">
			<section
				className="span-container-details-section"
				style={{ width: `${LEFT_COL_WIDTH}px`, paddingLeft: `${data.level * 5}px` }}
			>
				<div className="span-header-row">
					{data.childrenCount > 0 && (
						<div className="span-count-collapse">
							<Typography.Text>{data.childrenCount}</Typography.Text>
							{uncollapsedNodes.includes(data.spanID) ? (
								<CaretDownFilled
									size={14}
									className="collapse-uncollapse-icon"
									onClick={(): void => handleOnCollapseExpand(true)}
								/>
							) : (
								<CaretRightFilled
									size={14}
									className="collapse-uncollapse-icon"
									onClick={(): void => handleOnCollapseExpand(false)}
								/>
							)}
						</div>
					)}
				</div>
				<div className="span-description">
					<Typography.Text className="span-name">{data.name}</Typography.Text>
					<Typography.Text className="span-service-name">
						{data.serviceName}
					</Typography.Text>
				</div>
			</section>
			<section className="span-container-duration-section">
				<div
					style={{
						width: `${currentSpanShare}%`,
						left: `${currentSpanLeftOffsert}%`,
						border: '1px solid white',
						position: 'relative',
					}}
				/>
			</section>
		</div>
	);
}

function TraceDetailV2(props: ITraceDetailV2Props): JSX.Element {
	const {
		traceDetailsResponse,
		setUncollapsedNodes,
		setSpanID,
		spanID,
		uncollapsedNodes,
	} = props;
	const isInitialLoad = useRef(true);
	const handleEndReached = (index: number): void => {
		if (traceDetailsResponse?.spans?.[index]?.spanID)
			setSpanID(traceDetailsResponse.spans[index].spanID);
	};
	const handleRangeChanged = (range: ListRange): void => {
		const { startIndex } = range;

		// Only trigger the function after the initial load
		if (isInitialLoad.current && startIndex > 0) {
			isInitialLoad.current = false;
			return;
		}

		if (
			!isInitialLoad.current &&
			startIndex === 0 &&
			traceDetailsResponse?.spans?.[0]?.spanID
		) {
			setSpanID(traceDetailsResponse.spans[0].spanID);
		}
	};

	const ref = useRef<VirtuosoHandle>(null);

	useEffect(() => {
		if (traceDetailsResponse?.spans && traceDetailsResponse.spans.length > 0) {
			const currentInterestedSpanIndex =
				traceDetailsResponse?.spans?.findIndex((val) => val.spanID === spanID) || 0;

			setTimeout(() => {
				ref.current?.scrollToIndex({
					index: currentInterestedSpanIndex,
					behavior: 'auto',
				});
			}, 10);
		}
	}, [spanID, traceDetailsResponse?.spans]);

	return (
		<div className="trace-details-v2-container">
			<section className="trace-details-v2-flame-graph">
				<div
					className="trace-details-metadata"
					style={{ width: `${LEFT_COL_WIDTH}px` }}
				>
					<Typography.Text className="spans-count">Total Spans</Typography.Text>
					<Typography.Text>{traceDetailsResponse?.totalSpans || 0}</Typography.Text>
				</div>
				<div className="trace-details-flame-graph">
					<Typography.Text>Flame graph comes here...</Typography.Text>
				</div>
			</section>
			<section className="timeline-graph">
				<Typography.Text
					className="global-start-time-marker"
					style={{ width: `${LEFT_COL_WIDTH}px` }}
				>
					{dayjs(traceDetailsResponse?.startTimestampMillis).format(
						'hh:mm:ss a MM/DD',
					)}
				</Typography.Text>
				<TimelineV2 />
			</section>
			<section className="trace-details-v2-waterfall-model">
				<Virtuoso
					ref={ref}
					rangeChanged={handleRangeChanged}
					data={traceDetailsResponse?.spans || []}
					endReached={handleEndReached}
					itemContent={(index, data): React.ReactNode =>
						getSpanItemRenderer(
							index,
							data,
							uncollapsedNodes,
							setUncollapsedNodes,
							setSpanID,
							traceDetailsResponse?.startTimestampMillis || 0,
							traceDetailsResponse?.endTimestampMillis || 0,
						)
					}
					className="trace-details-v2-span-area"
				/>
			</section>
		</div>
	);
}

TraceDetailV2.defaultProps = {
	traceDetailsResponse: {},
};

export default TraceDetailV2;
