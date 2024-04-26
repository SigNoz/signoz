import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import useUrlQueryData from 'hooks/useUrlQueryData';
import history from 'lib/history';
import {
	MouseEventHandler,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { HIGHLIGHTED_DELAY } from './configs';
import { LogTimeRange, UseCopyLogLink } from './types';

export const useCopyLogLink = (logId?: string): UseCopyLogLink => {
	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();
	const [, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();

	const { queryData: timeRange } = useUrlQueryData<LogTimeRange | null>(
		QueryParams.timeRange,
		null,
	);

	const { queryData: activeLogId } = useUrlQueryData<string | null>(
		QueryParams.activeLogId,
		null,
	);

	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const onTimeRangeChange = useCallback(
		(newTimeRange: LogTimeRange | null): void => {
			urlQuery.set(QueryParams.timeRange, JSON.stringify(newTimeRange));

			if (selectedTime !== 'custom') {
				urlQuery.delete(QueryParams.startTime);
				urlQuery.delete(QueryParams.endTime);

				urlQuery.set(QueryParams.relativeTime, selectedTime);
			} else {
				urlQuery.set(QueryParams.startTime, newTimeRange?.start.toString() || '');
				urlQuery.set(QueryParams.endTime, newTimeRange?.end.toString() || '');

				urlQuery.delete(QueryParams.relativeTime);
			}

			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			history.replace(generatedUrl);
		},
		[pathname, urlQuery, selectedTime],
	);

	const isActiveLog = useMemo(() => activeLogId === logId, [activeLogId, logId]);
	const [isHighlighted, setIsHighlighted] = useState<boolean>(isActiveLog);

	const isLogsExplorerPage = useMemo(() => pathname === ROUTES.LOGS_EXPLORER, [
		pathname,
	]);

	const onLogCopy: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			if (!logId) return;

			event.preventDefault();
			event.stopPropagation();

			const range = JSON.stringify(timeRange);

			urlQuery.delete(QueryParams.activeLogId);
			urlQuery.delete(QueryParams.timeRange);
			urlQuery.set(QueryParams.activeLogId, `"${logId}"`);
			urlQuery.set(QueryParams.timeRange, range);
			urlQuery.set(QueryParams.startTime, timeRange?.start.toString() || '');
			urlQuery.set(QueryParams.endTime, timeRange?.end.toString() || '');

			const link = `${window.location.origin}${pathname}?${urlQuery.toString()}`;

			setCopy(link);
			notifications.success({
				message: 'Copied to clipboard',
			});
		},
		[logId, timeRange, urlQuery, pathname, setCopy, notifications],
	);

	useEffect(() => {
		if (!isActiveLog) return;

		const timer = setTimeout(() => setIsHighlighted(false), HIGHLIGHTED_DELAY);

		// eslint-disable-next-line consistent-return
		return (): void => {
			clearTimeout(timer);
		};
	}, [isActiveLog]);

	return {
		isHighlighted,
		isLogsExplorerPage,
		activeLogId,
		timeRange,
		onLogCopy,
		onTimeRangeChange,
	};
};
