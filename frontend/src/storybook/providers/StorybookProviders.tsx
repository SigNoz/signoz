import { ReactNode, useEffect, useMemo } from 'react';
import { Router } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import AppPageProviders from '@/app/AppPageProviders';
import AppProviders from '@/app/AppProviders';
import AppShell from '@/app/AppShell';
import type { AppLayer } from '@/app/types';
import { CmdKPalette } from 'components/cmdKPalette/cmdKPalette';
import AppLayout from 'container/AppLayout';
import history from 'lib/history';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { AppContext, useAppContext } from 'providers/App/App';

import { createStoryAppContext } from '../mocks/createStoryAppContext';
import { setStoryStore } from '../mocks/store.mock';
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

const storyRouter: AppLayer = (children) => (
	<Router history={history}>
		<CompatRouter>{children}</CompatRouter>
	</Router>
);

const appLayout: AppLayer = (children) => <AppLayout>{children}</AppLayout>;

const bareLayout: AppLayer = (children) => (
	<TooltipProvider>{children}</TooltipProvider>
);

function StorybookProviders({
	children,
	role,
	appContext,
	queryBuilder,
	route = '/',
	layout = 'none',
	reduxState,
}: StorybookProvidersProps): JSX.Element {
	const searchParams = useStoryRoute(route);
	const queryClient = useMemo(createStorybookQueryClient, []);
	const store = useMemo(() => {
		const created = createStorybookStore(reduxState);
		// The modules that read the redux singleton have to answer from this story's
		// store, not the one the app module created at import time.
		setStoryStore(created);
		return created;
	}, [reduxState]);
	const appContextValue = useMemo(
		() => createStoryAppContext(role, appContext),
		[role, appContext],
	);

	useEffect(interceptExternalNavigation, []);

	return (
		<AppProviders
			store={store}
			queryClient={queryClient}
			appContext={(scoped): ReactNode => (
				<AppContext.Provider value={appContextValue}>{scoped}</AppContext.Provider>
			)}
			searchParams={(scoped): ReactNode => (
				<NuqsTestingAdapter searchParams={searchParams} hasMemory>
					{scoped}
				</NuqsTestingAdapter>
			)}
		>
			<AppShell
				router={storyRouter}
				overlays={
					<>
						<StoryContextProbe />
						<CmdKPalette userRole={role} />
						<NavigationBlockedOverlay />
					</>
				}
			>
				<AppPageProviders
					layout={layout === 'app' ? appLayout : bareLayout}
					queryBuilder={queryBuilder}
				>
					{children}
				</AppPageProviders>
			</AppShell>
		</AppProviders>
	);
}

export default StorybookProviders;
