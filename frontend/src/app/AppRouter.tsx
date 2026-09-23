import { ReactNode } from 'react';
import { unstable_HistoryRouter as HistoryRouter } from 'react-router';
import history from 'lib/history';
import { getBasePath } from 'utils/basePath';

/**
 * The outermost layer. It is above `NuqsAdapter` on purpose:
 * `nuqs/adapters/react-router/v7` calls `useNavigate` and `useSearchParams`, so
 * it only works inside a router.
 *
 * Transitions are off on purpose: under one React keeps the previous screen up
 * instead of committing the Suspense fallback, so a route whose chunk is not
 * cached yet renders no loader at all. Rendering pending UI under it needs
 * `useNavigation()` and a data router. See docs/react-router-v7-upgrade.md.
 */
export function appRouter(children: ReactNode): ReactNode {
	return (
		<HistoryRouter
			basename={getBasePath()}
			history={history}
			useTransitions={false}
		>
			{children}
		</HistoryRouter>
	);
}
