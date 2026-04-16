import { MouseEventHandler, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { toast } from '@signozhq/sonner';
import useUrlQuery from 'hooks/useUrlQuery';
import { Span } from 'types/api/trace/getTraceV2';

export const useCopySpanLink = (
	span?: Span,
): { onSpanCopy: MouseEventHandler<HTMLElement> } => {
	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();
	const [, setCopy] = useCopyToClipboard();

	const onSpanCopy: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			if (!span) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			urlQuery.delete('spanId');

			if (span.spanId) {
				urlQuery.set('spanId', span?.spanId);
			}

			const link = `${window.location.origin}${pathname}?${urlQuery.toString()}`;

			setCopy(link);
			toast.success('Copied to clipboard', {
				richColors: true,
				position: 'top-right',
			});
		},
		[span, urlQuery, pathname, setCopy],
	);

	return {
		onSpanCopy,
	};
};
