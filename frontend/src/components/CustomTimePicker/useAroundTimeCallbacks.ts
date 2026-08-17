import { useCallback, useState } from 'react';

import dayjs from 'dayjs';

import { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';

import { OFFSET_PRESETS, AroundTimeState } from './AroundTimeContainer.types';
import { clampTimeComponent, parseOffsetToMs } from './aroundTimeUtils';

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
): AroundTimeState | null {
	const fromMs = initialFrom.getTime();
	const toMs = initialTo.getTime();
	const halfSpanMs = (toMs - fromMs) / 2;

	const matchingPreset = OFFSET_PRESETS.find(
		(p) => parseOffsetToMs(p.value) === halfSpanMs,
	);
	if (!matchingPreset) {
		return null;
	}

	const center = dayjs(fromMs + halfSpanMs);
	return {
		centerDate: center.toDate(),
		centerHour: String(center.hour()).padStart(2, '0'),
		centerMinute: String(center.minute()).padStart(2, '0'),
		centerSecond: String(center.second()).padStart(2, '0'),
		offset: matchingPreset.value,
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
	const [state, setState] = useState<AroundTimeState>(() => {
		if (initialFrom && initialTo) {
			const derived = deriveInitialState(initialFrom, initialTo);
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
	const canApply = state.centerDate !== undefined && offsetMs !== null;

	const onApplyHandler = useCallback((): void => {
		if (!state.centerDate || offsetMs === null) {
			return;
		}

		const hour = parseInt(clampTimeComponent(state.centerHour, 23), 10);
		const minute = parseInt(clampTimeComponent(state.centerMinute, 59), 10);
		const second = parseInt(clampTimeComponent(state.centerSecond, 59), 10);

		const centerMs = dayjs(state.centerDate)
			.hour(hour)
			.minute(minute)
			.second(second)
			.millisecond(0)
			.valueOf();

		const from = dayjs(centerMs - offsetMs);
		const to = dayjs(centerMs + offsetMs);

		onApply([from, to]);
	}, [state, offsetMs, onApply]);

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
