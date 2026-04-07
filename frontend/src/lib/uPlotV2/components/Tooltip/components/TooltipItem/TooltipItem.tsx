import { TooltipContentItem } from '../../../types';

import './TooltipItem.styles.scss';

interface TooltipItemProps {
	item: TooltipContentItem;
	isItemActive: boolean;
	containerTestId?: string;
	markerTestId?: string;
	contentTestId?: string;
}

export default function TooltipItem({
	item,
	isItemActive,
	containerTestId = 'uplot-tooltip-item',
	markerTestId = 'uplot-tooltip-item-marker',
	contentTestId = 'uplot-tooltip-item-content',
}: TooltipItemProps): JSX.Element {
	return (
		<div
			className="uplot-tooltip-item"
			style={{
				opacity: isItemActive ? 1 : 0.7,
				fontWeight: isItemActive ? 700 : 400,
			}}
			data-testid={containerTestId}
		>
			<div
				className="uplot-tooltip-item-marker"
				style={{ borderColor: item.color }}
				data-is-legend-marker={true}
				data-testid={markerTestId}
			/>
			<div
				className="uplot-tooltip-item-content"
				style={{ color: item.color }}
				data-testid={contentTestId}
			>
				<span className="uplot-tooltip-item-label">{item.label}</span>
				<span
					className="uplot-tooltip-item-content-separator"
					style={{ borderColor: item.color }}
				/>
				<span className="uplot-tooltip-item-value">{item.tooltipValue}</span>
			</div>
		</div>
	);
}
