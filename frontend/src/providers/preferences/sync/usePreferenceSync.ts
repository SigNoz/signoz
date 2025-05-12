import { useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
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
	updateColumns: (newColumns: BaseAutocompleteData[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
} {
	// We are using a reSync state because we have URL updates as well as local storage updates
	// and we want to make sure we are always using the latest preferences
	const [reSync, setReSync] = useState(0);
	const { preferences, loading, error } = usePreferenceLoader({
		mode,
		savedViewId: savedViewId || '',
		dataSource,
		reSync,
	});

	const { updateColumns, updateFormatting } = usePreferenceUpdater({
		dataSource,
		mode,
		setReSync,
	});

	return { preferences, loading, error, updateColumns, updateFormatting };
}
