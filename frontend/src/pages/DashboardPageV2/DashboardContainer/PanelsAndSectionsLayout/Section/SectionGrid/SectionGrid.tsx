import { useMemo } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';

import type { DashboardSection } from '../../../utils';
import type { DeletePanelArgs } from '../../Panel/hooks/useDeletePanel';
import type { MovePanelArgs } from '../../Panel/hooks/useMovePanelToSection';
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
	/** All sections + handlers — present only in editable sectioned mode (panel "Move to section" / delete). */
	sections?: DashboardSection[];
	onMovePanel?: (args: MovePanelArgs) => void;
	onDeletePanel?: (args: DeletePanelArgs) => void;
}

function SectionGrid({
	items,
	layoutIndex,
	isVisible,
	sections,
	onMovePanel,
	onDeletePanel,
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
			isDraggable={isEditable}
			isResizable={isEditable}
			onDragStop={handleLayoutChange}
			onResizeStop={handleLayoutChange}
			margin={[8, 8]}
		>
			{items.map((item) => (
				<div key={item.id}>
					<Panel
						panel={item.panel}
						panelId={item.id}
						isVisible={isVisible}
						panelActions={
							isEditable && onMovePanel && onDeletePanel
								? {
										currentLayoutIndex: layoutIndex,
										sections: sections ?? [],
										onMovePanel,
										onDeletePanel,
									}
								: undefined
						}
					/>
				</div>
			))}
		</ResponsiveGridLayout>
	);
}

export default SectionGrid;
