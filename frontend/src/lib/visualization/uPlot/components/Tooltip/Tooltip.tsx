import './Tooltip.styles.scss';

import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import type uPlot from 'uplot';

import { TooltipProps } from '../types';

const TOOLTIP_LIST_MAX_HEIGHT = 330;
const TOOLTIP_ITEM_HEIGHT = 38;
const FALLBACK_SERIES_COLOR = 'red';

export type TooltipContentItem = {
	label: string;
	value: number;
	color: string;
	isActive: boolean;
};

function resolveSeriesColor(
	stroke: uPlot.Series.Stroke | undefined,
	u: uPlot,
	seriesIdx: number,
): string {
	if (typeof stroke === 'function') {
		return String(stroke(u, seriesIdx));
	}
	if (typeof stroke === 'string') {
		return stroke;
	}
	return FALLBACK_SERIES_COLOR;
}

function buildTooltipContent(
	data: uPlot.AlignedData,
	series: uPlot.Series[],
	dataIdxs: Array<number | null>,
	activeSeriesIdx: number | null,
	u: uPlot,
): TooltipContentItem[] {
	const active: TooltipContentItem[] = [];
	const rest: TooltipContentItem[] = [];

	for (let idx = 1; idx < series.length; idx += 1) {
		const s = series[idx];
		if (!s?.show) {
			continue;
		}

		const dataIdx = dataIdxs[idx];
		// Skip series with no data at the current cursor position
		if (dataIdx === null || dataIdx === undefined) {
			continue;
		}

		const raw = data[idx]?.[dataIdx];
		const value = Number(raw);
		const isActive = idx === activeSeriesIdx;

		const item: TooltipContentItem = {
			label: String(s.label ?? ''),
			value: Number.isNaN(value) ? 0 : value,
			color: resolveSeriesColor(s.stroke, u, idx),
			isActive,
		};

		if (isActive) {
			active.push(item);
		} else {
			rest.push(item);
		}
	}

	return [...active, ...rest];
}

export default function Tooltip({
	seriesIdx,
	dataIdxs,
	uPlotInstance,
	timezone,
}: TooltipProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const headerTitle = useMemo(() => {
		const data = uPlotInstance.data;
		const cursorIdx = uPlotInstance.cursor.idx;
		if (!cursorIdx) {
			return null;
		}
		return dayjs(data[0][cursorIdx] * 1000)
			.tz(timezone)
			.format(DATE_TIME_FORMATS.MONTH_DATETIME_SECONDS);
	}, [timezone, uPlotInstance.data, uPlotInstance.cursor.idx]);

	const content = useMemo(
		(): TooltipContentItem[] =>
			buildTooltipContent(
				uPlotInstance.data,
				uPlotInstance.series,
				dataIdxs,
				seriesIdx,
				uPlotInstance,
			),
		[uPlotInstance, seriesIdx, dataIdxs],
	);

	return (
		<div
			className={cx('tooltip-container', isDarkMode ? 'darkMode' : 'lightMode')}
		>
			<div className="tooltip-header">
				<span>{headerTitle}</span>
			</div>
			<div
				style={{
					height: Math.min(
						content.length * TOOLTIP_ITEM_HEIGHT,
						TOOLTIP_LIST_MAX_HEIGHT,
					),
					minHeight: 0,
				}}
			>
				{content.length > 0 ? (
					<Virtuoso
						className="tooltip-list"
						data={content}
						defaultItemHeight={TOOLTIP_ITEM_HEIGHT}
						itemContent={(_, item): JSX.Element => (
							<div className="tooltip-item">
								<div
									className="tooltip-item-marker"
									style={{ borderColor: item.color }}
									data-is-legend-marker={true}
								/>
								<div
									className="tooltip-item-content"
									style={{ color: item.color, fontWeight: item.isActive ? 700 : 400 }}
								>
									{item.label}: {item.value}
								</div>
							</div>
						)}
					/>
				) : null}
			</div>
		</div>
	);
}
