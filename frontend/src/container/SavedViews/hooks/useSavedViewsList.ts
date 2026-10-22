import { useMemo } from 'react';
import { useListSavedViews } from 'api/generated/services/saved-view';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { useAppContext } from 'providers/App/App';

import { UseSavedViewsListResult } from '../types';

export function useSavedViewsList(
	source: SavedviewtypesSourceDTO,
	search: string,
): UseSavedViewsListResult {
	const { user } = useAppContext();
	const { data, isLoading, isError, refetch } = useListSavedViews({ source });

	const { createdByMe, createdByOthers } = useMemo(() => {
		const term = search.trim().toLowerCase();
		const views = (data?.data ?? []).filter((view) =>
			view.spec.displayName.toLowerCase().includes(term),
		);
		return {
			createdByMe: views.filter((view) => view.createdBy === user.email),
			createdByOthers: views.filter((view) => view.createdBy !== user.email),
		};
	}, [data, search, user.email]);

	return {
		createdByMe,
		createdByOthers,
		isLoading,
		isError,
		refetch: (): void => {
			void refetch();
		},
	};
}
