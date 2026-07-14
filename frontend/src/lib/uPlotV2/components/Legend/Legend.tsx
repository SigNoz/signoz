import { useCallback, useMemo, useRef, useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Input } from 'antd';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import cx from 'classnames';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { useResizeObserver } from 'hooks/useDimensions';
import { LegendItem } from 'lib/uPlotV2/config/types';
import { Check, Copy } from '@signozhq/icons';

import { LegendPosition, LegendProps } from '../types';

import './Legend.styles.scss';

export const MAX_LEGEND_WIDTH = 240;

/**
 * Presentational legend. Renders the supplied `items` (markers + labels, an
 * optional copy button, and a search box for the RIGHT position) and delegates
 * all interaction to the container handlers. Source-agnostic — the uPlot
 * charts feed it via UPlotLegend; Pie feeds it directly.
 */
export default function Legend({
	items,
	position,
	averageLegendWidth = MAX_LEGEND_WIDTH,
	focusedSeriesIndex,
	onClick,
	onMouseMove,
	onMouseLeave,
	showCopy = true,
}: LegendProps): JSX.Element {
	const legendContainerRef = useRef<HTMLDivElement | null>(null);
	const [legendSearchQuery, setLegendSearchQuery] = useState('');
	const { copyToClipboard, id: copiedId } = useCopyToClipboard();

	// Search is intrinsic to the right-positioned legend.
	const searchEnabled = position === LegendPosition.RIGHT;
	const { width: containerWidth } = useResizeObserver(legendContainerRef);

	const isSingleRow = useMemo(() => {
		if (position !== LegendPosition.BOTTOM || containerWidth <= 0) {
			return false;
		}
		const totalLegendWidth = items.length * (averageLegendWidth + 16);
		const totalRows = Math.ceil(totalLegendWidth / containerWidth);
		return totalRows <= 1;
	}, [averageLegendWidth, items.length, position, containerWidth]);

	const visibleLegendItems = useMemo(() => {
		if (!searchEnabled || !legendSearchQuery.trim()) {
			return items;
		}

		const query = legendSearchQuery.trim().toLowerCase();
		return items.filter((item) => item.label?.toLowerCase().includes(query));
	}, [searchEnabled, legendSearchQuery, items]);

	const handleCopyLegendItem = useCallback(
		(e: React.MouseEvent, seriesIndex: number, label: string): void => {
			e.stopPropagation();
			copyToClipboard(label, seriesIndex);
		},
		[copyToClipboard],
	);

	const renderLegendItem = useCallback(
		(item: LegendItem): JSX.Element => {
			const isCopied = copiedId === item.seriesIndex;
			// `color` is uPlot's stroke union (string | fn | gradient); only a string
			// is a usable CSS colour for the marker.
			const markerColor = typeof item.color === 'string' ? item.color : undefined;
			return (
				<div
					key={item.seriesIndex}
					data-legend-item-id={item.seriesIndex}
					className={cx('legend-item', `legend-item-${position.toLowerCase()}`, {
						'legend-item-off': !item.show,
						'legend-item-focused': focusedSeriesIndex === item.seriesIndex,
					})}
				>
					<TooltipSimple title={item.label} arrow side="top" disableHoverableContent>
						<div className="legend-item-label-trigger">
							<div
								className="legend-marker"
								style={{ borderColor: markerColor }}
								data-is-legend-marker={true}
							/>
							<span className="legend-label">{item.label}</span>
						</div>
					</TooltipSimple>
					{showCopy && (
						<TooltipSimple
							title={isCopied ? 'Copied' : 'Copy'}
							arrow
							side="top"
							disableHoverableContent
						>
							<Button
								type="button"
								size="icon"
								variant="ghost"
								color="secondary"
								className="legend-copy-button"
								onClick={(e): void =>
									handleCopyLegendItem(e, item.seriesIndex, item.label ?? '')
								}
								aria-label={`Copy ${item.label}`}
								// data-testid (not testId): TooltipSimple's trigger injects
								// data-testid:undefined via Radix Slot, and Button spreads
								// incoming props after its own testId — so set it as a prop
								// that wins the Slot merge and survives the spread.
								data-testid="legend-copy"
							>
								{isCopied ? <Check size={12} /> : <Copy size={12} />}
							</Button>
						</TooltipSimple>
					)}
				</div>
			);
		},
		[copiedId, focusedSeriesIndex, handleCopyLegendItem, position, showCopy],
	);

	const isEmptyState = useMemo(() => {
		if (!searchEnabled || !legendSearchQuery.trim()) {
			return false;
		}
		return visibleLegendItems.length === 0;
	}, [searchEnabled, legendSearchQuery, visibleLegendItems]);

	return (
		<div
			ref={legendContainerRef}
			className="legend-container"
			onClick={onClick}
			onMouseMove={onMouseMove}
			onMouseLeave={onMouseLeave}
			style={{
				['--legend-average-width' as string]: `${averageLegendWidth + 16}px`, // 16px is the marker width
			}}
		>
			{searchEnabled && (
				<div className="legend-search-container">
					<Input
						allowClear
						placeholder="Search..."
						value={legendSearchQuery}
						onChange={(e): void => setLegendSearchQuery(e.target.value)}
						data-testid="legend-search-input"
						className="legend-search-input"
					/>
				</div>
			)}
			{isEmptyState ? (
				<div className="legend-empty-state">
					No series found matching &quot;{legendSearchQuery}&quot;
				</div>
			) : (
				<VirtuosoGrid
					className={cx(
						'legend-virtuoso-container',
						`legend-virtuoso-container-${position.toLowerCase()}`,
						{ 'legend-virtuoso-container-single-row': isSingleRow },
					)}
					data={visibleLegendItems}
					itemContent={(_, item): JSX.Element => renderLegendItem(item)}
				/>
			)}
		</div>
	);
}
