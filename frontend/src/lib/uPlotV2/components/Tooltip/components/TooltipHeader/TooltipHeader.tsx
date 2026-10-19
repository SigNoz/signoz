import { useMemo } from 'react';
import cx from 'classnames';
import type { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { useTimezone } from 'providers/Timezone';
import type uPlot from 'uplot';
import { formatTimestampOmittingTodaysDate } from 'utils/timeUtils';

import type { ExtendedSeries } from '../../../../config/types';
import { TooltipContentItem } from '../../../types';
import TooltipItem from '../TooltipItem/TooltipItem';
import TooltipPinnedBadge from '../TooltipPinnedBadge/TooltipPinnedBadge';

import Styles from './TooltipHeader.module.scss';

interface TooltipHeaderProps {
	uPlotInstance: uPlot;
	timezone?: Timezone;
	showTooltipHeader: boolean;
	isPinned: boolean;
	activeItem: TooltipContentItem | null;
	headerRowClassName?: string;
	/** Overrides the default, which drops the date part for points on the current day. */
	dateFormat?: string;
}

export default function TooltipHeader({
	uPlotInstance,
	timezone,
	showTooltipHeader,
	isPinned,
	activeItem,
	headerRowClassName,
	dateFormat,
}: TooltipHeaderProps): JSX.Element {
	const { timezone: userTimezone } = useTimezone();
	const resolvedTimezone = timezone?.value ?? userTimezone.value;

	const header = useMemo(() => {
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
		return {
			title: formatTimestampOmittingTodaysDate(
				timestamp * 1000,
				resolvedTimezone,
				dateFormat,
			),
			isPartial: (uPlotInstance.series ?? []).some(
				(series: ExtendedSeries) =>
					series.show && series.partialTimestamps?.has(timestamp),
			),
		};
	}, [
		resolvedTimezone,
		uPlotInstance.data,
		uPlotInstance.series,
		uPlotInstance.cursor.idx,
		showTooltipHeader,
		dateFormat,
	]);

	return (
		<div
			className={Styles.headerContainer}
			data-testid="uplot-tooltip-header-container"
		>
			{showTooltipHeader && header && (
				<div className={cx(Styles.headerRow, headerRowClassName)}>
					<span>{header.title}</span>
					{(header.isPartial || isPinned) && (
						<span className={Styles.headerEnd}>
							{header.isPartial && (
								<span
									className={Styles.partialLabel}
									data-testid="uplot-tooltip-header-partial"
								>
									(partial)
								</span>
							)}
							{isPinned && <TooltipPinnedBadge />}
						</span>
					)}
				</div>
			)}

			{activeItem && (
				<div className={Styles.pinnedItem} data-testid="uplot-tooltip-pinned-item">
					<TooltipItem
						item={activeItem}
						isItemActive={true}
						containerTestId="uplot-tooltip-pinned"
						markerTestId="uplot-tooltip-pinned-marker"
						contentTestId="uplot-tooltip-pinned-content"
					/>
				</div>
			)}
		</div>
	);
}
