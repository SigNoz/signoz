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
} from '../../utils/rowDisplay';

import styles from './TopListRow.module.scss';

interface TopListRowProps {
	row: TopListRowData;
	/** Position in the ranked list. */
	index: number;
	/** Rows in the list, rendered or not. */
	count: number;
	/** The list's one Tab stop; arrow keys move it. */
	isTabStop: boolean;
	unit?: string;
	precision?: PrecisionOption;
	thresholds: PanelThreshold[];
	/** Bar color where no threshold recolours it; unset uses the accent. */
	barColor?: string;
	showRank: boolean;
	showShare: boolean;
	/** Shortens a label to fit its bar. */
	fitLabel: (label: string) => string;
	/** Moves the list's tooltip to this row, at the pointer. */
	onHover: (rowKey: string, event: ReactMouseEvent<HTMLElement>) => void;
	onSelect?: (
		row: TopListRowData,
		colors: RowColors,
		coordinates: { x: number; y: number },
	) => void;
	/** Handles a navigation key; returns whether it moved focus. */
	onNavigate: (index: number, key: string) => boolean;
	onFocus: (index: number) => void;
}

function TopListRow({
	row,
	index,
	count,
	isTabStop,
	unit,
	precision,
	thresholds,
	barColor,
	showRank,
	showShare,
	fitLabel,
	onHover,
	onSelect,
	onNavigate,
	onFocus,
}: TopListRowProps): JSX.Element {
	const displayValue = useMemo(
		() => formatRowValue(row, unit, precision),
		[row, unit, precision],
	);
	const colors = useMemo(
		() => resolveRowColors(row.value, thresholds, unit, barColor),
		[row.value, thresholds, unit, barColor],
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

	const handleMouseMove = (event: ReactMouseEvent<HTMLElement>): void =>
		onHover(row.key, event);

	const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
		if (onNavigate(index, event.key)) {
			event.preventDefault();
		}
	};

	const ariaLabel = `${row.label}: ${displayValue}${
		knownShare ? `, ${knownShare} of listed total` : ''
	}`;
	const content = (
		<>
			{showRank && (
				<span data-testid="top-list-row-rank" className={styles.muted}>
					{index + 1}
				</span>
			)}
			<span className={styles.bar}>
				<span
					data-testid="top-list-row-fill"
					className={cx(styles.fill, {
						[styles.hasFillColor]: !!colors.barColor,
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
			{displayShare && (
				<span data-testid="top-list-row-share" className={styles.muted}>
					{displayShare}
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
		</>
	);

	return (
		<li
			className={styles.item}
			aria-setsize={count}
			aria-posinset={index + 1}
			aria-label={onSelect ? undefined : ariaLabel}
		>
			{onSelect ? (
				<button
					type="button"
					aria-haspopup="menu"
					aria-label={ariaLabel}
					tabIndex={isTabStop ? 0 : -1}
					data-row-index={index}
					data-testid="top-list-row"
					className={cx(styles.row, styles.isInteractive)}
					onClick={handleClick}
					onMouseMove={handleMouseMove}
					onKeyDown={handleKeyDown}
					onFocus={(): void => onFocus(index)}
				>
					{content}
				</button>
			) : (
				// Focusable without an action so the keyboard can still walk the list.
				// oxlint-disable-next-line jsx-a11y/no-static-element-interactions
				<div
					// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
					tabIndex={isTabStop ? 0 : -1}
					data-row-index={index}
					data-testid="top-list-row"
					className={styles.row}
					onMouseMove={handleMouseMove}
					onKeyDown={handleKeyDown}
					onFocus={(): void => onFocus(index)}
				>
					{content}
				</div>
			)}
		</li>
	);
}

export default memo(TopListRow);
