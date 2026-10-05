import { useCallback, useMemo, useRef, useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import cx from 'classnames';
import { LegendItem } from 'lib/uPlotV2/config/types';

import { LegendAction, LegendPosition, LegendProps } from '../types';

import { LEGEND_ITEM_EXTRA_WIDTH, MAX_LEGEND_WIDTH } from './constants';
import LegendRow from './LegendRow';
import LegendToolbar from './LegendToolbar';
import { getVisibleSeriesState } from './utils';

import styles from './Legend.module.scss';

/**
 * Presentational legend, source-agnostic: the uPlot charts feed it via
 * UPlotLegend, Pie feeds it directly. Every state change is delegated.
 */
export default function Legend({
	items,
	position,
	averageLegendWidth = MAX_LEGEND_WIDTH,
	showSearch = false,
	focusedSeriesIndex,
	onAction,
	showCopy = true,
}: LegendProps): JSX.Element {
	const legendContainerRef = useRef<HTMLDivElement | null>(null);
	const [filterQuery, setFilterQuery] = useState('');

	const itemWidth = averageLegendWidth + LEGEND_ITEM_EXTRA_WIDTH;
	const isRightPosition = position === LegendPosition.RIGHT;

	// The layout decides: it reserves the height.
	const showToolbar = showSearch && items.length > 0;

	const effectiveQuery = showToolbar ? filterQuery : '';

	const {
		listedItems,
		visibleCount,
		onlyVisibleSeriesIndex,
		areAllSeriesVisible,
	} = useMemo(
		() => getVisibleSeriesState(items, effectiveQuery),
		[items, effectiveQuery],
	);

	const isEmptyState = !!effectiveQuery.trim() && listedItems.length === 0;

	// A row that unmounts under the pointer never fires its own mouseleave.
	const handleMouseLeave = useCallback(
		(): void => onAction({ type: LegendAction.HOVER, seriesIndex: null }),
		[onAction],
	);

	const renderLegendItem = useCallback(
		(item: LegendItem): JSX.Element => (
			<LegendRow
				key={item.seriesIndex}
				item={item}
				isOneSeriesVisible={onlyVisibleSeriesIndex === item.seriesIndex}
				areAllSeriesVisible={areAllSeriesVisible}
				isFocused={focusedSeriesIndex === item.seriesIndex}
				showCopy={showCopy}
				onAction={onAction}
			/>
		),
		[
			onlyVisibleSeriesIndex,
			areAllSeriesVisible,
			focusedSeriesIndex,
			showCopy,
			onAction,
		],
	);

	return (
		<div
			ref={legendContainerRef}
			className={cx(styles.container, {
				[styles.isRight]: isRightPosition,
			})}
			style={{ ['--legend-item-width' as string]: `${itemWidth}px` }}
			onMouseLeave={handleMouseLeave}
			data-testid="legend-container"
		>
			{showToolbar && (
				<LegendToolbar
					visibleCount={visibleCount}
					totalCount={items.length}
					position={position}
					filterQuery={filterQuery}
					onFilterQueryChange={setFilterQuery}
				/>
			)}
			{isEmptyState ? (
				<div className={styles.emptyState}>
					No series found matching &quot;{effectiveQuery}&quot;
				</div>
			) : (
				<VirtuosoGrid
					className={styles.scroller}
					listClassName={styles.gridList}
					itemClassName={styles.gridItem}
					data={listedItems}
					itemContent={(_, item): JSX.Element => renderLegendItem(item)}
				/>
			)}
		</div>
	);
}
