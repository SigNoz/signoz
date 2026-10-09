/* eslint-disable sonarjs/cognitive-complexity */
import { useEffect, useState } from 'react';
import { useListSavedViews } from 'api/generated/services/saved-view';
import { TelemetryFieldKey } from 'api/v5/v5';
import { findSavedView } from 'container/SavedViews/utils/findSavedView';
import { getViewColumnsAndFormatting } from 'container/SavedViews/utils/getViewColumnsAndFormatting';
import { toSavedViewSource } from 'container/SavedViews/utils/toSavedViewSource';
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
	const { data: viewsData } = useListSavedViews(
		{ source: toSavedViewSource(dataSource) },
		{ query: { enabled: mode === PreferenceMode.SAVED_VIEW } },
	);

	const [savedViewPreferences, setSavedViewPreferences] =
		useState<Preferences | null>(null);

	useEffect(() => {
		const spec = savedViewId
			? findSavedView(viewsData?.data, savedViewId)?.spec
			: undefined;
		setSavedViewPreferences(getViewColumnsAndFormatting(spec, dataSource));
	}, [viewsData, dataSource, savedViewId, mode]);

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
