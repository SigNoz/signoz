import useUrlQuery from 'hooks/useUrlQuery';
import {
	PreferenceContextValue,
	PreferenceMode,
} from 'providers/preferences/types';
import React, { createContext, useContext, useMemo } from 'react';
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
		dataSource: DataSource.LOGS,
	});

	const tracesSlice = usePreferenceSync({
		mode: savedViewId ? PreferenceMode.SAVED_VIEW : PreferenceMode.DIRECT,
		savedViewId: savedViewId || undefined,
		dataSource: DataSource.TRACES,
	});

	const value = useMemo<PreferenceContextValue>(
		() => ({
			logs: logsSlice,
			traces: tracesSlice,
		}),
		[logsSlice, tracesSlice],
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
