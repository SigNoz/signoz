import getLocalStorageKey from 'api/browser/localstorage/get';
import dayjs from 'dayjs';
import getTimeString from 'lib/getTimeString';
import { useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getDiffs } from 'utils/getDiffs';

import ROUTES from '../constants/routes';
import {
	getDefaultOption,
	Options,
	ServiceMapOptions,
	Time,
} from '../container/TopNav/DateTimeSelection/config';

interface UseIntervalRangeI {
	getTime: () => [number, number] | undefined;
	getCustomOrIntervalTime: (time: Time, currentRoute: string) => Time;
}

type IntervalTimeStampsT = 'week' | 'hr' | 'day' | 'min';

export function useIntervalRange(): UseIntervalRangeI {
	const { search, pathname } = useLocation();
	const params = new URLSearchParams(search);
	const searchStartTime = params.get('startTime');
	const searchEndTime = params.get('endTime');

	const localstorageStartTime = getLocalStorageKey('startTime');
	const localstorageEndTime = getLocalStorageKey('endTime');

	const options = useMemo(
		() =>
			ROUTES.SERVICE_MAP === pathname
				? Object.values(ServiceMapOptions)
				: Object.values(Options),
		[pathname],
	);

	const getOptionValue = useCallback(
		(count: number, type: IntervalTimeStampsT): Time => {
			const filtered = options.map((m) => m.value).filter((o) => o.includes(type));
			const value = filtered.find((f) => +f.replace(type, '') >= count);
			return value || filtered[filtered.length - 1];
		},
		[options],
	);

	const getMaxValue = useCallback(
		(count: number, type: IntervalTimeStampsT): number => {
			const optionCounts = options
				.map((o) => o.value)
				.filter((f) => f.includes(type))
				.map((s) => +s.replace(type, ''));
			return Math.max(...optionCounts);
		},
		[options],
	);

	const getOption = useCallback(
		(count: number, type: IntervalTimeStampsT, alt: Time): Time => {
			const maxDays = getMaxValue(count, type);
			if (count > maxDays) {
				return alt;
			}
			return getOptionValue(count, type);
		},
		[getMaxValue, getOptionValue],
	);

	const getQueryInterval = useCallback(
		(searchStartTime: string) => {
			const lastRefresh = dayjs(
				new Date(parseInt(getTimeString(searchStartTime), 10)),
			);
			const { minutedDiff, hoursDiff, daysDiff, weekDiffFloat } = getDiffs(
				lastRefresh,
			);

			if (weekDiffFloat >= 1) {
				return getOption(Math.round(weekDiffFloat), 'week', 'custom');
			}

			if (daysDiff) {
				return getOption(daysDiff, 'day', '1week');
			}

			if (hoursDiff) {
				return getOption(hoursDiff, 'hr', '1day');
			}

			if (minutedDiff) {
				return getOption(minutedDiff, 'min', '1hr');
			}

			return ROUTES.SERVICE_MAP === pathname ? 'custom' : '1week';
		},
		[getOption, pathname],
	);

	const getCustomOrIntervalTime = useCallback(
		(time: Time, currentRoute: string): Time => {
			if (searchEndTime && searchStartTime) {
				return getQueryInterval(searchStartTime);
			}

			if (
				(localstorageEndTime === null || localstorageStartTime === null) &&
				time === 'custom'
			) {
				return getDefaultOption(currentRoute);
			}
			return time;
		},
		[
			getQueryInterval,
			localstorageEndTime,
			localstorageStartTime,
			searchEndTime,
			searchStartTime,
		],
	);

	const getTime = useCallback((): [number, number] | undefined => {
		if (searchEndTime && searchStartTime) {
			const startDate = dayjs(
				new Date(parseInt(getTimeString(searchStartTime), 10)),
			);
			const endDate = dayjs(new Date(parseInt(getTimeString(searchEndTime), 10)));

			return [startDate.toDate().getTime() || 0, endDate.toDate().getTime() || 0];
		}
		if (localstorageStartTime && localstorageEndTime) {
			const startDate = dayjs(localstorageStartTime);
			const endDate = dayjs(localstorageEndTime);

			return [startDate.toDate().getTime() || 0, endDate.toDate().getTime() || 0];
		}
		return undefined;
	}, [
		localstorageEndTime,
		localstorageStartTime,
		searchEndTime,
		searchStartTime,
	]);

	const { current } = useRef({ getCustomOrIntervalTime, getTime });

	return current;
}
