import React, {
	// eslint-disable-next-line no-restricted-imports
	createContext,
	// eslint-disable-next-line no-restricted-imports
	useContext,
	useMemo,
} from 'react';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import useUrlQuery from 'hooks/useUrlQuery';
import {
	PreferenceContextValue,
	PreferenceMode,
} from 'providers/preferences/types';

import { useAiObservabilityPreferenceSync } from '../sync/useAiObservabilityPreferenceSync';
import { usePreferenceSync } from '../sync/usePreferenceSync';

const PreferenceContext = createContext<PreferenceContextValue | undefined>(
	undefined,
);

export function PreferenceContextProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const params = useUrlQuery();

	let savedViewId = '';
	const viewKeyParam = params.get('viewKey');
	if (viewKeyParam) {
		try {
			savedViewId = JSON.parse(viewKeyParam);
		} catch (e) {
			console.error(e);
		}
	}

	const logsSlice = usePreferenceSync({
		mode: savedViewId ? PreferenceMode.SAVED_VIEW : PreferenceMode.DIRECT,
		savedViewId: savedViewId || undefined,
		sourcePage: SavedviewtypesSourceDTO.logs,
	});

	const tracesSlice = usePreferenceSync({
		mode: savedViewId ? PreferenceMode.SAVED_VIEW : PreferenceMode.DIRECT,
		savedViewId: savedViewId || undefined,
		sourcePage: SavedviewtypesSourceDTO.traces,
	});

	const aiObservabilitySlice = useAiObservabilityPreferenceSync({
		mode: savedViewId ? PreferenceMode.SAVED_VIEW : PreferenceMode.DIRECT,
		savedViewId: savedViewId || undefined,
	});

	const value = useMemo<PreferenceContextValue>(
		() => ({
			[SavedviewtypesSourceDTO.logs]: logsSlice,
			[SavedviewtypesSourceDTO.traces]: tracesSlice,
			[SavedviewtypesSourceDTO.ai_observability]: aiObservabilitySlice,
		}),
		[logsSlice, tracesSlice, aiObservabilitySlice],
	);

	return (
		<PreferenceContext.Provider value={value}>
			{children}
		</PreferenceContext.Provider>
	);
}

export function usePreferenceContext(): PreferenceContextValue {
	const ctx = useContext(PreferenceContext);
	if (!ctx) {
		throw new Error(
			'usePreferenceContext must be used within PreferenceContextProvider',
		);
	}
	return ctx;
}
