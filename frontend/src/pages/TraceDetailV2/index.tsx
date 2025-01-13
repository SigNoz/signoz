import './TraceDetailV2.styles.scss';

import { Button, Tabs, Typography } from 'antd';
import TraceFlamegraph from 'container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph';
import TraceMetadata from 'container/TraceMetadata/TraceMetadata';
import TraceWaterfall, {
	IInterestedSpan,
} from 'container/TraceWaterfall/TraceWaterfall';
import useGetTraceV2 from 'hooks/trace/useGetTraceV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { Braces, DraftingCompass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

function TraceDetailsV2(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV2URLProps>();
	const urlQuery = useUrlQuery();
	const [interestedSpanId, setInterestedSpanId] = useState<IInterestedSpan>(
		() => ({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		}),
	);

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
		uncollapsedNodes,
		interestedSpanId: interestedSpanId.spanId,
		isInterestedSpanIdUnCollapsed: interestedSpanId.isUncollapsed,
	});

	useEffect(() => {
		if (traceData && traceData.payload && traceData.payload.uncollapsedNodes) {
			setUncollapsedNodes(traceData.payload.uncollapsedNodes);
		}
	}, [traceData]);

	const items = [
		{
			label: (
				<Button
					type="text"
					icon={<DraftingCompass size="14" />}
					className="flamegraph-waterfall-toggle"
				>
					Flamegraph
				</Button>
			),
			key: 'flamegraph',
			children: (
				<>
					<TraceFlamegraph />
					<TraceWaterfall
						traceData={traceData}
						isFetchingTraceData={isFetchingTraceData}
						errorFetchingTraceData={errorFetchingTraceData}
						traceId={traceId}
						interestedSpanId={interestedSpanId}
						setInterestedSpanId={setInterestedSpanId}
						uncollapsedNodes={uncollapsedNodes}
					/>
				</>
			),
		},
		{
			label: (
				<Button
					type="text"
					icon={<Braces size={14} />}
					className="span-list-toggle"
				>
					Span List
				</Button>
			),
			key: 'span-list',
			children: <Typography.Text>Span List</Typography.Text>,
		},
	];

	return (
		<div className="trace-layout">
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
			/>
			<Tabs items={items} animated className="settings-tabs" />;
		</div>
	);
}

export default TraceDetailsV2;
