import { toast } from '@signozhq/sonner';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
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
	const { pathname, search } = useLocation();
	const [, setCopy] = useCopyToClipboard();

	const { safeNavigate } = useSafeNavigate();

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

			toast.success('Copied to clipboard', { position: 'top-right' });
		},
		[logId, urlQuery, minTime, maxTime, pathname, setCopy],
	);

	const onClearActiveLog = useCallback(() => {
		const currentUrlQuery = new URLSearchParams(search);
		currentUrlQuery.delete(QueryParams.activeLogId);
		const newUrl = `${pathname}?${currentUrlQuery.toString()}`;
		safeNavigate(newUrl);
	}, [pathname, search, safeNavigate]);

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
		onClearActiveLog,
	};
};
