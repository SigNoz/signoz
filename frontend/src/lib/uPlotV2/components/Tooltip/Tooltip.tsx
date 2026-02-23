import { useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { TooltipProps } from '../types';

import './Tooltip.styles.scss';

const TOOLTIP_LIST_MAX_HEIGHT = 330;
const TOOLTIP_ITEM_HEIGHT = 38;
const TOOLTIP_LIST_PADDING = 10;

export default function Tooltip({
	uPlotInstance,
	timezone,
	content,
	showTooltipHeader = true,
}: TooltipProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const [listHeight, setListHeight] = useState(0);
	const tooltipContent = content ?? [];

	const headerTitle = useMemo(() => {
		if (!showTooltipHeader) {
			return null;
		}
		const data = uPlotInstance.data;
		const cursorIdx = uPlotInstance.cursor.idx;
		if (cursorIdx == null) {
			return null;
		}
		return dayjs(data[0][cursorIdx] * 1000)
			.tz(timezone)
			.format(DATE_TIME_FORMATS.MONTH_DATETIME_SECONDS);
	}, [
		timezone,
		uPlotInstance.data,
		uPlotInstance.cursor.idx,
		showTooltipHeader,
	]);

	const virtuosoStyle = useMemo(() => {
		return {
			height:
				listHeight > 0
					? Math.min(listHeight + TOOLTIP_LIST_PADDING, TOOLTIP_LIST_MAX_HEIGHT)
					: Math.min(
							tooltipContent.length * TOOLTIP_ITEM_HEIGHT,
							TOOLTIP_LIST_MAX_HEIGHT,
					  ),
			width: '100%',
		};
	}, [listHeight, tooltipContent.length]);

	return (
		<div
			className={cx(
				'uplot-tooltip-container',
				isDarkMode ? 'darkMode' : 'lightMode',
			)}
			data-testid="uplot-tooltip-container"
		>
			{showTooltipHeader && (
				<div className="uplot-tooltip-header" data-testid="uplot-tooltip-header">
					<span>{headerTitle}</span>
				</div>
			)}
			<div className="uplot-tooltip-list-container">
				{tooltipContent.length > 0 ? (
					<Virtuoso
						className="uplot-tooltip-list"
						data-testid="uplot-tooltip-list"
						data={tooltipContent}
						style={virtuosoStyle}
						totalListHeightChanged={setListHeight}
						itemContent={(_, item): JSX.Element => (
							<div className="uplot-tooltip-item" data-testid="uplot-tooltip-item">
								<div
									className="uplot-tooltip-item-marker"
									style={{ borderColor: item.color }}
									data-is-legend-marker={true}
									data-testid="uplot-tooltip-item-marker"
								/>
								<div
									className="uplot-tooltip-item-content"
									style={{ color: item.color, fontWeight: item.isActive ? 700 : 400 }}
									data-testid="uplot-tooltip-item-content"
								>
									{item.label}: {item.tooltipValue}
								</div>
							</div>
						)}
					/>
				) : null}
			</div>
		</div>
	);
}
