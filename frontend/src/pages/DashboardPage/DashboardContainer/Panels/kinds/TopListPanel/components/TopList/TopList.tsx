import { type CSSProperties, useCallback, useMemo, useRef } from 'react';
import type { PrecisionOption } from 'components/Graph/types';
import { useResizeObserver } from 'hooks/useDimensions';
import TooltipFooter from 'lib/visualization/panels/components/TooltipFooter';

import type { PanelThreshold } from '../../../../types/threshold';
import { LIST_PADDING_Y } from '../../constants';
import { useLabelFitter } from '../../hooks/useLabelFitter';
import { useTopListTooltip } from '../../hooks/useTopListTooltip';
import { useTopListVirtualizer } from '../../hooks/useTopListVirtualizer';
import type { TopListRow as TopListRowData } from '../../types';
import {
	getNavigationTarget,
	getRowHeight,
	getWidestShare,
	getWidestValue,
	type RowColors,
} from '../../utils';
import TopListRow from '../TopListRow/TopListRow';
import TopListTooltip from '../TopListTooltip/TopListTooltip';

import styles from './TopList.module.scss';

const RESIZE_DEBOUNCE_MS = 100;

interface TopListProps {
	/** Identifies the panel in tooltip analytics. */
	panelId: string;
	rows: TopListRowData[];
	/** What the values measure, named in each row's tooltip. */
	valueName: string;
	unit?: string;
	precision?: PrecisionOption;
	thresholds: PanelThreshold[];
	showRank?: boolean;
	showShare?: boolean;
	onSelect?: (
		row: TopListRowData,
		colors: RowColors,
		coordinates: { x: number; y: number },
	) => void;
}

function TopList({
	panelId,
	rows,
	valueName,
	unit,
	precision,
	thresholds,
	showRank = false,
	showShare = false,
	onSelect,
}: TopListProps): JSX.Element {
	const containerRef = useRef<HTMLDivElement>(null);
	const sizerBarRef = useRef<HTMLSpanElement>(null);
	const fitLabel = useLabelFitter(sizerBarRef);
	const tooltip = useTopListTooltip();
	const hoveredRow =
		tooltip.rowIndex === null ? undefined : rows[tooltip.rowIndex];
	const { height } = useResizeObserver(containerRef, RESIZE_DEBOUNCE_MS);
	const rowHeight = getRowHeight(rows.length, height);
	const { virtualItems, paddingTop, paddingBottom, focusRow } =
		useTopListVirtualizer({ count: rows.length, rowHeight, containerRef });

	const widestValue = useMemo(
		() => getWidestValue(rows, unit, precision),
		[rows, unit, precision],
	);
	const widestShare = useMemo(
		() => (showShare ? getWidestShare(rows) : ''),
		[rows, showShare],
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
		'--leading-columns': 1 + Number(showRank) + Number(showShare),
		paddingTop: LIST_PADDING_Y / 2 + paddingTop,
		paddingBottom: LIST_PADDING_Y / 2 + paddingBottom,
	} as CSSProperties;

	return (
		<div
			ref={containerRef}
			className={styles.container}
			onScroll={tooltip.hide}
			onMouseLeave={tooltip.hide}
		>
			<ol
				ref={tooltip.listRef}
				data-testid="top-list"
				className={styles.list}
				style={listStyle}
			>
				<li aria-hidden className={styles.sizer}>
					{showRank && (
						<span className={styles.sizerMuted}>{String(rows.length)}</span>
					)}
					<span className={styles.sizerValue}>{widestValue}</span>
					{showShare && <span className={styles.sizerMuted}>{widestShare}</span>}
					<span ref={sizerBarRef} className={styles.sizerBar} />
				</li>
				{virtualItems.map(({ index }) => (
					<TopListRow
						key={rows[index].key}
						row={rows[index]}
						index={index}
						unit={unit}
						precision={precision}
						thresholds={thresholds}
						showRank={showRank}
						showShare={showShare}
						fitLabel={fitLabel}
						onHover={tooltip.show}
						onSelect={onSelect}
						onNavigate={handleNavigate}
					/>
				))}
			</ol>
			{hoveredRow && (
				<tooltip.TooltipInPortal
					top={tooltip.top}
					left={tooltip.left}
					unstyled
					applyPositionStyle
					className={styles.tooltip}
				>
					<TopListTooltip
						row={hoveredRow}
						valueName={valueName}
						unit={unit}
						precision={precision}
						thresholds={thresholds}
						showShare={showShare}
						footer={
							onSelect && (
								<TooltipFooter
									id={panelId}
									isPinned={false}
									canPin={false}
									dismiss={tooltip.hide}
								/>
							)
						}
					/>
				</tooltip.TooltipInPortal>
			)}
		</div>
	);
}

export default TopList;
