import { KeyboardEvent, memo, MouseEvent, useCallback } from 'react';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';
import { LegendItem } from 'lib/uPlotV2/config/types';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import { LegendAction, OnLegendAction } from '../types';

import { LEGEND_TOOLTIP_DELAY_MS } from './constants';
import styles from './LegendRow.module.scss';

export interface LegendRowProps {
	item: LegendItem;
	/** The only series currently shown, so hiding it is refused. */
	isSoleVisible: boolean;
	/** Nothing is hidden, so the row's action can only narrow the selection. */
	isAllVisible: boolean;
	isFocused: boolean;
	showCopy: boolean;
	onAction: OnLegendAction;
}

/**
 * One legend row. The marker is its own target for excluding a single series —
 * the one thing the row click can't do while everything is showing. The actions
 * overlay the label's tail rather than taking layout width, and their reveal is
 * pure CSS.
 */
function LegendRow({
	item,
	isSoleVisible,
	isAllVisible,
	isFocused,
	showCopy,
	onAction,
}: LegendRowProps): JSX.Element {
	const { seriesIndex, show } = item;
	const label = item.label ?? '';
	const isShowAllAction = show && !isAllVisible;
	const scopeActionLabel = isShowAllAction
		? 'Show all series'
		: 'Show only current series';
	// `color` is uPlot's stroke union (string | fn | gradient); only a string is
	// a usable CSS colour for the marker.
	const seriesColor = typeof item.color === 'string' ? item.color : undefined;

	/** Everything showing -> isolate; showing alone -> restore all. */
	const handleRowClick = useCallback((): void => {
		if (isSoleVisible) {
			onAction({ type: LegendAction.SHOW_ALL });
			return;
		}
		onAction({
			type: isAllVisible ? LegendAction.SHOW_ONLY : LegendAction.TOGGLE,
			seriesIndex,
		});
	}, [isSoleVisible, isAllVisible, onAction, seriesIndex]);

	const handleMarkerClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>): void => {
			event.stopPropagation();
			onAction({ type: LegendAction.TOGGLE, seriesIndex });
		},
		[onAction, seriesIndex],
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>): void => {
			// Let the row actions handle their own keys.
			if (event.target !== event.currentTarget) {
				return;
			}
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				handleRowClick();
			}
		},
		[handleRowClick],
	);

	const handleScopeClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>): void => {
			event.stopPropagation();
			if (isShowAllAction) {
				onAction({ type: LegendAction.SHOW_ALL });
				return;
			}
			onAction({ type: LegendAction.SHOW_ONLY, seriesIndex });
		},
		[isShowAllAction, onAction, seriesIndex],
	);

	const handleMouseEnter = useCallback(
		(): void => onAction({ type: LegendAction.HOVER, seriesIndex }),
		[onAction, seriesIndex],
	);

	const handleMouseLeave = useCallback(
		(): void => onAction({ type: LegendAction.HOVER, seriesIndex: null }),
		[onAction],
	);

	return (
		<div
			className={cx(styles.row, {
				[styles.isHidden]: !show,
				[styles.isFocused]: isFocused,
			})}
			data-legend-item-id={seriesIndex}
			data-testid={`legend-item-${seriesIndex}`}
			role="switch"
			tabIndex={0}
			aria-checked={show}
			aria-label={label}
			onClick={handleRowClick}
			onKeyDown={handleKeyDown}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<button
				type="button"
				className={styles.marker}
				style={{
					borderColor: seriesColor,
					backgroundColor: show ? seriesColor : 'transparent',
				}}
				onClick={handleMarkerClick}
				disabled={isSoleVisible}
				aria-label={`${show ? 'Hide' : 'Show'} ${label}`}
				data-is-legend-marker={true}
				data-testid={`legend-marker-${seriesIndex}`}
			/>
			<TooltipSimple
				title={label}
				arrow
				side="top"
				delayDuration={LEGEND_TOOLTIP_DELAY_MS}
				disableHoverableContent
				tooltipContentProps={{ className: styles.rowTooltip }}
			>
				<span className={styles.label}>{label}</span>
			</TooltipSimple>
			<div className={styles.actions}>
				<TooltipSimple
					title={scopeActionLabel}
					arrow
					side="top"
					delayDuration={LEGEND_TOOLTIP_DELAY_MS}
					disableHoverableContent
					tooltipContentProps={{ className: styles.rowTooltip }}
				>
					{/* Radix's asChild merge strips the button's own data-testid. */}
					<span className={styles.actionTrigger}>
						<Button
							variant="ghost"
							color="secondary"
							size="sm"
							className={cx(styles.actionButton, styles.scopeButton)}
							onClick={handleScopeClick}
							aria-label={scopeActionLabel}
							testId={`legend-scope-${seriesIndex}`}
						>
							{isShowAllAction ? 'All' : 'Only'}
						</Button>
					</span>
				</TooltipSimple>
				{showCopy && (
					<CopyButton
						value={label}
						size={13}
						className={styles.actionButton}
						ariaLabel={`Copy ${label}`}
						testId={`legend-copy-${seriesIndex}`}
					/>
				)}
			</div>
		</div>
	);
}

export default memo(LegendRow);
