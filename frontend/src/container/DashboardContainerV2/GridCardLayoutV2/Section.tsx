import { useMemo, useState } from 'react';
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import type { DashboardSectionV2 } from '../utils';
import PanelV2 from './PanelV2';

const ResponsiveGridLayout = WidthProvider(GridLayout);

interface Props {
	section: DashboardSectionV2;
}

function SectionGrid({ items }: { items: DashboardSectionV2['items'] }): JSX.Element {
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
			cols={12}
			rowHeight={45}
			autoSize
			useCSSTransforms
			layout={rglLayout}
			draggableHandle=".drag-handle"
			isDraggable={false}
			isResizable={false}
			margin={[8, 8]}
		>
			{items.map((item) => (
				<div key={item.id}>
					<PanelV2 panel={item.panel} panelId={item.id} />
				</div>
			))}
		</ResponsiveGridLayout>
	);
}

function Section({ section }: Props): JSX.Element {
	// Local toggle override — initial state from layout spec; user can
	// expand/collapse without persisting.
	const [open, setOpen] = useState<boolean>(section.open);

	if (!section.title) {
		// Untitled section — render just the grid (no header chrome).
		return <SectionGrid items={section.items} />;
	}

	return (
		<div
			style={{
				marginBottom: 12,
				border: '1px solid var(--bg-slate-500)',
				borderRadius: 4,
			}}
			data-testid={`dashboard-section-${section.id}`}
		>
			<Button
				type="text"
				onClick={(): void => setOpen((v) => !v)}
				icon={open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
				style={{
					width: '100%',
					justifyContent: 'flex-start',
					padding: '8px 12px',
					borderBottom: open ? '1px solid var(--bg-slate-500)' : 'none',
				}}
				data-testid={`dashboard-section-toggle-${section.id}`}
			>
				<Typography.Text style={{ marginLeft: 4 }}>
					{section.title}
				</Typography.Text>
				{section.repeatVariable ? (
					<Typography.Text style={{ marginLeft: 8, opacity: 0.6 }}>
						(repeats per ${section.repeatVariable})
					</Typography.Text>
				) : null}
			</Button>
			{open ? <SectionGrid items={section.items} /> : null}
		</div>
	);
}

export default Section;
