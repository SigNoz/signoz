import dayjs from 'dayjs';

const CUSTOM_TIME_REGEX = /^(\d+)([mhdw])$/;

const UNIT_TO_DAYJS = {
	m: 'minutes',
	h: 'hours',
	d: 'days',
	w: 'weeks',
} as const;

// Relative range (`30m`/`6h`/`7d`/`1w`) → `{ startTime, endTime }` in unix seconds; default 30m.
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
