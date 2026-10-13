import { useEffect, useRef, useState } from 'react';
import { useGetSavedView } from 'api/generated/services/saved-view';
import { QueryParams } from 'constants/query';
import { useGetSavedViewParams } from 'hooks/saveViews/useGetSavedViewParams';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';

import { UseRestoreLastUsedViewArgs } from '../types';
import { useLastUsedView } from './useLastUsedView';

export function useRestoreLastUsedView({
	source,
	selectView,
}: UseRestoreLastUsedViewArgs): void {
	const { viewKey } = useGetSavedViewParams();
	const { getLastUsedViewKey, clearLastUsedView } = useLastUsedView(source);

	// Decided on the first render, before the explorer writes its default query
	// to the url; later an empty url means the view was cleared.
	const [lastUsedViewKey] = useState(() => {
		const params = getUnstableCurrentSearchParams();
		const isBare =
			!params.get(QueryParams.viewKey) && !params.get(QueryParams.compositeQuery);
		return isBare ? getLastUsedViewKey() : undefined;
	});
	const hasRestored = useRef(false);

	const shouldRestore = !!lastUsedViewKey && !viewKey && !hasRestored.current;

	const { data, isError } = useGetSavedView(
		{ id: lastUsedViewKey ?? '' },
		{ query: { enabled: shouldRestore } },
	);
	const view = data?.data;

	useEffect(() => {
		if (!shouldRestore) {
			return undefined;
		}
		if (isError) {
			hasRestored.current = true;
			clearLastUsedView();
			return undefined;
		}
		if (!view) {
			return undefined;
		}

		// Deferred like the bar's restore, so it lands after the explorer has
		// written its default query to the url.
		const timeoutId = setTimeout(() => {
			hasRestored.current = true;
			selectView(view);
		}, 0);
		return (): void => clearTimeout(timeoutId);
	}, [shouldRestore, isError, view, clearLastUsedView, selectView]);
}
