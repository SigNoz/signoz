import { ReactNode, useEffect, useMemo } from 'react';
import { Router } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { CmdKPalette } from 'components/cmdKPalette/cmdKPalette';
import AppHarness from '@/harness/AppHarness';
import history from 'lib/history';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { useAppContext } from 'providers/App/App';

import { createStoryAppContext } from '../mocks/createStoryAppContext';
import { interceptExternalNavigation } from '../navigation/interceptExternalNavigation';
import NavigationBlockedOverlay from '../navigation/NavigationBlockedOverlay';
import { ResolvedStoryConfig } from '../types';
import { createStorybookQueryClient } from './createStorybookQueryClient';
import { createStorybookStore } from './createStorybookStore';
import { useStoryRoute } from './useStoryRoute';

interface StorybookProvidersProps extends ResolvedStoryConfig {
	children: ReactNode;
}

/**
 * Reports the role `useAppContext()` yields to `<body data-signoz-context-role>`,
 * next to the `data-signoz-story-role` the runtime resolved. Both come from the
 * same access grant, so a disagreement means the story is reading a different
 * `AppContext` than the one the runtime filled.
 */
function StoryContextProbe(): null {
	const { user } = useAppContext();

	useEffect(() => {
		document.body.dataset.signozContextRole = user?.role ?? '';
	}, [user?.role]);

	return null;
}

/**
 * The Storybook adapter over `AppHarness`: the app's provider tree, with the
 * router on the contained history, nuqs on its testing adapter, and a fresh
 * store and query cache per story.
 */
function StorybookProviders({
	children,
	role,
	appContext,
	queryBuilder,
	route = '/',
	reduxState,
}: StorybookProvidersProps): JSX.Element {
	const searchParams = useStoryRoute(route);
	const queryClient = useMemo(createStorybookQueryClient, []);
	const store = useMemo(() => createStorybookStore(reduxState), [reduxState]);
	const appContextValue = useMemo(
		() => createStoryAppContext(role, appContext),
		[role, appContext],
	);

	useEffect(interceptExternalNavigation, []);

	return (
		<AppHarness
			appContext={appContextValue}
			store={store}
			queryClient={queryClient}
			queryBuilder={queryBuilder}
			router={(routed): ReactNode => (
				<Router history={history}>
					<CompatRouter>{routed}</CompatRouter>
				</Router>
			)}
			searchParams={(scoped): ReactNode => (
				<NuqsTestingAdapter searchParams={searchParams} hasMemory>
					{scoped}
				</NuqsTestingAdapter>
			)}
			overlays={
				<>
					<StoryContextProbe />
					{/* The AuthZ dev modal and its floating indicator, so a story can
					    override single permissions by hand. */}
					<CmdKPalette userRole={role} />
					<NavigationBlockedOverlay />
				</>
			}
		>
			{children}
		</AppHarness>
	);
}

export default StorybookProviders;
