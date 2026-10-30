import { lazy, Suspense, useState } from 'react';
import {
	createBrowserRouter,
	type DataRouter,
	Outlet,
	RouterProvider,
} from 'react-router';
import { act, render, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { resetTestRoute } from 'tests/router-utils';

import { createGatedRoutes, type EnabledRouteKeys } from '../routeTable';
import type { AppRoutes } from '../routes';

let mounts = 0;

function Page(): JSX.Element {
	const [mount] = useState(() => {
		mounts += 1;
		return mounts;
	});
	return <div data-testid="page">mount {mount}</div>;
}

// Two lazy wrappers of one module, like the logs explorer and pipelines routes.
const Explorer = lazy(async () => ({ default: Page }));
const Pipelines = lazy(async () => ({ default: Page }));

const routes: AppRoutes[] = [
	{ path: ROUTES.LOGS, component: Explorer, key: 'LOGS', isPrivate: true },
	{
		path: [ROUTES.LOGS_PIPELINES, ROUTES.LOGS_INDEX_FIELDS],
		component: Pipelines,
		key: 'LOGS_PIPELINES',
		isPrivate: true,
	},
];

const enabledRouteKeys: EnabledRouteKeys = new Set(['LOGS', 'LOGS_PIPELINES']);

function renderRoutes(): DataRouter {
	window.history.replaceState(null, '', ROUTES.LOGS);
	const router = createBrowserRouter([
		{
			element: (
				<Suspense fallback={<div data-testid="fallback" />}>
					<Outlet context={enabledRouteKeys} />
				</Suspense>
			),
			children: createGatedRoutes(routes),
		},
	]);
	render(<RouterProvider router={router} useTransitions={false} />);
	return router;
}

describe('createGatedRoutes', () => {
	beforeEach(() => {
		mounts = 0;
	});

	afterEach(() => {
		resetTestRoute();
	});

	it('remounts the page when another route entry resolves to the same component', async () => {
		const router = renderRoutes();
		await expect(screen.findByText('mount 1')).resolves.toBeInTheDocument();

		await act(() => router.navigate(ROUTES.LOGS_PIPELINES));

		await expect(screen.findByText('mount 2')).resolves.toBeInTheDocument();
	});

	it('keeps the page mounted across the patterns of one route entry', async () => {
		const router = renderRoutes();
		await act(() => router.navigate(ROUTES.LOGS_PIPELINES));
		await expect(screen.findByText('mount 2')).resolves.toBeInTheDocument();

		await act(() => router.navigate(ROUTES.LOGS_INDEX_FIELDS));

		expect(screen.getByTestId('page')).toHaveTextContent('mount 2');
	});
});
