import type { GridItem } from 'pages/DashboardPageV2/DashboardContainer/utils';
import GridLayout, { type Layout, WidthProvider } from 'react-grid-layout';

import PublicPanel from '../PublicPanel/PublicPanel';

const ResponsiveGridLayout = WidthProvider(GridLayout);

interface PublicSectionGridProps {
	items: GridItem[];
	publicDashboardId: string;
	/** Epoch milliseconds. */
	startMs: number;
	/** Epoch milliseconds. */
	endMs: number;
	/** True once the section is on screen — forwarded to gate panel fetches. */
	isVisible?: boolean;
}

/**
 * Read-only react-grid-layout for one section of a v2 public dashboard. The layout mirrors the
 * authenticated `SectionGrid` (12 cols, 45px rows) but is fixed — no drag, resize, or
 * persistence.
 */
function PublicSectionGrid({
	items,
	publicDashboardId,
	startMs,
	endMs,
	isVisible,
}: PublicSectionGridProps): JSX.Element {
	const layout: Layout[] = items.map((item) => ({
		i: item.id,
		x: item.x,
		y: item.y,
		w: item.width,
		h: item.height,
		static: true,
	}));

	return (
		<ResponsiveGridLayout
			cols={12}
			rowHeight={45}
			autoSize
			useCSSTransforms
			layout={layout}
			isDraggable={false}
			isResizable={false}
			margin={[8, 8]}
		>
			{items.map((item) => (
				// A layout item can reference a panel id no longer in the panels map
				// (orphan) — render an empty cell rather than a panel with no content.
				<div key={item.id}>
					{item.panel && (
						<PublicPanel
							panel={item.panel}
							panelKey={item.id}
							publicDashboardId={publicDashboardId}
							startMs={startMs}
							endMs={endMs}
							isVisible={isVisible}
						/>
					)}
				</div>
			))}
		</ResponsiveGridLayout>
	);
}

export default PublicSectionGrid;
