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

// Fixed (non-editable) grid for one section of a v2 public dashboard.
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
				// Empty cell for an orphan layout item (panel id missing from the map).
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
