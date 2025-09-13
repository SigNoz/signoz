import { generateTimezoneData } from 'components/CustomTimePicker/timezoneUtils';
import dayjs, { Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { rrulestr } from 'rrule';

import { EVALUATION_WINDOW_TIMEFRAME, TIME_UNIT_OPTIONS, WEEKDAY_MAP } from './constants';
import { CumulativeWindowTimeframes, RollingWindowTimeframes } from './types';
import { EvaluationWindowState } from '../context/types';

// Extend dayjs with timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const getEvaluationWindowTypeText = (
	windowType: 'rolling' | 'cumulative',
): string => {
	switch (windowType) {
		case 'rolling':
			return 'Rolling';
		case 'cumulative':
			return 'Cumulative';
		default:
			return 'Rolling';
	}
};

export const getCumulativeWindowTimeframeText = (timeframe: string): string => {
	switch (timeframe) {
		case CumulativeWindowTimeframes.CURRENT_HOUR:
			return 'Current hour';
		case CumulativeWindowTimeframes.CURRENT_DAY:
			return 'Current day';
		case CumulativeWindowTimeframes.CURRENT_MONTH:
			return 'Current month';
		default:
			return 'Current hour';
	}
};

export const getRollingWindowTimeframeText = (
	timeframe: RollingWindowTimeframes,
): string => {
	switch (timeframe) {
		case RollingWindowTimeframes.LAST_5_MINUTES:
			return 'Last 5 minutes';
		case RollingWindowTimeframes.LAST_10_MINUTES:
			return 'Last 10 minutes';
		case RollingWindowTimeframes.LAST_15_MINUTES:
			return 'Last 15 minutes';
		case RollingWindowTimeframes.LAST_30_MINUTES:
			return 'Last 30 minutes';
		case RollingWindowTimeframes.LAST_1_HOUR:
			return 'Last 1 hour';
		case RollingWindowTimeframes.LAST_2_HOURS:
			return 'Last 2 hours';
		case RollingWindowTimeframes.LAST_4_HOURS:
			return 'Last 4 hours';
		default:
			return 'Last 5 minutes';
	}
};

export const getDetailedDescription = (evaluationWindow: EvaluationWindowState): string => {
	if (evaluationWindow.windowType === 'rolling') {
		if (evaluationWindow.timeframe === 'custom') {
			const unitOption = TIME_UNIT_OPTIONS.find(opt => opt.value === evaluationWindow.customDuration.unit);
			return `Last ${evaluationWindow.customDuration.value} ${unitOption?.label || evaluationWindow.customDuration.unit}`;
		}
		// Convert timeframe to readable format
		const timeframeOption = EVALUATION_WINDOW_TIMEFRAME.rolling.find(opt => opt.value === evaluationWindow.timeframe);
		return timeframeOption?.label || evaluationWindow.timeframe;
	}

	if (evaluationWindow.windowType === 'cumulative') {
		const timezone = evaluationWindow.startingAt.timezone;
		const time = evaluationWindow.startingAt.time;
		const number = evaluationWindow.startingAt.number;

		switch (evaluationWindow.timeframe) {
			case 'currentHour':
				return `Current hour, starting from minute ${number} (${timezone})`;
			case 'currentDay':
				return `Current day, starting from ${time} (${timezone})`;
			case 'currentMonth':
				return `Current month, starting from day ${number} at ${time} (${timezone})`;
			default:
				return 'Select timeframe';
		}
	}

	return 'Select evaluation window';
};

export const getCompactDescription = (evaluationWindow: EvaluationWindowState): string => {
	if (evaluationWindow.windowType === 'rolling') {
		if (evaluationWindow.timeframe === 'custom') {
			const unitSymbol = evaluationWindow.customDuration.unit;
			return `Last ${evaluationWindow.customDuration.value}${unitSymbol}`;
		}
		// Convert timeframe to readable format
		const timeframeOption = EVALUATION_WINDOW_TIMEFRAME.rolling.find(opt => opt.value === evaluationWindow.timeframe);
		return timeframeOption?.label || evaluationWindow.timeframe;
	}

	if (evaluationWindow.windowType === 'cumulative') {
		const time = evaluationWindow.startingAt.time;
		const number = evaluationWindow.startingAt.number;

		switch (evaluationWindow.timeframe) {
			case 'currentHour':
				return `Current hour from min ${number}`;
			case 'currentDay':
				return `Current day from ${time}`;
			case 'currentMonth':
				return `Current month from day ${number}`;
			default:
				return 'Select timeframe';
		}
	}

	return 'Select evaluation window';
};

export const getTimeframeText = (
	windowType: 'rolling' | 'cumulative',
	timeframe: string,
	evaluationWindow?: EvaluationWindowState,
): string => {
	// If we have the full evaluation window object, use detailed description for button
	if (evaluationWindow) {
		return getDetailedDescription(evaluationWindow);
	}
	
	// Fallback to simple text for backwards compatibility
	if (windowType === 'rolling') {
		return getRollingWindowTimeframeText(timeframe as RollingWindowTimeframes);
	}
	return getCumulativeWindowTimeframeText(timeframe);
};

