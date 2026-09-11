import { useCallback, useMemo, useRef, useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import cx from 'classnames';
import { LegendItem } from 'lib/uPlotV2/config/types';

import { LegendPosition, LegendProps } from '../types';

import { LEGEND_ITEM_EXTRA_WIDTH, MAX_LEGEND_WIDTH } from './constants';
import LegendRow from './LegendRow';
import LegendToolbar from './LegendToolbar';
import { filterLegendItems, getShownSeriesState } from './utils';

import styles from './Legend.module.scss';

/**
 * Presentational legend, source-agnostic: the uPlot charts feed it via
 * UPlotLegend, Pie feeds it directly. Every state change is delegated.
 */
export default function Legend({
	items,
	position,
	averageLegendWidth = MAX_LEGEND_WIDTH,
	focusedSeriesIndex,
	onToggleSeries,
	onShowOnlySeries,
	onShowAllSeries,
	onHoverSeries,
	showCopy = true,
}: LegendProps): JSX.Element {
	const legendContainerRef = useRef<HTMLDivElement | null>(null);
	const [filterQuery, setFilterQuery] = useState('');

	const itemWidth = averageLegendWidth + LEGEND_ITEM_EXTRA_WIDTH;
	const isRightPosition = position === LegendPosition.RIGHT;

	const { visibleCount, soleShownSeriesIndex } = useMemo(
		() => getShownSeriesState(items),
		[items],
	);

	// A bottom legend gets two rows; spending one on chrome costs more chart than
	// the readout is worth.
	const showToolbar = isRightPosition && items.length > 0;
	const showFilter = showToolbar;

	const effectiveQuery = showFilter ? filterQuery : '';

	const visibleLegendItems = useMemo(
		() => filterLegendItems(items, effectiveQuery),
		[items, effectiveQuery],
	);

	const isEmptyState =
		!!effectiveQuery.trim() && visibleLegendItems.length === 0;

	const isAllShown = visibleCount === items.length;

	/** Everything showing -> isolate, since there is nothing to exclude yet. */
	const handleRowClick = useCallback(
		(seriesIndex: number): void => {
			if (isAllShown) {
				onShowOnlySeries(seriesIndex);
				return;
			}

			onToggleSeries(seriesIndex);
		},
		[isAllShown, onShowOnlySeries, onToggleSeries],
	);

	// A row that unmounts under the pointer never fires its own mouseleave.
	const handleMouseLeave = useCallback(
		(): void => onHoverSeries(null),
		[onHoverSeries],
	);

	const renderLegendItem = useCallback(
		(item: LegendItem): JSX.Element => (
			<LegendRow
				key={item.seriesIndex}
				item={item}
				isSoleShown={soleShownSeriesIndex === item.seriesIndex}
				isAllShown={isAllShown}
				isFocused={focusedSeriesIndex === item.seriesIndex}
				showCopy={showCopy}
				onRowClick={handleRowClick}
				onToggleVisibility={onToggleSeries}
				onShowOnly={onShowOnlySeries}
				onShowAll={onShowAllSeries}
				onHover={onHoverSeries}
			/>
		),
		[
			soleShownSeriesIndex,
			isAllShown,
			focusedSeriesIndex,
			showCopy,
			handleRowClick,
			onToggleSeries,
			onShowOnlySeries,
			onShowAllSeries,
			onHoverSeries,
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
					showFilter={showFilter}
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
					data={visibleLegendItems}
					itemContent={(_, item): JSX.Element => renderLegendItem(item)}
				/>
			)}
		</div>
	);
}
