/* eslint-disable sonarjs/cognitive-complexity */
import { useEffect, useRef, useState } from 'react';
import { useGetSavedView } from 'api/generated/services/saved-view';
import { TelemetryFieldKey } from 'api/v5/v5';
import { getViewColumnsAndFormatting } from 'container/SavedViews/utils/getViewColumnsAndFormatting';

import { usePreferenceLoader } from '../loader/usePreferenceLoader';
import {
	FormattingOptions,
	PreferenceMode,
	Preferences,
	PreferenceSourcePage,
} from '../types';
import { usePreferenceUpdater } from '../updater/usePreferenceUpdater';

export function usePreferenceSync({
	mode,
	sourcePage,
	savedViewId,
}: {
	mode: PreferenceMode;
	sourcePage: PreferenceSourcePage;
	savedViewId: string | undefined;
}): {
	preferences: Preferences | null;
	loading: boolean;
	error: Error | null;
	updateColumns: (newColumns: TelemetryFieldKey[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
} {
	const isSavedViewMode = mode === PreferenceMode.SAVED_VIEW && !!savedViewId;
	const { data: viewData } = useGetSavedView(
		{ id: savedViewId ?? '' },
		{ query: { enabled: isSavedViewMode } },
	);

	const [savedViewPreferences, setSavedViewPreferences] =
		useState<Preferences | null>(null);

	// Seeded once per view: a refetch of the same view keeps columns edited in
	// memory. Discard writes the saved ones back through the updater.
	const seededViewId = useRef<string>();
	useEffect(() => {
		const view = viewData?.data;
		if (view && view.id === savedViewId) {
			if (seededViewId.current !== savedViewId) {
				seededViewId.current = savedViewId;
				setSavedViewPreferences(getViewColumnsAndFormatting(view.spec, sourcePage));
			}
			return;
		}
		seededViewId.current = undefined;
		setSavedViewPreferences(getViewColumnsAndFormatting(undefined, sourcePage));
	}, [viewData, sourcePage, savedViewId]);

	// We are using a reSync state because we have URL updates as well as local storage updates
	// and we want to make sure we are always using the latest preferences
	const [reSync, setReSync] = useState(false);
	const { preferences, loading, error } = usePreferenceLoader({
		sourcePage,
		reSync,
		setReSync,
	});

	const { updateColumns, updateFormatting } = usePreferenceUpdater({
		sourcePage,
		mode,
		preferences,
		setReSync,
		setSavedViewPreferences,
	});

	return {
		preferences:
			mode === PreferenceMode.SAVED_VIEW && savedViewId
				? savedViewPreferences
				: preferences,
		loading,
		error,
		updateColumns,
		updateFormatting,
	};
}