export function buildAlertScheduleFromRRule(
	rruleString: string,
	date: Dayjs | null,
	startAt: string,
	maxOccurrences = 10,
): Date[] | null {
	try {
		if (!rruleString) return null;

		// Handle literal \n in string
		let finalRRuleString = rruleString.replace(/\\n/g, '\n');

		if (date) {
			const dt = dayjs(date);
			if (!dt.isValid()) throw new Error('Invalid date provided');

			const [hours = 0, minutes = 0, seconds = 0] = startAt.split(':').map(Number);

			const dtWithTime = dt
				.set('hour', hours)
				.set('minute', minutes)
				.set('second', seconds)
				.set('millisecond', 0);

			const dtStartStr = dtWithTime
				.toISOString()
				.replace(/[-:]/g, '')
				.replace(/\.\d{3}Z$/, 'Z');

			if (!/DTSTART/i.test(finalRRuleString)) {
				finalRRuleString = `DTSTART:${dtStartStr}\n${finalRRuleString}`;
			}
		}

		const rruleObj = rrulestr(finalRRuleString);
		const occurrences: Date[] = [];
		rruleObj.all((date, index) => {
			if (index >= maxOccurrences) return false;
			occurrences.push(date);
			return true;
		});

		return occurrences;
	} catch (error) {
		console.error('Error building RRULE:', error);
		return null;
	}
}

function generateMonthlyOccurrences(
	targetDays: number[],
	hours: number,
	minutes: number,
	seconds: number,
	timezone: string,
	maxOccurrences: number,
): Date[] {
	const occurrences: Date[] = [];
	const currentMonth = dayjs().tz(timezone).startOf('month');

	Array.from({ length: maxOccurrences }).forEach((_, monthOffset) => {
		const monthDate = currentMonth.add(monthOffset, 'month');
		targetDays.forEach((day) => {
			if (occurrences.length >= maxOccurrences) return;

			const daysInMonth = monthDate.daysInMonth();
			if (day <= daysInMonth) {
				const targetDate = monthDate
					.date(day)
					.hour(hours)
					.minute(minutes)
					.second(seconds);
				if (targetDate.isAfter(dayjs().tz(timezone))) {
					occurrences.push(targetDate.toDate());
				}
			}
		});
	});

	return occurrences;
}

function generateWeeklyOccurrences(
	targetWeekdays: number[],
	hours: number,
	minutes: number,
	seconds: number,
	timezone: string,
	maxOccurrences: number,
): Date[] {
	const occurrences: Date[] = [];
	const currentWeek = dayjs().tz(timezone).startOf('week');

	Array.from({ length: maxOccurrences }).forEach((_, weekOffset) => {
		const weekDate = currentWeek.add(weekOffset, 'week');
		targetWeekdays.forEach((weekday) => {
			if (occurrences.length >= maxOccurrences) return;

			const targetDate = weekDate
				.day(weekday)
				.hour(hours)
				.minute(minutes)
				.second(seconds);
			if (targetDate.isAfter(dayjs().tz(timezone))) {
				occurrences.push(targetDate.toDate());
			}
		});
	});

	return occurrences;
}

export function buildAlertScheduleFromCustomSchedule(
	repeatEvery: string,
	occurence: string[],
	startAt: string,
	timezone: string,
	maxOccurrences = 10,
): Date[] | null {
	try {
		if (!repeatEvery || !occurence.length || !startAt || !timezone) {
			return null;
		}

		const [hours = 0, minutes = 0, seconds = 0] = startAt.split(':').map(Number);
		let occurrences: Date[] = [];

		if (repeatEvery === 'month') {
			const targetDays = occurence
				.map((day) => parseInt(day, 10))
				.filter((day) => !Number.isNaN(day));
			occurrences = generateMonthlyOccurrences(
				targetDays,
				hours,
				minutes,
				seconds,
				timezone,
				maxOccurrences,
			);
		} else if (repeatEvery === 'week') {
			const targetWeekdays = occurence
				.map((day) => WEEKDAY_MAP[day.toLowerCase()])
				.filter((day) => day !== undefined);
			occurrences = generateWeeklyOccurrences(
				targetWeekdays,
				hours,
				minutes,
				seconds,
				timezone,
				maxOccurrences,
			);
		}

		occurrences.sort((a, b) => a.getTime() - b.getTime());
		return occurrences.slice(0, maxOccurrences);
	} catch (error) {
		console.error('Error building custom schedule:', error);
		return null;
	}
}

export const TIMEZONE_DATA = generateTimezoneData().map((timezone) => ({
	label: `${timezone.name} (${timezone.offset})`,
	value: timezone.value,
}));

export function isValidRRule(rruleString: string): boolean {
	try {
		// normalize escaped \n
		const finalRRuleString = rruleString.replace(/\\n/g, '\n');
		rrulestr(finalRRuleString); // will throw if invalid
		return true;
	} catch {
		return false;
	}
}
