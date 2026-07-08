import dayjs from 'dayjs';

const CUSTOM_TIME_REGEX = /^(\d+)([mhdw])$/;

const UNIT_TO_DAYJS = {
	m: 'minutes',
	h: 'hours',
	d: 'days',
	w: 'weeks',
} as const;

/**
 * Resolves a relative range string (`30m`, `6h`, `7d`, `1w`) to a `{ startTime, endTime }`
 * window in unix seconds, defaulting to the last 30 minutes. Kept in seconds to match the v1
 * public viewer; converted to milliseconds at the panel-fetch boundary.
 */
export function getStartTimeAndEndTimeFromTimeRange(timeRange: string): {
	startTime: number;
	endTime: number;
} {
	const match = timeRange.match(CUSTOM_TIME_REGEX);
	if (match) {
		const timeValue = parseInt(match[1] as string, 10);
		const unit = UNIT_TO_DAYJS[match[2] as keyof typeof UNIT_TO_DAYJS];
		return {
			startTime: dayjs().subtract(timeValue, unit).unix(),
			endTime: dayjs().unix(),
		};
	}

	return {
		startTime: dayjs().subtract(30, 'minutes').unix(),
		endTime: dayjs().unix(),
	};
}
