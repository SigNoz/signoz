import './TraceDetailV2.styles.scss';

import { Button, Tabs, Typography } from 'antd';
import TraceFlamegraph from 'container/PaginatedTraceFlamegraph/PaginatedTraceFlamegraph';
import TraceMetadata from 'container/TraceMetadata/TraceMetadata';
import TraceWaterfall from 'container/TraceWaterfall/TraceWaterfall';
import { Braces, DraftingCompass } from 'lucide-react';

function TraceDetailsV2(): JSX.Element {
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
					<TraceWaterfall />
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
				traceID="XXX"
				duration="XX"
				startTime="XX"
				rootServiceName="XXXX"
				rootSpanName="YYY"
				totalErrorSpans={13}
				totalSpans={300}
			/>
			<Tabs items={items} animated className="settings-tabs" />;
		</div>
	);
}

export default TraceDetailsV2;
