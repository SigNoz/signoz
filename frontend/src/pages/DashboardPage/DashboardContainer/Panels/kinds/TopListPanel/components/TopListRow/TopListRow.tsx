import {
	type CSSProperties,
	memo,
	useMemo,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
} from 'react';
import cx from 'classnames';
import type { PrecisionOption } from 'components/Graph/types';

import type { PanelThreshold } from '../../../../types/threshold';
import type { TopListRow as TopListRowData } from '../../types';
import {
	formatRowValue,
	formatShare,
	resolveRowColors,
	type RowColors,
} from '../../utils';

import styles from './TopListRow.module.scss';

interface TopListRowProps {
	row: TopListRowData;
	/** Position in the ranked list. */
	index: number;
	unit?: string;
	precision?: PrecisionOption;
	thresholds: PanelThreshold[];
	showRank: boolean;
	showShare: boolean;
	/** Shortens a label to fit its bar. */
	fitLabel: (label: string) => string;
	/** Moves the list's tooltip to this row, at the pointer. */
	onHover: (index: number, event: ReactMouseEvent<HTMLButtonElement>) => void;
	onSelect?: (
		row: TopListRowData,
		colors: RowColors,
		coordinates: { x: number; y: number },
	) => void;
	/** Handles a navigation key; returns whether it moved focus. */
	onNavigate: (index: number, key: string) => boolean;
}

function TopListRow({
	row,
	index,
	unit,
	precision,
	thresholds,
	showRank,
	showShare,
	fitLabel,
	onHover,
	onSelect,
	onNavigate,
}: TopListRowProps): JSX.Element {
	const displayValue = useMemo(
		() => formatRowValue(row, unit, precision),
		[row, unit, precision],
	);
	const colors = useMemo(
		() => resolveRowColors(row.value, thresholds, unit),
		[row.value, thresholds, unit],
	);
	const displayShare = showShare ? formatShare(row.share) : null;
	const knownShare =
		displayShare !== null && row.share !== null ? displayShare : undefined;
	const displayLabel = useMemo(() => fitLabel(row.label), [fitLabel, row.label]);

	const handleClick = (event: ReactMouseEvent<HTMLButtonElement>): void => {
		if (!onSelect) {
			return;
		}
		// Enter/Space clicks carry no pointer position; anchor the menu under the row.
		if (event.detail === 0) {
			const { left, bottom } = event.currentTarget.getBoundingClientRect();
			onSelect(row, colors, { x: left, y: bottom });
			return;
		}
		onSelect(row, colors, { x: event.clientX, y: event.clientY });
	};

	const handleMouseMove = (event: ReactMouseEvent<HTMLButtonElement>): void =>
		onHover(index, event);

	const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
		if (onNavigate(index, event.key)) {
			event.preventDefault();
		}
	};

	return (
		<li className={styles.item}>
			<button
				type="button"
				aria-haspopup={onSelect ? 'menu' : undefined}
				aria-label={`${row.label}: ${displayValue}${
					knownShare ? `, ${knownShare} of total` : ''
				}`}
				data-row-index={index}
				data-testid="top-list-row"
				className={cx(styles.row, { [styles.isInteractive]: !!onSelect })}
				onClick={handleClick}
				onMouseMove={handleMouseMove}
				onKeyDown={handleKeyDown}
			>
				{showRank && (
					<span data-testid="top-list-row-rank" className={styles.muted}>
						{index + 1}
					</span>
				)}
				<span
					data-testid="top-list-row-value"
					className={cx(styles.value, {
						[styles.isNonNumeric]: row.value === null,
					})}
					style={{ color: colors.valueColor }}
				>
					{displayValue}
				</span>
				{displayShare && (
					<span data-testid="top-list-row-share" className={styles.muted}>
						{displayShare}
					</span>
				)}
				<span className={styles.bar}>
					<span
						data-testid="top-list-row-fill"
						className={cx(styles.fill, {
							[styles.hasThresholdColor]: !!colors.barColor,
						})}
						style={
							{
								width: `${row.ratio * 100}%`,
								'--fill-color': colors.barColor,
							} as CSSProperties
						}
					/>
					<span
						className={cx(styles.label, { [styles.isEmptyLabel]: row.isEmptyLabel })}
					>
						{displayLabel}
					</span>
				</span>
			</button>
		</li>
	);
}

export default memo(TopListRow);
