/* eslint-disable sonarjs/cognitive-complexity */
import { useEffect, useRef, useState } from 'react';
import { useGetSavedView } from 'api/generated/services/saved-view';
import { TelemetryFieldKey } from 'api/v5/v5';
import { getViewColumnsAndFormatting } from 'container/SavedViews/utils/getViewColumnsAndFormatting';

import { usePreferenceLoader } from '../loader/usePreferenceLoader';
import {
	getAIObservabilityViewColumns,
	isAIObservabilityPreference,
} from '../configs/aiObservabilityConfig';
import {
	FormattingOptions,
	PreferenceDataSource,
	PreferenceMode,
	Preferences,
} from '../types';
import { usePreferenceUpdater } from '../updater/usePreferenceUpdater';

export function usePreferenceSync({
	mode,
	dataSource,
	savedViewId,
}: {
	mode: PreferenceMode;
	dataSource: PreferenceDataSource;
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
		// AI explorer tabs are seeded below, once their own preferences have loaded.
		if (isAIObservabilityPreference(dataSource)) {
			return;
		}
		const view = viewData?.data;
		if (view && view.id === savedViewId) {
			if (seededViewId.current !== savedViewId) {
				seededViewId.current = savedViewId;
				setSavedViewPreferences(getViewColumnsAndFormatting(view.spec, dataSource));
			}
			return;
		}
		seededViewId.current = undefined;
		setSavedViewPreferences(getViewColumnsAndFormatting(undefined, dataSource));
	}, [viewData, dataSource, savedViewId]);

	// We are using a reSync state because we have URL updates as well as local storage updates
	// and we want to make sure we are always using the latest preferences
	const [reSync, setReSync] = useState(false);
	const { preferences, loading, error } = usePreferenceLoader({
		dataSource,
		reSync,
		setReSync,
	});

	useEffect(() => {
		if (!isAIObservabilityPreference(dataSource)) {
			return;
		}
		const view = viewData?.data;
		if (view && view.id === savedViewId) {
			if (seededViewId.current !== savedViewId) {
				seededViewId.current = savedViewId;
				// Only the tab the view was saved from takes its columns; the other keeps the user's own.
				setSavedViewPreferences({
					columns:
						getAIObservabilityViewColumns(dataSource, view) ??
						preferences?.columns ??
						[],
				});
			}
			return;
		}
		seededViewId.current = undefined;
		setSavedViewPreferences(null);
	}, [viewData, dataSource, savedViewId, preferences]);

	const { updateColumns, updateFormatting } = usePreferenceUpdater({
		dataSource,
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
