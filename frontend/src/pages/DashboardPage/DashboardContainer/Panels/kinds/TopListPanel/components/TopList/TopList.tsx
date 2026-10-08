import { useCallback, useMemo, useRef } from 'react';
import type { PrecisionOption } from 'components/Graph/types';

import type { PanelThreshold } from '../../../../types/threshold';
import { useTopListVirtualizer } from '../../hooks/useTopListVirtualizer';
import type { TopListRow as TopListRowData } from '../../types';
import {
	getNavigationTarget,
	getSizerContent,
	type RowColors,
} from '../../utils';
import TopListRow from '../TopListRow/TopListRow';

import styles from './TopList.module.scss';

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
	const { virtualItems, paddingTop, paddingBottom, measureElement, focusRow } =
		useTopListVirtualizer({ count: rows.length, containerRef });

	const sizer = useMemo(
		() => getSizerContent(rows, unit, precision),
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

	return (
		<div ref={containerRef} className={styles.container}>
			<ol data-testid="top-list" className={styles.list}>
				<li aria-hidden className={styles.sizer}>
					<span className={styles.sizerRank}>{sizer.rank}</span>
					<span className={styles.sizerLabel}>{sizer.label}</span>
					<span className={styles.sizerValue}>{sizer.value}</span>
				</li>
				{paddingTop > 0 && (
					<li aria-hidden className={styles.spacer} style={{ height: paddingTop }} />
				)}
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
						measureRef={measureElement}
					/>
				))}
				{paddingBottom > 0 && (
					<li
						aria-hidden
						className={styles.spacer}
						style={{ height: paddingBottom }}
					/>
				)}
			</ol>
		</div>
	);
}

export default TopList;
