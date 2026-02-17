import { useCallback, useMemo, useRef, useState } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Input, Tooltip as AntdTooltip } from 'antd';
import cx from 'classnames';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { LegendItem } from 'lib/uPlotV2/config/types';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';
import { Check, Copy } from 'lucide-react';

import { useLegendActions } from '../../hooks/useLegendActions';
import { LegendPosition, LegendProps } from '../types';

import './Legend.styles.scss';

export const MAX_LEGEND_WIDTH = 240;

export default function Legend({
	position = LegendPosition.BOTTOM,
	config,
	averageLegendWidth = MAX_LEGEND_WIDTH,
}: LegendProps): JSX.Element {
	const {
		legendItemsMap,
		focusedSeriesIndex,
		setFocusedSeriesIndex,
	} = useLegendsSync({ config });
	const {
		onLegendClick,
		onLegendMouseMove,
		onLegendMouseLeave,
	} = useLegendActions({
		setFocusedSeriesIndex,
		focusedSeriesIndex,
	});
	const legendContainerRef = useRef<HTMLDivElement | null>(null);
	const [legendSearchQuery, setLegendSearchQuery] = useState('');
	const { copyToClipboard, id: copiedId } = useCopyToClipboard();

	const legendItems = useMemo(() => Object.values(legendItemsMap), [
		legendItemsMap,
	]);

	const isSingleRow = useMemo(() => {
		if (!legendContainerRef.current || position !== LegendPosition.BOTTOM) {
			return false;
		}
		const containerWidth = legendContainerRef.current.clientWidth;

		const totalLegendWidth = legendItems.length * (averageLegendWidth + 16);
		const totalRows = Math.ceil(totalLegendWidth / containerWidth);
		return totalRows <= 1;
	}, [averageLegendWidth, legendContainerRef, legendItems.length, position]);

	const visibleLegendItems = useMemo(() => {
		if (position !== LegendPosition.RIGHT || !legendSearchQuery.trim()) {
			return legendItems;
		}

		const query = legendSearchQuery.trim().toLowerCase();
		return legendItems.filter((item) =>
			item.label?.toLowerCase().includes(query),
		);
	}, [position, legendSearchQuery, legendItems]);

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
			return (
				<div
					key={item.seriesIndex}
					data-legend-item-id={item.seriesIndex}
					className={cx('legend-item', `legend-item-${position.toLowerCase()}`, {
						'legend-item-off': !item.show,
						'legend-item-focused': focusedSeriesIndex === item.seriesIndex,
					})}
				>
					<AntdTooltip title={item.label}>
						<div className="legend-item-label-trigger">
							<div
								className="legend-marker"
								style={{ borderColor: String(item.color) }}
								data-is-legend-marker={true}
							/>
							<span className="legend-label">{item.label}</span>
						</div>
					</AntdTooltip>
					<AntdTooltip title={isCopied ? 'Copied' : 'Copy'}>
						<button
							type="button"
							className="legend-copy-button"
							onClick={(e): void =>
								handleCopyLegendItem(e, item.seriesIndex, item.label ?? '')
							}
							aria-label={`Copy ${item.label}`}
							data-testid="legend-copy"
						>
							{isCopied ? <Check size={12} /> : <Copy size={12} />}
						</button>
					</AntdTooltip>
				</div>
			);
		},
		[copiedId, focusedSeriesIndex, handleCopyLegendItem, position],
	);

	const isEmptyState = useMemo(() => {
		if (position !== LegendPosition.RIGHT || !legendSearchQuery.trim()) {
			return false;
		}
		return visibleLegendItems.length === 0;
	}, [position, legendSearchQuery, visibleLegendItems]);

	return (
		<div
			ref={legendContainerRef}
			className="legend-container"
			onClick={onLegendClick}
			onMouseMove={onLegendMouseMove}
			onMouseLeave={onLegendMouseLeave}
			style={{
				['--legend-average-width' as string]: `${averageLegendWidth + 16}px`, // 16px is the marker width
			}}
		>
			{position === LegendPosition.RIGHT && (
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
