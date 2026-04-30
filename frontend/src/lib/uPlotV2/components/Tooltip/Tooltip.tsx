import { useMemo } from 'react';
import cx from 'classnames';

import { TooltipProps } from '../types';
import TooltipFooter from './components/TooltipFooter/TooltipFooter';
import TooltipHeader from './components/TooltipHeader/TooltipHeader';
import TooltipList from './components/TooltipList/TooltipList';

import Styles from './Tooltip.module.scss';

export default function Tooltip({
	uPlotInstance,
	timezone,
	content,
	showTooltipHeader = true,
	isPinned,
	canPinTooltip,
	dismiss,
}: TooltipProps): JSX.Element {
	const tooltipContent = useMemo(() => content ?? [], [content]);
	const activeItem = useMemo(
		() => tooltipContent.find((item) => item.isActive) ?? null,
		[tooltipContent],
	);

	const showHeader = showTooltipHeader || activeItem != null;
	// With a single series the active item is fully represented in the header —
	// hide the divider and list to avoid showing a duplicate row.
	const showList = tooltipContent.length > 1;
	const showDivider = showList && showHeader;

	return (
		<div
			className={cx(Styles.container, isPinned && Styles.pinned)}
			data-testid="uplot-tooltip-container"
		>
			{showHeader && (
				<TooltipHeader
					uPlotInstance={uPlotInstance}
					timezone={timezone}
					showTooltipHeader={showTooltipHeader}
					isPinned={isPinned}
					activeItem={activeItem}
				/>
			)}

			{showDivider && <span className={Styles.divider} />}

			{showList && <TooltipList content={tooltipContent} />}

			{canPinTooltip && <TooltipFooter isPinned={isPinned} dismiss={dismiss} />}
		</div>
	);
}
