import { useCallback, useState } from 'react';

import dayjs from 'dayjs';

import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import { useTimezone } from 'providers/Timezone';

import { OFFSET_PRESETS, AroundTimeState } from './AroundTimeContainer.types';
import {
	isValidTime,
	parseOffsetToMs,
	toCalendarDate,
	toZonedDateTime,
} from './aroundTimeUtils';

const DEFAULT_STATE: AroundTimeState = {
	centerDate: undefined,
	centerHour: '12',
	centerMinute: '00',
	centerSecond: '00',
	offset: '15m',
};

function deriveInitialState(
	initialFrom: Date,
	initialTo: Date,
	timezone: string,
): AroundTimeState | null {
	const fromMs = initialFrom.getTime();
	const toMs = initialTo.getTime();
	const halfSpanMs = (toMs - fromMs) / 2;
	if (!Number.isFinite(halfSpanMs) || halfSpanMs <= 0) {
		return null;
	}

	const matchingPreset = OFFSET_PRESETS.find(
		(p) => parseOffsetToMs(p.value) === halfSpanMs,
	);
	const center = dayjs(fromMs + halfSpanMs).tz(timezone);
	return {
		centerDate: toCalendarDate(center.toDate(), timezone),
		centerHour: String(center.hour()).padStart(2, '0'),
		centerMinute: String(center.minute()).padStart(2, '0'),
		centerSecond: String(center.second()).padStart(2, '0'),
		offset:
			matchingPreset?.value ??
			(Number.isInteger(halfSpanMs / 60_000)
				? `${halfSpanMs / 60_000}m`
				: DEFAULT_STATE.offset),
	};
}

interface UseAroundTimeCallbacksReturn {
	state: AroundTimeState;
	onSelectDate: (date: Date | undefined) => void;
	onHourChange: (value: string) => void;
	onMinuteChange: (value: string) => void;
	onSecondChange: (value: string) => void;
	onOffsetChange: (value: string) => void;
	onApply: () => void;
	canApply: boolean;
}

export function useAroundTimeCallbacks(
	onApply: (range: DateTimeRangeType) => void,
	initialFrom?: Date,
	initialTo?: Date,
): UseAroundTimeCallbacksReturn {
	const { timezone } = useTimezone();
	const [state, setState] = useState<AroundTimeState>(() => {
		if (initialFrom && initialTo) {
			const derived = deriveInitialState(initialFrom, initialTo, timezone.value);
			if (derived) {
				return derived;
			}
		}
		return DEFAULT_STATE;
	});

	const onSelectDate = useCallback((date: Date | undefined): void => {
		setState((prev) => ({ ...prev, centerDate: date }));
	}, []);

	const onHourChange = useCallback((value: string): void => {
		setState((prev) => ({ ...prev, centerHour: value }));
	}, []);

	const onMinuteChange = useCallback((value: string): void => {
		setState((prev) => ({ ...prev, centerMinute: value }));
	}, []);

	const onSecondChange = useCallback((value: string): void => {
		setState((prev) => ({ ...prev, centerSecond: value }));
	}, []);

	const onOffsetChange = useCallback((value: string): void => {
		setState((prev) => ({ ...prev, offset: value }));
	}, []);

	const offsetMs = parseOffsetToMs(state.offset);
	const center =
		state.centerDate &&
		isValidTime(state.centerHour, state.centerMinute, state.centerSecond)
			? toZonedDateTime(
					state.centerDate,
					{
						hour: state.centerHour,
						minute: state.centerMinute,
						second: state.centerSecond,
					},
					timezone.value,
				)
			: null;
	const from =
		center && offsetMs !== null ? center.subtract(offsetMs, 'ms') : null;
	const to = center && offsetMs !== null ? center.add(offsetMs, 'ms') : null;
	const canApply = !!(from?.isValid() && to?.isValid() && from.isBefore(to));

	const onApplyHandler = useCallback((): void => {
		if (!canApply || !from || !to) {
			return;
		}

		onApply([from, to]);
	}, [canApply, from, to, onApply]);

	return {
		state,
		onSelectDate,
		onHourChange,
		onMinuteChange,
		onSecondChange,
		onOffsetChange,
		onApply: onApplyHandler,
		canApply,
	};
}
