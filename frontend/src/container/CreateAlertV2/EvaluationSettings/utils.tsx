import { generateTimezoneData } from 'components/CustomTimePicker/timezoneUtils';
import dayjs, { Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { rrulestr } from 'rrule';

import { RE_NOTIFICATION_UNIT_OPTIONS } from '../context/constants';
import { EvaluationWindowState } from '../context/types';
import { WEEKDAY_MAP } from './constants';
import { CumulativeWindowTimeframes, RollingWindowTimeframes } from './types';

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

export const getCumulativeWindowTimeframeText = (
	evaluationWindow: EvaluationWindowState,
): string => {
	switch (evaluationWindow.timeframe) {
		case CumulativeWindowTimeframes.CURRENT_HOUR:
			return `Current hour, starting at minute ${evaluationWindow.startingAt.number} (${evaluationWindow.startingAt.timezone})`;
		case CumulativeWindowTimeframes.CURRENT_DAY:
			return `Current day, starting from ${evaluationWindow.startingAt.time} (${evaluationWindow.startingAt.timezone})`;
		case CumulativeWindowTimeframes.CURRENT_MONTH:
			return `Current month, starting from day ${evaluationWindow.startingAt.number} at ${evaluationWindow.startingAt.time} (${evaluationWindow.startingAt.timezone})`;
		default:
			return '';
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

const getCustomRollingWindowTimeframeText = (
	evaluationWindow: EvaluationWindowState,
): string =>
	`Last ${evaluationWindow.startingAt.number} ${
		RE_NOTIFICATION_UNIT_OPTIONS.find(
			(option) => option.value === evaluationWindow.startingAt.unit,
		)?.label
	}${parseInt(evaluationWindow.startingAt.number, 10) > 1 ? 's' : ''}`;

export const getTimeframeText = (
	evaluationWindow: EvaluationWindowState,
): string => {
	if (evaluationWindow.windowType === 'rolling') {
		if (evaluationWindow.timeframe === 'custom') {
			return getCustomRollingWindowTimeframeText(evaluationWindow);
		}
		return getRollingWindowTimeframeText(
			evaluationWindow.timeframe as RollingWindowTimeframes,
		);
	}
	return getCumulativeWindowTimeframeText(evaluationWindow);
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
