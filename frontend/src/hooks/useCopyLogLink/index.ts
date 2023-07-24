import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { MouseEventHandler, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';

import { LogTimeRange, UseCopyLogLink } from './types';

const useCopyLogLink = (logId?: string): UseCopyLogLink => {
	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();
	const [, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();

	const {
		queryData: timeRange,
		redirectWithQuery: onTimeRangeChange,
	} = useUrlQueryData<LogTimeRange | null>(QueryParams.timeRange, null);

	const { queryData: activeLogId } = useUrlQueryData<string | null>(
		QueryParams.activeLogId,
		null,
	);

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

			const link = `${window.location.origin}${
				window.location.pathname
			}?${urlQuery.toString()}`;

			setCopy(link);
			notifications.success({
				message: 'Copied to clipboard',
			});
		},
		[logId, notifications, timeRange, urlQuery, setCopy],
	);

	return {
		isLogsExplorerPage,
		activeLogId,
		timeRange,
		onLogCopy,
		onTimeRangeChange,
	};
};

export default useCopyLogLink;
