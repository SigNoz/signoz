import { useMemo } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';

import { newPanelSlot } from '../../../patchOps';
import type { PanelKind } from '../../../Panels/types/panelKind';
import type { DashboardSection } from '../../../utils';
import { usePersistLayout } from '../hooks/usePersistLayout';
import { GRID_MARGIN, GRID_ROW_HEIGHT } from './gridMetrics';
import NewPanelPlaceholder from './NewPanelPlaceholder';
import SectionGridItem from './SectionGridItem';
import styles from './SectionGrid.module.scss';
import { useDashboardEditContext } from '../../../hooks/useDashboardEditContext';

const ResponsiveGridLayout = WidthProvider(GridLayout);

const PLACEHOLDER_ID = '__new-panel-placeholder';

interface SectionGridProps {
	items: DashboardSection['items'];
	layoutIndex: number;
	/** All sections — layout context for the panel menu's move/delete actions. */
	sections?: DashboardSection[];
	/** Shows where a new panel of this kind will land. */
	placeholderKind?: PanelKind;
}

function SectionGrid({
	items,
	layoutIndex,
	sections,
	placeholderKind,
}: SectionGridProps): JSX.Element {
	const { isEditable } = useDashboardEditContext();

	const rglLayout = useMemo<Layout[]>(() => {
		const layout: Layout[] = items.map((item) => ({
			i: item.id,
			x: item.x,
			y: item.y,
			w: item.width,
			h: item.height,
		}));
		if (placeholderKind) {
			const { x, y, width, height } = newPanelSlot(items);
			layout.push({ i: PLACEHOLDER_ID, x, y, w: width, h: height, static: true });
		}
		return layout;
	}, [items, placeholderKind]);

	const { handleLayoutChange } = usePersistLayout({ layoutIndex, items });

	return (
		<ResponsiveGridLayout
			className={styles.grid}
			cols={12}
			rowHeight={GRID_ROW_HEIGHT}
			autoSize
			useCSSTransforms
			layout={rglLayout}
			draggableHandle=".panel-drag-handle"
			draggableCancel=".panel-no-drag"
			isDraggable={isEditable}
			isResizable={isEditable}
			onDragStop={handleLayoutChange}
			onResizeStop={handleLayoutChange}
			margin={[GRID_MARGIN, GRID_MARGIN]}
		>
			{items.map((item) => (
				// A layout item can reference a panel id that no longer exists in the
				// panels map (orphan); render an empty grid cell for it rather than a
				// panel with no content.
				<div key={item.id}>
					{item.panel && (
						<SectionGridItem
							panel={item.panel}
							panelId={item.id}
							panelActions={
								isEditable
									? {
											currentLayoutIndex: layoutIndex,
											sections: sections ?? [],
										}
									: undefined
							}
						/>
					)}
				</div>
			))}
			{placeholderKind && (
				<div key={PLACEHOLDER_ID}>
					<NewPanelPlaceholder kind={placeholderKind} />
				</div>
			)}
		</ResponsiveGridLayout>
	);
}

export default SectionGrid;
