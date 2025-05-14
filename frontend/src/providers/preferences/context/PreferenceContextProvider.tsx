import { PreferenceContextValue } from 'providers/preferences/types';
import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DataSource } from 'types/common/queryBuilder';

import { usePreferenceSync } from '../sync/usePreferenceSync';

// This will help in identifying the mode of the preference context
// savedView - when the preference is loaded from a saved view
// direct - when the preference is loaded from a direct query

export type PreferenceMode = 'savedView' | 'direct';

const PreferenceContext = createContext<PreferenceContextValue | undefined>(
	undefined,
);

export function PreferenceContextProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const location = useLocation();
	const params = new URLSearchParams(location.search);

	let savedViewId = '';
	const viewKeyParam = params.get('viewKey');
	if (viewKeyParam) {
		try {
			savedViewId = JSON.parse(viewKeyParam);
		} catch (e) {
			console.error(e);
		}
	}
	let dataSource: DataSource = DataSource.LOGS;
	if (location.pathname.includes('traces')) dataSource = DataSource.TRACES;

	const {
		preferences,
		loading,
		error,
		updateColumns,
		updateFormatting,
	} = usePreferenceSync({
		mode: savedViewId ? 'savedView' : 'direct',
		savedViewId: savedViewId || undefined,
		dataSource,
	});

	const value = useMemo<PreferenceContextValue>(
		() => ({
			preferences,
			loading,
			error,
			mode: savedViewId ? 'savedView' : 'direct',
			savedViewId: savedViewId || undefined,
			dataSource,
			updateColumns,
			updateFormatting,
		}),
		[
			savedViewId,
			dataSource,
			preferences,
			loading,
			error,
			updateColumns,
			updateFormatting,
		],
	);

	return (
		<PreferenceContext.Provider value={value}>
			{children}
		</PreferenceContext.Provider>
	);
}

export function usePreferenceContext(): PreferenceContextValue {
	const ctx = useContext(PreferenceContext);
	if (!ctx)
		throw new Error(
			'usePreferenceContext must be used within PreferenceContextProvider',
		);
	return ctx;
}
