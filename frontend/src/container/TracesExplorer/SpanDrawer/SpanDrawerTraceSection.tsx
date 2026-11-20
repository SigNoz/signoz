import { ChartNoAxesGantt, Flame } from '@signozhq/icons';
import TraceStoreSync from 'pages/TraceDetailsV3/stores/TraceStoreSync';
import { ResizableBox } from 'periscope/components/ResizableBox';

import {
	DrawerFlamegraph,
	DrawerTraceViewProps,
	DrawerWaterfall,
} from './DrawerTraceViews';
import { FLAMEGRAPH_UNAVAILABLE_TOOLTIP } from './constants';
import TraceCounts from './TraceCounts';
import TraceSectionPanel from './TraceSectionPanel';
import TraceViewLoader from './TraceViewLoader';
import type { DrawerTraceLayout } from './useDrawerTraceLayout';

import styles from './SpanDrawerTraceSection.module.scss';

type SpanDrawerTraceSectionProps = {
	viewProps: DrawerTraceViewProps;
	layout: DrawerTraceLayout;
};

function SpanDrawerTraceSection({
	viewProps,
	layout,
}: SpanDrawerTraceSectionProps): JSX.Element {
	const { isPending } = layout;
	const counts = (
		<TraceCounts
			totalSpansCount={viewProps.totalSpansCount}
			totalErrorSpansCount={viewProps.totalErrorSpansCount}
		/>
	);

	return (
		<TraceStoreSync>
			<div className={styles.root}>
				<TraceSectionPanel
					icon={<Flame size={14} />}
					disabledTooltip={
						layout.hasFlamegraph ? undefined : FLAMEGRAPH_UNAVAILABLE_TOOLTIP
					}
					title="Flame Graph"
					meta={counts}
					isOpen={layout.isFlamegraphOpen}
					onToggle={layout.toggleFlamegraphOpen}
					testId="span-drawer-flamegraph-toggle"
				>
					<ResizableBox defaultHeight={240} minHeight={100} maxHeight={400}>
						{isPending ? <TraceViewLoader /> : <DrawerFlamegraph {...viewProps} />}
					</ResizableBox>
				</TraceSectionPanel>

				<TraceSectionPanel
					icon={<ChartNoAxesGantt size={14} />}
					title="Waterfall"
					meta={counts}
					isOpen={layout.isWaterfallOpen}
					onToggle={layout.toggleWaterfallOpen}
					testId="span-drawer-waterfall-toggle"
				>
					<ResizableBox defaultHeight={300} minHeight={150} maxHeight={600}>
						{isPending ? <TraceViewLoader /> : <DrawerWaterfall {...viewProps} />}
					</ResizableBox>
				</TraceSectionPanel>
			</div>
		</TraceStoreSync>
	);
}

export default SpanDrawerTraceSection;
