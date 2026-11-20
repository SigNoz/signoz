import { ToggleGroup } from '@signozhq/ui/toggle-group';
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
import TraceViewLoader from './TraceViewLoader';
import type { DrawerTraceLayout, TraceView } from './useDrawerTraceLayout';

import styles from './SpanDrawerTraceSection.module.scss';

type SpanDrawerTracePaneProps = {
	viewProps: DrawerTraceViewProps;
	layout: DrawerTraceLayout;
};

/** Split layout: one trace view above the span details, each scrolling on its own. */
function SpanDrawerTracePane({
	viewProps,
	layout,
}: SpanDrawerTracePaneProps): JSX.Element {
	const { splitView, isPending, areTabsShown, hasFlamegraph } = layout;

	let view = <TraceViewLoader />;
	if (!isPending) {
		view =
			splitView === 'waterfall' ? (
				<DrawerWaterfall {...viewProps} />
			) : (
				<DrawerFlamegraph {...viewProps} />
			);
	}

	return (
		<TraceStoreSync>
			<div className={styles.pane}>
				<div className={styles.paneToolbar}>
					{areTabsShown && (
						<ToggleGroup
							variant="outlined"
							color="secondary"
							type="single"
							size="sm"
							value={splitView}
							onChange={(next: string): void => {
								if (next) {
									layout.setSplitView(next as TraceView);
								}
							}}
							testId="span-drawer-trace-view"
							items={[
								{
									value: 'flamegraph',
									label: 'Flame Graph',
									prefix: <Flame size={12} />,
									disabled: !hasFlamegraph,
									disabledTooltip: FLAMEGRAPH_UNAVAILABLE_TOOLTIP,
								},
								{
									value: 'waterfall',
									label: 'Waterfall',
									prefix: <ChartNoAxesGantt size={12} />,
								},
							]}
						/>
					)}
					<span className={styles.paneSpacer} />
					<TraceCounts
						totalSpansCount={viewProps.totalSpansCount}
						totalErrorSpansCount={viewProps.totalErrorSpansCount}
					/>
				</div>
				<ResizableBox defaultHeight={320} minHeight={120} maxHeight={640}>
					{view}
				</ResizableBox>
			</div>
		</TraceStoreSync>
	);
}

export default SpanDrawerTracePane;
