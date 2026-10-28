import type { ReactNode } from 'react';
import { type DataRouter, RouterProvider } from 'react-router';

import { HostedTreeContext } from './HostedTreeContext';

interface HostRouterProps {
	router: DataRouter;
	children: ReactNode;
}

/**
 * A data router's routes are fixed when it is created, so the tree reaches the
 * route element through context instead, and a re-render with new children
 * shows them.
 */
export function HostRouter({ router, children }: HostRouterProps): JSX.Element {
	return (
		<HostedTreeContext.Provider value={children}>
			<RouterProvider router={router} useTransitions={false} />
		</HostedTreeContext.Provider>
	);
}
