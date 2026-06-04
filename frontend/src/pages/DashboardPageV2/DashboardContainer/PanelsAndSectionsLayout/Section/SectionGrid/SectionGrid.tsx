import { useMemo } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';

import type { DashboardSection } from '../../../utils';
import Panel from '../../Panel/Panel';
import styles from './SectionGrid.module.scss';

const ResponsiveGridLayout = WidthProvider(GridLayout);

interface Props {
	items: DashboardSection['items'];
	/** Forwarded to panels — true when the parent section is in the viewport. */
	isVisible?: boolean;
}

function SectionGrid({ items, isVisible }: Props): JSX.Element {
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

	return (
		<ResponsiveGridLayout
			className={styles.grid}
			cols={12}
			rowHeight={45}
			autoSize
			useCSSTransforms
			layout={rglLayout}
			isDraggable={false}
			isResizable={false}
			margin={[8, 8]}
		>
			{items.map((item) => (
				<div key={item.id}>
					<Panel panel={item.panel} panelId={item.id} isVisible={isVisible} />
				</div>
			))}
		</ResponsiveGridLayout>
	);
}

export default SectionGrid;
