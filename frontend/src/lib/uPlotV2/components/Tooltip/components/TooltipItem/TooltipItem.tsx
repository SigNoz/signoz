import { TooltipContentItem } from '../../../types';

import Styles from './TooltipItem.module.scss';

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
			className={Styles.uplotTooltipItem}
			style={{
				opacity: isItemActive ? 1 : 0.7,
				fontWeight: isItemActive ? 700 : 400,
			}}
			data-testid={containerTestId}
		>
			<div
				className={Styles.uplotTooltipItemMarker}
				style={{ borderColor: item.color }}
				data-is-legend-marker={true}
				data-testid={markerTestId}
			/>
			<div
				className={Styles.uplotTooltipItemContent}
				style={{ color: item.color }}
				data-testid={contentTestId}
			>
				<span className={Styles.uplotTooltipItemLabel}>{item.label}</span>
				<span
					className={Styles.uplotTooltipItemContentSeparator}
					style={{ borderColor: item.color }}
				/>
				<span>{item.tooltipValue}</span>
			</div>
		</div>
	);
}
