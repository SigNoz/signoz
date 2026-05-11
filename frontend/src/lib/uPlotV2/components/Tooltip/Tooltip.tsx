import { useMemo } from 'react';
import cx from 'classnames';

import { TooltipProps } from '../types';
import TooltipHeader from './components/TooltipHeader/TooltipHeader';
import TooltipList from './components/TooltipList/TooltipList';

import Styles from './Tooltip.module.scss';

export default function Tooltip({
	id,
	uPlotInstance,
	timezone,
	content,
	showTooltipHeader = true,
	isPinned,
	renderTooltipFooter,
	dismiss,
}: TooltipProps): JSX.Element {
	const tooltipContent = useMemo(() => content ?? [], [content]);
	const activeItem = useMemo(
		() => tooltipContent.find((item) => item.isActive) ?? null,
		[tooltipContent],
	);

	const showHeader = showTooltipHeader || activeItem != null;
	// A single row collapses into the header when it's the active item, but
	// must stay in the list when there's no active item (e.g. sync-driven
	// tooltips with no focused series) — otherwise the row would vanish.
	const showList =
		tooltipContent.length > 1 ||
		(tooltipContent.length === 1 && activeItem == null);
	// The divider separates the active row in the header from the list; with
	// no active item it has nothing to separate.
	const showDivider = showList && showHeader && activeItem != null;

	return (
		<div
			className={cx(Styles.container, {
				[Styles.pinned]: isPinned,
			})}
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

			{showList && <TooltipList id={id} content={tooltipContent} />}

			{renderTooltipFooter && renderTooltipFooter({ isPinned, dismiss })}
		</div>
	);
}
