import { useMemo } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';

import type { DashboardSection } from '../../../utils';
import Panel from '../../Panel/Panel';
import { useDashboardStore } from '../../../store/useDashboardStore';
import { usePersistLayout } from '../hooks/usePersistLayout';
import styles from './SectionGrid.module.scss';

const ResponsiveGridLayout = WidthProvider(GridLayout);

interface SectionGridProps {
	items: DashboardSection['items'];
	layoutIndex: number;
	/** Forwarded to panels — true when the parent section is in the viewport. */
	isVisible?: boolean;
	/** All sections — layout context for the panel menu's move/delete actions. */
	sections?: DashboardSection[];
}

function SectionGrid({
	items,
	layoutIndex,
	isVisible,
	sections,
}: SectionGridProps): JSX.Element {
	const isEditable = useDashboardStore((s) => s.isEditable);
	const rglLayout = useMemo<Layout[]>(
		() =>
			items.map((item) => ({
				i: item.id,
				x: item.x,
				y: item.y,
				w: item.width,
				h: item.height,
			})),
		[items],
	);

	const { handleLayoutChange } = usePersistLayout({ layoutIndex, items });

	return (
		<ResponsiveGridLayout
			className={styles.grid}
			cols={12}
			rowHeight={45}
			autoSize
			useCSSTransforms
			layout={rglLayout}
			draggableHandle=".panel-drag-handle"
			draggableCancel=".panel-no-drag"
			isDraggable={isEditable}
			isResizable={isEditable}
			onDragStop={handleLayoutChange}
			onResizeStop={handleLayoutChange}
			margin={[8, 8]}
		>
			{items.map((item) => (
				// A layout item can reference a panel id that no longer exists in the
				// panels map (orphan); render an empty grid cell for it rather than a
				// panel with no content.
				<div key={item.id}>
					{item.panel && (
						<Panel
							panel={item.panel}
							panelId={item.id}
							isVisible={isVisible}
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
		</ResponsiveGridLayout>
	);
}

export default SectionGrid;
