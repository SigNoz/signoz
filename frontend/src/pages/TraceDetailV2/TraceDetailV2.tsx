import './TraceDetailV2.styles.scss';

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@signozhq/resizable';
import { Button, Tabs } from 'antd';
import FlamegraphImg from 'assets/TraceDetail/Flamegraph';
import cx from 'classnames';
import TraceFlamegraph from 'container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph';
import SpanDetailsDrawer from 'container/SpanDetailsDrawer/SpanDetailsDrawer';
import TraceMetadata from 'container/TraceMetadata/TraceMetadata';
import TraceWaterfall, {
	IInterestedSpan,
} from 'container/TraceWaterfall/TraceWaterfall';
import useGetTraceV2 from 'hooks/trace/useGetTraceV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { defaultTo } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Span, TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

import NoData from './NoData/NoData';

function TraceDetailsV2(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV2URLProps>();
	const urlQuery = useUrlQuery();
	const [interestedSpanId, setInterestedSpanId] = useState<IInterestedSpan>(
		() => ({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		}),
	);
	const [
		traceFlamegraphStatsWidth,
		setTraceFlamegraphStatsWidth,
	] = useState<number>(450);
	const [isSpanDetailsDocked, setIsSpanDetailsDocked] = useState<boolean>(false);
	const [selectedSpan, setSelectedSpan] = useState<Span>();

	useEffect(() => {
		setInterestedSpanId({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		});
	}, [urlQuery]);

	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);
	const {
		data: traceData,
		isFetching: isFetchingTraceData,
		error: errorFetchingTraceData,
	} = useGetTraceV2({
		traceId,
		uncollapsedSpans: uncollapsedNodes,
		selectedSpanId: interestedSpanId.spanId,
		isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
	});

	useEffect(() => {
		if (traceData && traceData.payload && traceData.payload.uncollapsedSpans) {
			setUncollapsedNodes(traceData.payload.uncollapsedSpans);
		}
	}, [traceData]);

	useEffect(() => {
		if (selectedSpan) {
			setIsSpanDetailsDocked(false);
		}
	}, [selectedSpan]);

	const noData = useMemo(
		() =>
			!isFetchingTraceData &&
			!errorFetchingTraceData &&
			defaultTo(traceData?.payload?.spans?.length, 0) === 0,
		[
			errorFetchingTraceData,
			isFetchingTraceData,
			traceData?.payload?.spans?.length,
		],
	);

	useEffect(() => {
		if (noData) {
			setIsSpanDetailsDocked(true);
		}
	}, [noData]);

	const items = [
		{
			label: (
				<Button
					type="text"
					icon={<FlamegraphImg />}
					className="flamegraph-waterfall-toggle"
				>
					Flamegraph
				</Button>
			),
			key: 'flamegraph',
			children: (
				<>
					<TraceFlamegraph
						serviceExecTime={traceData?.payload?.serviceNameToTotalDurationMap || {}}
						startTime={traceData?.payload?.startTimestampMillis || 0}
						endTime={traceData?.payload?.endTimestampMillis || 0}
						traceFlamegraphStatsWidth={traceFlamegraphStatsWidth}
						selectedSpan={selectedSpan}
					/>
					<TraceWaterfall
						traceData={traceData}
						isFetchingTraceData={isFetchingTraceData}
						errorFetchingTraceData={errorFetchingTraceData}
						traceId={traceId}
						interestedSpanId={interestedSpanId}
						setInterestedSpanId={setInterestedSpanId}
						uncollapsedNodes={uncollapsedNodes}
						setTraceFlamegraphStatsWidth={setTraceFlamegraphStatsWidth}
						selectedSpan={selectedSpan}
						setSelectedSpan={setSelectedSpan}
					/>
				</>
			),
		},
	];

	return (
		<ResizablePanelGroup
			direction="horizontal"
			autoSaveId="trace-drawer"
			className="trace-layout"
		>
			<ResizablePanel minSize={20} maxSize={80} className="trace-left-content">
				<TraceMetadata
					traceID={traceId}
					duration={
						(traceData?.payload?.endTimestampMillis || 0) -
						(traceData?.payload?.startTimestampMillis || 0)
					}
					startTime={(traceData?.payload?.startTimestampMillis || 0) / 1e3}
					rootServiceName={traceData?.payload?.rootServiceName || ''}
					rootSpanName={traceData?.payload?.rootServiceEntryPoint || ''}
					totalErrorSpans={traceData?.payload?.totalErrorSpansCount || 0}
					totalSpans={traceData?.payload?.totalSpansCount || 0}
					notFound={noData}
				/>
				{!noData ? (
					<Tabs items={items} animated className="trace-visualisation-tabs" />
				) : (
					<NoData />
				)}
			</ResizablePanel>

			<ResizableHandle withHandle className="resizable-handle" />

			<ResizablePanel
				defaultSize={20}
				minSize={20}
				maxSize={50}
				className={cx('span-details-drawer', {
					'span-details-drawer-docked': isSpanDetailsDocked,
				})}
			>
				<SpanDetailsDrawer
					isSpanDetailsDocked={isSpanDetailsDocked}
					setIsSpanDetailsDocked={setIsSpanDetailsDocked}
					selectedSpan={selectedSpan}
					traceStartTime={traceData?.payload?.startTimestampMillis || 0}
					traceEndTime={traceData?.payload?.endTimestampMillis || 0}
				/>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

export default TraceDetailsV2;
