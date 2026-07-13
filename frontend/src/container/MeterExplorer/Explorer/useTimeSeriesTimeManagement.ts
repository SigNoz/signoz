import { useCallback, useEffect, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import getTimeString from 'lib/getTimeString';
import history from 'lib/history';
import { UpdateTimeInterval } from 'store/actions';
import { getTimeRange } from 'utils/getTimeRange';

interface UseTimeSeriesTimeManagementProps {
	globalSelectedTime: Time | CustomTimeType;
	maxTime: number;
	minTime: number;
}

interface UseTimeSeriesTimeManagementResult {
	minTimeScale: number | undefined;
	maxTimeScale: number | undefined;
	onDragSelect: (start: number, end: number) => void;
}

export function useTimeSeriesTimeManagement({
	globalSelectedTime,
	maxTime,
	minTime,
}: UseTimeSeriesTimeManagementProps): UseTimeSeriesTimeManagementResult {
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const location = useLocation();

	const [minTimeScale, setMinTimeScale] = useState<number>();
	const [maxTimeScale, setMaxTimeScale] = useState<number>();

	useEffect((): void => {
		const { startTime, endTime } = getTimeRange();
		setMinTimeScale(startTime);
		setMaxTimeScale(endTime);
	}, [maxTime, minTime, globalSelectedTime]);

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}

			const { maxTime, minTime } = GetMinMax('custom', [
				startTimestamp,
				endTimestamp,
			]);

			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
			urlQuery.delete(QueryParams.relativeTime);
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[dispatch, location.pathname, urlQuery],
	);

	const handleBackNavigation = useCallback((): void => {
		const searchParams = new URLSearchParams(window.location.search);
		const startTime = searchParams.get(QueryParams.startTime);
		const endTime = searchParams.get(QueryParams.endTime);
		const relativeTime = searchParams.get(
			QueryParams.relativeTime,
		) as CustomTimeType;

		if (relativeTime) {
			dispatch(UpdateTimeInterval(relativeTime));
		} else if (startTime && endTime && startTime !== endTime) {
			dispatch(
				UpdateTimeInterval('custom', [
					parseInt(getTimeString(startTime), 10),
					parseInt(getTimeString(endTime), 10),
				]),
			);
		}
	}, [dispatch]);

	useEffect(() => {
		window.addEventListener('popstate', handleBackNavigation);
		return (): void => {
			window.removeEventListener('popstate', handleBackNavigation);
		};
	}, [handleBackNavigation]);

	return {
		minTimeScale,
		maxTimeScale,
		onDragSelect,
	};
}
