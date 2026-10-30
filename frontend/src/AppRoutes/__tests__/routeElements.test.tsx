import { lazy, Suspense, useState } from 'react';
import { Routes } from 'react-router';
import { act, render, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { navigate } from 'lib/router/navigation';
import { TestRouter } from 'tests/router';
import { resetTestRoute } from 'tests/router-utils';

import { routeElements } from '../routeElements';
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

function renderRoutes(): void {
	render(
		<TestRouter initialRoute={ROUTES.LOGS}>
			<Suspense fallback={<div data-testid="fallback" />}>
				<Routes>{routeElements(routes)}</Routes>
			</Suspense>
		</TestRouter>,
	);
}

describe('routeElements', () => {
	beforeEach(() => {
		mounts = 0;
	});

	afterEach(() => {
		resetTestRoute();
	});

	it('remounts the page when another route entry resolves to the same component', async () => {
		renderRoutes();
		await expect(screen.findByText('mount 1')).resolves.toBeInTheDocument();

		act(() => navigate(ROUTES.LOGS_PIPELINES));

		await expect(screen.findByText('mount 2')).resolves.toBeInTheDocument();
	});

	it('keeps the page mounted across the patterns of one route entry', async () => {
		renderRoutes();
		act(() => navigate(ROUTES.LOGS_PIPELINES));
		await expect(screen.findByText('mount 2')).resolves.toBeInTheDocument();

		act(() => navigate(ROUTES.LOGS_INDEX_FIELDS));

		expect(screen.getByTestId('page')).toHaveTextContent('mount 2');
	});
});
