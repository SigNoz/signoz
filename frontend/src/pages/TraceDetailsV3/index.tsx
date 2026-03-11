import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@signozhq/resizable';
import useGetTraceV2 from 'hooks/trace/useGetTraceV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { Span, TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

import TraceDetailsHeader from './TraceDetailsHeader/TraceDetailsHeader';
import TraceFlamegraph from './TraceFlamegraph/TraceFlamegraph';
import TraceWaterfall, {
	IInterestedSpan,
} from './TraceWaterfall/TraceWaterfall';

function TraceDetailsV3(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV2URLProps>();
	const urlQuery = useUrlQuery();
	const [interestedSpanId, setInterestedSpanId] = useState<IInterestedSpan>(
		() => ({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		}),
	);
	const [
		_traceFlamegraphStatsWidth,
		setTraceFlamegraphStatsWidth,
	] = useState<number>(450);
	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);
	const [selectedSpan, setSelectedSpan] = useState<Span>();

	useEffect(() => {
		setInterestedSpanId({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		});
	}, [urlQuery]);

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

	return (
		<div
			style={{
				height: 'calc(100vh - 90px)',
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			<TraceDetailsHeader />
			<ResizablePanelGroup
				direction="vertical"
				autoSaveId="trace-details-v3-layout"
				style={{ flex: 1 }}
			>
				<ResizablePanel defaultSize={40} minSize={20} maxSize={80}>
					<TraceFlamegraph />
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel defaultSize={60} minSize={20}>
					<TraceWaterfall
						traceData={traceData}
						isFetchingTraceData={isFetchingTraceData}
						errorFetchingTraceData={errorFetchingTraceData}
						traceId={traceId || ''}
						interestedSpanId={interestedSpanId}
						setInterestedSpanId={setInterestedSpanId}
						uncollapsedNodes={uncollapsedNodes}
						setTraceFlamegraphStatsWidth={setTraceFlamegraphStatsWidth}
						selectedSpan={selectedSpan}
						setSelectedSpan={setSelectedSpan}
					/>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

export default TraceDetailsV3;
