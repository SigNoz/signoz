import { KeyboardEvent, memo, MouseEvent, useCallback } from 'react';
import { Crosshair, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';
import { LegendItem } from 'lib/uPlotV2/config/types';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import { LEGEND_TOOLTIP_DELAY_MS } from './constants';
import styles from './Legend.module.scss';

export interface LegendRowProps {
	item: LegendItem;
	/** The only series currently shown, so hiding it is refused. */
	isSoleShown: boolean;
	isFocused: boolean;
	showCopy: boolean;
	/** Row click, whose meaning depends on how many series are shown. */
	onRowClick: (seriesIndex: number) => void;
	/** Marker click: hide or show just this series. */
	onToggleVisibility: (seriesIndex: number) => void;
	onShowOnly: (seriesIndex: number) => void;
	onShow: (seriesIndex: number) => void;
	onHover: (seriesIndex: number | null) => void;
}

/**
 * One legend row. The marker is its own target for excluding a single series —
 * the one thing the row click can't do while everything is showing. The actions
 * overlay the label's tail rather than taking layout width, and their reveal is
 * pure CSS.
 */
function LegendRow({
	item,
	isSoleShown,
	isFocused,
	showCopy,
	onRowClick,
	onToggleVisibility,
	onShowOnly,
	onShow,
	onHover,
}: LegendRowProps): JSX.Element {
	const { seriesIndex, show } = item;
	const label = item.label ?? '';
	const canAdd = !show;
	const onlyActionLabel = isSoleShown ? 'Show all series' : `Show only ${label}`;
	// `color` is uPlot's stroke union (string | fn | gradient); only a string is
	// a usable CSS colour for the marker.
	const seriesColor = typeof item.color === 'string' ? item.color : undefined;

	const handleRowClick = useCallback(
		(): void => onRowClick(seriesIndex),
		[onRowClick, seriesIndex],
	);

	const handleMarkerClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>): void => {
			event.stopPropagation();
			onToggleVisibility(seriesIndex);
		},
		[onToggleVisibility, seriesIndex],
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>): void => {
			// Let the row actions handle their own keys.
			if (event.target !== event.currentTarget) {
				return;
			}
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				onRowClick(seriesIndex);
			}
		},
		[onRowClick, seriesIndex],
	);

	const handleShowOnly = useCallback(
		(event: MouseEvent<HTMLButtonElement>): void => {
			event.stopPropagation();
			onShowOnly(seriesIndex);
		},
		[onShowOnly, seriesIndex],
	);

	const handleShow = useCallback(
		(event: MouseEvent<HTMLButtonElement>): void => {
			event.stopPropagation();
			onShow(seriesIndex);
		},
		[onShow, seriesIndex],
	);

	const handleMouseEnter = useCallback(
		(): void => onHover(seriesIndex),
		[onHover, seriesIndex],
	);

	const handleMouseLeave = useCallback((): void => onHover(null), [onHover]);

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
				disabled={isSoleShown}
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
				tooltipContentProps={{ className: styles.labelTooltip }}
			>
				<span className={styles.label}>{label}</span>
			</TooltipSimple>
			<div className={styles.actions}>
				{canAdd && (
					<TooltipSimple
						title="Show this series too"
						arrow
						side="top"
						delayDuration={LEGEND_TOOLTIP_DELAY_MS}
						disableHoverableContent
					>
						{/* Radix's asChild merge strips the button's own data-testid. */}
						<span className={styles.actionTrigger}>
							<Button
								variant="ghost"
								color="secondary"
								size="icon"
								className={styles.actionButton}
								onClick={handleShow}
								aria-label={`Show ${label} too`}
								testId={`legend-add-${seriesIndex}`}
							>
								<Plus size={13} />
							</Button>
						</span>
					</TooltipSimple>
				)}
				<TooltipSimple
					title={onlyActionLabel}
					arrow
					side="top"
					delayDuration={LEGEND_TOOLTIP_DELAY_MS}
					disableHoverableContent
				>
					<span className={styles.actionTrigger}>
						<Button
							variant="ghost"
							color="secondary"
							size="icon"
							className={cx(styles.actionButton, {
								[styles.isActive]: isSoleShown,
							})}
							onClick={handleShowOnly}
							aria-pressed={isSoleShown}
							aria-label={onlyActionLabel}
							testId={`legend-only-${seriesIndex}`}
						>
							<Crosshair size={13} />
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
