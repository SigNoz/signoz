import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@signozhq/resizable';
import useGetTraceV2 from 'hooks/trace/useGetTraceV2';
import { Span, TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

import TraceDetailsHeader from './TraceDetailsHeader/TraceDetailsHeader';
import TraceFlamegraph from './TraceFlamegraph/TraceFlamegraph';

function TraceDetailsV3(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV2URLProps>();
	const [selectedSpan, _setSelectedSpan] = useState<Span>();
	const [uncollapsedNodes] = useState<string[]>([]);

	const { data: traceData } = useGetTraceV2({
		traceId,
		uncollapsedSpans: uncollapsedNodes,
		selectedSpanId: '',
		isSelectedSpanIDUnCollapsed: false,
	});

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
					<TraceFlamegraph
						serviceExecTime={traceData?.payload?.serviceNameToTotalDurationMap || {}}
						startTime={traceData?.payload?.startTimestampMillis || 0}
						endTime={traceData?.payload?.endTimestampMillis || 0}
						selectedSpan={selectedSpan}
					/>
				</ResizablePanel>
				<ResizableHandle withHandle />
				<ResizablePanel defaultSize={60} minSize={20}>
					<div />
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

export default TraceDetailsV3;
