import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from '@signozhq/resizable';

import TraceDetailsHeader from './TraceDetailsHeader/TraceDetailsHeader';
import TraceFlamegraph from './TraceFlamegraph/TraceFlamegraph';

function TraceDetailsV3(): JSX.Element {
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
					<div />
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

export default TraceDetailsV3;
