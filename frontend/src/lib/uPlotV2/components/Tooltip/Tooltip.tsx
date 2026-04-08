import { useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useTimezone } from 'providers/Timezone';

import { TooltipProps } from '../types';
import TooltipItem from './components/TooltipItem/TooltipItem';

import Styles from './Tooltip.module.scss';

// Fallback per-item height used for the initial size estimate before
// Virtuoso reports the real total height via totalListHeightChanged.
const TOOLTIP_ITEM_HEIGHT = 38;
const LIST_MAX_HEIGHT = 300;

export default function Tooltip({
	uPlotInstance,
	timezone,
	content,
	showTooltipHeader = true,
}: TooltipProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { timezone: userTimezone } = useTimezone();
	const [totalListHeight, setTotalListHeight] = useState(0);

	const tooltipContent = useMemo(() => content ?? [], [content]);

	const resolvedTimezone = timezone?.value ?? userTimezone.value;

	const headerTitle = useMemo(() => {
		if (!showTooltipHeader) {
			return null;
		}
		const cursorIdx = uPlotInstance.cursor.idx;
		if (cursorIdx == null) {
			return null;
		}
		const timestamp = uPlotInstance.data[0]?.[cursorIdx];
		if (timestamp == null) {
			return null;
		}
		return dayjs(timestamp * 1000)
			.tz(resolvedTimezone)
			.format(DATE_TIME_FORMATS.MONTH_DATETIME_SECONDS);
	}, [
		resolvedTimezone,
		uPlotInstance.data,
		uPlotInstance.cursor.idx,
		showTooltipHeader,
	]);

	const activeItem = useMemo(
		() => tooltipContent.find((item) => item.isActive) ?? null,
		[tooltipContent],
	);

	// Use the measured height from Virtuoso when available; fall back to a
	// per-item estimate on the first render.  Math.ceil prevents a 1 px
	// subpixel rounding gap from triggering a spurious scrollbar.
	const virtuosoHeight = useMemo(() => {
		return totalListHeight > 0
			? Math.ceil(Math.min(totalListHeight, LIST_MAX_HEIGHT))
			: Math.min(tooltipContent.length * TOOLTIP_ITEM_HEIGHT, LIST_MAX_HEIGHT);
	}, [totalListHeight, tooltipContent.length]);

	const showHeader = showTooltipHeader || activeItem != null;
	// With a single series the active item is fully represented in the header —
	// hide the divider and list to avoid showing a duplicate row.
	const showList = tooltipContent.length > 1;
	const showDivider = showList && showHeader;

	return (
		<div
			className={cx(Styles.uplotTooltipContainer, !isDarkMode && Styles.lightMode)}
			data-testid="uplot-tooltip-container"
		>
			{showHeader && (
				<div className={Styles.uplotTooltipHeaderContainer}>
					{showTooltipHeader && headerTitle && (
						<div
							className={Styles.uplotTooltipHeader}
							data-testid="uplot-tooltip-header"
						>
							<span>{headerTitle}</span>
						</div>
					)}

					{activeItem && (
						<TooltipItem
							item={activeItem}
							isItemActive={true}
							containerTestId="uplot-tooltip-pinned"
							markerTestId="uplot-tooltip-pinned-marker"
							contentTestId="uplot-tooltip-pinned-content"
						/>
					)}
				</div>
			)}

			{showDivider && <span className={Styles.uplotTooltipDivider} />}

			{showList && (
				<Virtuoso
					className={Styles.uplotTooltipList}
					data-testid="uplot-tooltip-list"
					data={tooltipContent}
					style={{ height: virtuosoHeight, width: '100%' }}
					totalListHeightChanged={setTotalListHeight}
					itemContent={(_, item): JSX.Element => (
						<TooltipItem item={item} isItemActive={false} />
					)}
				/>
			)}
		</div>
	);
}
