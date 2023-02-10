import getLocalStorageKey from 'api/browser/localstorage/get';
import dayjs from 'dayjs';
import getTimeString from 'lib/getTimeString';
import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getDiffs } from 'utils/getDiffs';

import {
	getDefaultOption,
	Time,
} from '../container/TopNav/DateTimeSelection/config';

interface UseIntervalRangeI {
	getTime: () => [number, number] | undefined;
	getCustomOrIntervalTime: (time: Time, currentRoute: string) => Time;
}

export function useIntervalRange(): UseIntervalRangeI {
	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const searchStartTime = params.get('startTime');
	const searchEndTime = params.get('endTime');

	const localstorageStartTime = getLocalStorageKey('startTime');
	const localstorageEndTime = getLocalStorageKey('endTime');
	const getQueryInterval = useCallback((searchStartTime: string) => {
		const lastRefresh = dayjs(
			new Date(parseInt(getTimeString(searchStartTime), 10)),
		);
		const { minutedDiff, hoursDiff, daysDiff } = getDiffs(lastRefresh);

		if (daysDiff > 1) {
			return '1week';
		}
		if (hoursDiff > 6) {
			return '1day';
		}
		if (hoursDiff > 1) {
			return '6hr';
		}
		if (hoursDiff > 0) {
			return '1hr';
		}
		if (minutedDiff > 15) {
			return '30min';
		}
		if (minutedDiff > 5) {
			return '15min';
		}
		if (minutedDiff > 1) {
			return '5min';
		}
		return 'custom';
	}, []);

	const getCustomOrIntervalTime = useCallback(
		(time: Time, currentRoute: string): Time => {
			if (searchEndTime !== null && searchStartTime !== null) {
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

	return { getCustomOrIntervalTime, getTime };
}
