/* eslint-disable sonarjs/cognitive-complexity */
import { useEffect, useRef, useState } from 'react';
import { useGetSavedView } from 'api/generated/services/saved-view';
import { TelemetryFieldKey } from 'api/v5/v5';
import { getViewColumnsAndFormatting } from 'container/SavedViews/utils/getViewColumnsAndFormatting';
import { DataSource } from 'types/common/queryBuilder';

import { usePreferenceLoader } from '../loader/usePreferenceLoader';
import { FormattingOptions, PreferenceMode, Preferences } from '../types';
import { usePreferenceUpdater } from '../updater/usePreferenceUpdater';

export function usePreferenceSync({
	mode,
	dataSource,
	savedViewId,
}: {
	mode: PreferenceMode;
	dataSource: DataSource;
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
