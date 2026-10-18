import { MouseEventHandler, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import { toast } from '@signozhq/ui/sonner';
import { getAbsoluteUrl } from 'utils/basePath';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';

// Accepts both V2 (spanId) and V3 (span_id) span shapes
// TODO: Remove V2 (spanId) support when phasing out V2
interface SpanLike {
	spanId?: string;
	span_id?: string;
}

export const useCopySpanLink = (
	span?: SpanLike,
): { onSpanCopy: MouseEventHandler<HTMLElement> } => {
	const { pathname } = useLocation();
	const [, setCopy] = useCopyToClipboard();

	const onSpanCopy: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			if (!span) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

			const params = getUnstableCurrentSearchParams();
			params.delete('spanId');

			const id = span.span_id || span.spanId;
			if (id) {
				params.set('spanId', id);
			}

			const link = getAbsoluteUrl(`${pathname}?${params.toString()}`);

			setCopy(link);
			toast.success('Copied to clipboard', {
				position: 'top-right',
			});
		},
		[span, pathname, setCopy],
	);

	return {
		onSpanCopy,
	};
};
