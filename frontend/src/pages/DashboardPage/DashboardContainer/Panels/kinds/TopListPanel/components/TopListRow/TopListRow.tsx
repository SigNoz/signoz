import {
	memo,
	useMemo,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
} from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';
import type { PrecisionOption } from 'components/Graph/types';

import type { PanelThreshold } from '../../../../types/threshold';
import type { TopListRow as TopListRowData } from '../../types';
import { formatRowValue, resolveRowColors, type RowColors } from '../../utils';

import styles from './TopListRow.module.scss';

interface TopListRowProps {
	row: TopListRowData;
	/** Position in the ranked list; the rank shown is one more. */
	index: number;
	unit?: string;
	precision?: PrecisionOption;
	thresholds: PanelThreshold[];
	onSelect?: (
		row: TopListRowData,
		colors: RowColors,
		coordinates: { x: number; y: number },
	) => void;
	/** Handles a navigation key; returns whether it moved focus. */
	onNavigate: (index: number, key: string) => boolean;
	/** Lets the virtualized list measure the row's real height. */
	measureRef: (element: Element | null) => void;
}

function TopListRow({
	row,
	index,
	unit,
	precision,
	thresholds,
	onSelect,
	onNavigate,
	measureRef,
}: TopListRowProps): JSX.Element {
	const displayValue = useMemo(
		() => formatRowValue(row, unit, precision),
		[row, unit, precision],
	);
	const colors = useMemo(
		() => resolveRowColors(row.value, thresholds, unit),
		[row.value, thresholds, unit],
	);

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

	const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
		if (onNavigate(index, event.key)) {
			event.preventDefault();
		}
	};

	return (
		<li ref={measureRef} data-index={index} className={styles.item}>
			<button
				type="button"
				aria-haspopup={onSelect ? 'menu' : undefined}
				aria-label={`${row.label}: ${displayValue}`}
				data-row-index={index}
				data-testid="top-list-row"
				className={cx(styles.row, { [styles.isInteractive]: !!onSelect })}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
			>
				<span className={styles.rank}>{index + 1}</span>
				<TooltipSimple title={row.label} arrow delayDuration={1000}>
					<span
						className={cx(styles.label, { [styles.isEmptyLabel]: row.isEmptyLabel })}
					>
						{row.label}
					</span>
				</TooltipSimple>
				<span className={styles.track}>
					<span
						data-testid="top-list-row-fill"
						className={styles.fill}
						style={{
							width: `${row.ratio * 100}%`,
							backgroundColor: colors.barColor,
						}}
					/>
				</span>
				<span
					data-testid="top-list-row-value"
					className={cx(styles.value, {
						[styles.isNonNumeric]: row.value === null,
					})}
					style={{ color: colors.valueColor }}
				>
					{displayValue}
				</span>
			</button>
		</li>
	);
}

export default memo(TopListRow);
