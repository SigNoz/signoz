import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import useUrlQueryData from 'hooks/useUrlQueryData';
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
import { UseCopyLogLink } from './types';

export const useCopyLogLink = (logId?: string): UseCopyLogLink => {
	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();
	const [, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();

	const { queryData: activeLogId } = useUrlQueryData<string | null>(
		QueryParams.activeLogId,
		null,
	);

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
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

			urlQuery.delete(QueryParams.activeLogId);
			urlQuery.delete(QueryParams.relativeTime);

			urlQuery.set(QueryParams.activeLogId, `"${logId}"`);
			urlQuery.set(QueryParams.startTime, minTime?.toString() || '');
			urlQuery.set(QueryParams.endTime, maxTime?.toString() || '');

			const link = `${window.location.origin}${pathname}?${urlQuery.toString()}`;

			setCopy(link);
			notifications.success({
				message: 'Copied to clipboard',
			});
		},
		[logId, urlQuery, minTime, maxTime, pathname, setCopy, notifications],
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
		onLogCopy,
	};
};
