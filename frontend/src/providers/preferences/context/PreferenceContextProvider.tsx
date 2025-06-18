import useUrlQuery from 'hooks/useUrlQuery';
import {
	PreferenceContextValue,
	PreferenceMode,
} from 'providers/preferences/types';
import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DataSource } from 'types/common/queryBuilder';

import { usePreferenceSync } from '../sync/usePreferenceSync';

const PreferenceContext = createContext<PreferenceContextValue | undefined>(
	undefined,
);

export function PreferenceContextProvider({
	children,
}: {
	children: React.ReactNode;
}): JSX.Element {
	const location = useLocation();
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
	let dataSource: DataSource = DataSource.LOGS;
	if (location.pathname.includes('traces')) dataSource = DataSource.TRACES;

	const {
		preferences,
		loading,
		error,
		updateColumns,
		updateFormatting,
	} = usePreferenceSync({
		mode: savedViewId ? PreferenceMode.SAVED_VIEW : PreferenceMode.DIRECT,
		savedViewId: savedViewId || undefined,
		dataSource,
	});

	const value = useMemo<PreferenceContextValue>(
		() => ({
			preferences,
			loading,
			error,
			mode: savedViewId ? PreferenceMode.SAVED_VIEW : PreferenceMode.DIRECT,
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
