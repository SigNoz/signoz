import { useCallback, useMemo, useState } from 'react';
import { useDetailsPanel } from 'components/DetailsPanel';
import { DetailsPanelState } from 'components/DetailsPanel/types';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';

import { ThreadSpan } from '../types';

const SPAN_ID_PARAM = 'spanId';

interface ThreadSpanSelection {
	// The spanId the thread was opened with; it shapes the first page fetched.
	anchorSpanId?: string;
	clearAnchor: () => void;
	selectedSpanId?: string;
	selectSpan: (span: ThreadSpan) => void;
	panelState: DetailsPanelState;
}

export function useThreadSpanSelection(): ThreadSpanSelection {
	const urlQuery = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();
	const selectedSpanId = urlQuery.get(SPAN_ID_PARAM) || undefined;
	const [anchorSpanId, setAnchorSpanId] = useState(selectedSpanId);

	const setSpanIdParam = useCallback(
		(spanId?: string): void => {
			if (spanId) {
				urlQuery.set(SPAN_ID_PARAM, spanId);
			} else {
				urlQuery.delete(SPAN_ID_PARAM);
			}
			safeNavigate({ search: urlQuery.toString() }, { replace: true });
		},
		[urlQuery, safeNavigate],
	);

	const handleClose = useCallback(
		(): void => setSpanIdParam(undefined),
		[setSpanIdParam],
	);

	const panelState = useDetailsPanel({
		entityId: selectedSpanId,
		onClose: handleClose,
	});

	const { open: openPanel } = panelState;
	const selectSpan = useCallback(
		(span: ThreadSpan): void => {
			setSpanIdParam(span.span_id);
			openPanel();
		},
		[setSpanIdParam, openPanel],
	);

	const clearAnchor = useCallback((): void => {
		setAnchorSpanId(undefined);
		setSpanIdParam(undefined);
	}, [setSpanIdParam]);

	return useMemo(
		() => ({
			anchorSpanId,
			clearAnchor,
			selectedSpanId,
			selectSpan,
			panelState,
		}),
		[anchorSpanId, clearAnchor, selectedSpanId, selectSpan, panelState],
	);
}
