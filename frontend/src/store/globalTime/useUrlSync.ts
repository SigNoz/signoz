import { useEffect, useRef } from 'react';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Time } from 'container/TopNav/DateTimeSelectionV2/types';
import { isValidShortHandDateTimeFormat } from 'lib/getMinMax';

import { GlobalTimeStoreApi } from './globalTimeStore';
import { GlobalTimeProviderOptions } from './types';
import {
	createCustomTimeRange,
	isCustomTimeRange,
	NANO_SECOND_MULTIPLIER,
	parseCustomTimeRange,
} from './utils';

interface UrlSyncConfig {
	relativeTimeKey: string;
	startTimeKey: string;
	endTimeKey: string;
}

/**
 * Used to sync internal state with URL when URL params are enabled.
 *
 * @internal
 */
export function useUrlSync(
	store: GlobalTimeStoreApi,
	enableUrlParams: GlobalTimeProviderOptions['enableUrlParams'],
	removeOnUnmount: boolean,
): void {
	const isInitialMount = useRef(true);

	const keys: UrlSyncConfig =
		enableUrlParams && typeof enableUrlParams === 'object'
			? {
					relativeTimeKey: enableUrlParams.relativeTimeKey ?? 'relativeTime',
					startTimeKey: enableUrlParams.startTimeKey ?? 'startTime',
					endTimeKey: enableUrlParams.endTimeKey ?? 'endTime',
				}
			: {
					relativeTimeKey: 'relativeTime',
					startTimeKey: 'startTime',
					endTimeKey: 'endTime',
				};

	const [urlState, setUrlState] = useQueryStates(
		{
			[keys.relativeTimeKey]: parseAsString,
			[keys.startTimeKey]: parseAsInteger,
			[keys.endTimeKey]: parseAsInteger,
		},
		{ history: 'replace' },
	);

	useEffect(() => {
		if (!enableUrlParams || !isInitialMount.current) {
			return;
		}
		isInitialMount.current = false;

		const relativeTime = urlState[keys.relativeTimeKey];
		const startTime = urlState[keys.startTimeKey];
		const endTime = urlState[keys.endTimeKey];

		if (typeof startTime === 'number' && typeof endTime === 'number') {
			const customTime = createCustomTimeRange(
				startTime * NANO_SECOND_MULTIPLIER,
				endTime * NANO_SECOND_MULTIPLIER,
			);
			store.getState().setSelectedTime(customTime);
		} else if (
			typeof relativeTime === 'string' &&
			isValidShortHandDateTimeFormat(relativeTime)
		) {
			store.getState().setSelectedTime(relativeTime as Time);
		}
	}, [
		urlState,
		keys?.startTimeKey,
		keys?.endTimeKey,
		keys?.relativeTimeKey,
		store,
		enableUrlParams,
	]);

	useEffect(() => {
		if (!enableUrlParams) {
			return;
		}

		let previousSelectedTime = store.getState().selectedTime;

		return store.subscribe((state) => {
			if (state.selectedTime === previousSelectedTime) {
				return;
			}
			previousSelectedTime = state.selectedTime;

			if (isCustomTimeRange(state.selectedTime)) {
				const parsed = parseCustomTimeRange(state.selectedTime);
				if (parsed) {
					void setUrlState({
						[keys.relativeTimeKey]: null,
						[keys.startTimeKey]: Math.floor(parsed.minTime / NANO_SECOND_MULTIPLIER),
						[keys.endTimeKey]: Math.floor(parsed.maxTime / NANO_SECOND_MULTIPLIER),
					});
				}
			} else {
				void setUrlState({
					[keys.relativeTimeKey]: state.selectedTime,
					[keys.startTimeKey]: null,
					[keys.endTimeKey]: null,
				});
			}
		});
	}, [
		store,
		keys?.startTimeKey,
		keys?.endTimeKey,
		keys?.relativeTimeKey,
		setUrlState,
		enableUrlParams,
	]);

	useEffect(() => {
		if (!enableUrlParams || !removeOnUnmount) {
			return;
		}

		return (): void => {
			void setUrlState({
				[keys.relativeTimeKey]: null,
				[keys.startTimeKey]: null,
				[keys.endTimeKey]: null,
			});
		};
	}, [
		removeOnUnmount,
		keys?.relativeTimeKey,
		keys?.startTimeKey,
		keys?.endTimeKey,
		setUrlState,
		enableUrlParams,
	]);
}
