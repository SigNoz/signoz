import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import { MouseEventHandler, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { Span } from 'types/api/trace/getTraceV2';

export const useCopySpanLink = (
	span?: Span,
): { onSpanCopy: MouseEventHandler<HTMLElement> } => {
	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();
	const [, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();

	const onSpanCopy: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			if (!span) return;

			event.preventDefault();
			event.stopPropagation();

			urlQuery.delete('spanId');

			if (span.spanId) {
				urlQuery.set('spanId', span?.spanId);
			}

			const link = `${window.location.origin}${pathname}?${urlQuery.toString()}`;

			setCopy(link);
			notifications.success({
				message: 'Copied to clipboard',
			});
		},
		[span, urlQuery, pathname, setCopy, notifications],
	);

	return {
		onSpanCopy,
	};
};
