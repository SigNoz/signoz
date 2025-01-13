import './TraceDetailV2.styles.scss';

import TraceFlamegraph from 'container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph';
import TraceMetadata from 'container/TraceMetadata/TraceMetadata';
import TraceWaterfall from 'container/TraceWaterfall/TraceWaterfall';

function TraceDetailsV2(): JSX.Element {
	return (
		<div className="trace-layout">
			<TraceMetadata
				traceID="XXXXX"
				duration="XX"
				startTime="XX"
				rootServiceName="XXXX"
				rootSpanName="YYY"
				totalErrorSpans={13}
				totalSpans={300}
			/>
			<TraceFlamegraph />
			<TraceWaterfall />
		</div>
	);
}

export default TraceDetailsV2;
