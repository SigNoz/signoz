import { type CSSProperties, useCallback, useMemo, useRef } from 'react';
import type { PrecisionOption } from 'components/Graph/types';
import { useResizeObserver } from 'hooks/useDimensions';

import type { PanelThreshold } from '../../../../types/threshold';
import { LIST_PADDING_Y } from '../../constants';
import { useTopListVirtualizer } from '../../hooks/useTopListVirtualizer';
import type { TopListRow as TopListRowData } from '../../types';
import {
	getNavigationTarget,
	getRowHeight,
	getWidestValue,
	type RowColors,
} from '../../utils';
import TopListRow from '../TopListRow/TopListRow';

import styles from './TopList.module.scss';

const RESIZE_DEBOUNCE_MS = 100;

interface TopListProps {
	rows: TopListRowData[];
	unit?: string;
	precision?: PrecisionOption;
	thresholds: PanelThreshold[];
	onSelect?: (
		row: TopListRowData,
		colors: RowColors,
		coordinates: { x: number; y: number },
	) => void;
}

function TopList({
	rows,
	unit,
	precision,
	thresholds,
	onSelect,
}: TopListProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const { height } = useResizeObserver(containerRef, RESIZE_DEBOUNCE_MS);
	const rowHeight = getRowHeight(rows.length, height);
	const { virtualItems, paddingTop, paddingBottom, focusRow } =
		useTopListVirtualizer({ count: rows.length, rowHeight, containerRef });

	const widestValue = useMemo(
		() => getWidestValue(rows, unit, precision),
		[rows, unit, precision],
	);

	const handleNavigate = useCallback(
		(index: number, key: string): boolean => {
			const target = getNavigationTarget(index, key, rows.length);
			if (target === null) {
				return false;
			}
			focusRow(target);
			return true;
		},
		[rows.length, focusRow],
	);

	const listStyle = {
		'--row-height': `${rowHeight}px`,
		paddingTop: LIST_PADDING_Y / 2 + paddingTop,
		paddingBottom: LIST_PADDING_Y / 2 + paddingBottom,
	} as CSSProperties;

	return (
		<div ref={containerRef} className={styles.container}>
			<ol data-testid="top-list" className={styles.list} style={listStyle}>
				<li aria-hidden className={styles.sizer}>
					<span className={styles.sizerValue}>{widestValue}</span>
				</li>
				{virtualItems.map(({ index }) => (
					<TopListRow
						key={rows[index].key}
						row={rows[index]}
						index={index}
						unit={unit}
						precision={precision}
						thresholds={thresholds}
						onSelect={onSelect}
						onNavigate={handleNavigate}
					/>
				))}
			</ol>
		</div>
	);
}

export default TopList;
