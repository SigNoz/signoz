import { ReactNode } from 'react';
import { KeyboardHotkeysProvider } from 'hooks/hotkeys/useKeyboardHotkeys';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import {
	QueryBuilderContext,
	QueryBuilderProvider,
} from 'providers/QueryBuilder';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

import { AppLayer } from './types';

export interface AppPageProvidersProps {
	children: ReactNode;
	layout: AppLayer;
	/** When set, replaces `QueryBuilderProvider` with a fixed context value. */
	queryBuilder?: Partial<QueryBuilderContextType>;
}

/**
 * The layers a routed page renders in, below `PrivateRoute` and inside the app
 * chrome. A new provider belongs here when only pages need it, or when it has to
 * sit inside `AppLayout`.
 *
 * One ordering constraint: `AppLayout` calls `useKeyboardHotkeys`, so the
 * hotkeys provider has to stay above the layout. The rest of the order is the
 * one `AppRoutes` has, kept as-is so a story and a route render the same tree.
 */
function AppPageProviders({
	children,
	layout,
	queryBuilder,
}: AppPageProvidersProps): JSX.Element {
	const hotkeys = (
		<KeyboardHotkeysProvider>
			<>
				{layout(<PreferenceContextProvider>{children}</PreferenceContextProvider>)}
			</>
		</KeyboardHotkeysProvider>
	);

	return (
		<ResourceProvider>
			{queryBuilder ? (
				<QueryBuilderContext.Provider
					value={queryBuilder as QueryBuilderContextType}
				>
					{hotkeys}
				</QueryBuilderContext.Provider>
			) : (
				<QueryBuilderProvider>{hotkeys}</QueryBuilderProvider>
			)}
		</ResourceProvider>
	);
}

AppPageProviders.defaultProps = {
	queryBuilder: undefined,
};

export default AppPageProviders;
