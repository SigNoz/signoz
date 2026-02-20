import { ReactElement } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { ENVIRONMENT } from 'constants/env';
import { buildPermission } from 'hooks/useAuthZ/utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';

import { createGuardedRoute } from './createGuardedRoute';

const BASE_URL = ENVIRONMENT.baseURL || '';

describe('createGuardedRoute', () => {
	const TestComponent = ({ testProp }: { testProp: string }): ReactElement => (
		<div>Test Component: {testProp}</div>
	);

	it('should render component when permission is granted', async () => {
		const permission = buildPermission('read', 'dashboard:*');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(
					ctx.status(200),
					ctx.json({
						[permission]: true,
					}),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'dashboard:*',
		);

		const mockMatch = {
			params: {},
			isExact: true,
			path: '/dashboard',
			url: '/dashboard',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});

	it('should substitute route parameters in object string', async () => {
		const permission = buildPermission('read', 'dashboard:123');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(
					ctx.status(200),
					ctx.json({
						[permission]: true,
					}),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'dashboard:{id}',
		);

		const mockMatch = {
			params: { id: '123' },
			isExact: true,
			path: '/dashboard/:id',
			url: '/dashboard/123',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});

	it('should handle multiple route parameters', async () => {
		const permission = buildPermission('update', 'dashboard:123:456');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(
					ctx.status(200),
					ctx.json({
						[permission]: true,
					}),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'update',
			'dashboard:{id}:{version}',
		);

		const mockMatch = {
			params: { id: '123', version: '456' },
			isExact: true,
			path: '/dashboard/:id/:version',
			url: '/dashboard/123/456',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});

	it('should keep placeholder when route parameter is missing', async () => {
		const permission = buildPermission('read', 'dashboard:{id}');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(
					ctx.status(200),
					ctx.json({
						[permission]: true,
					}),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'dashboard:{id}',
		);

		const mockMatch = {
			params: {},
			isExact: true,
			path: '/dashboard',
			url: '/dashboard',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});

	it('should render loading fallback when loading', () => {
		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(200), ctx.json({}));
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'dashboard:*',
		);

		const mockMatch = {
			params: {},
			isExact: true,
			path: '/dashboard',
			url: '/dashboard',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		expect(screen.getByText('SigNoz')).toBeInTheDocument();
		expect(
			screen.queryByText('Test Component: test-value'),
		).not.toBeInTheDocument();
	});

	it('should render error fallback when API error occurs', async () => {
		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'dashboard:*',
		);

		const mockMatch = {
			params: {},
			isExact: true,
			path: '/dashboard',
			url: '/dashboard',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
		});

		expect(
			screen.queryByText('Test Component: test-value'),
		).not.toBeInTheDocument();
	});

	it('should render no permissions fallback when permission is denied', async () => {
		const permission = buildPermission('update', 'dashboard:123');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(
					ctx.status(200),
					ctx.json({
						[permission]: false,
					}),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'update',
			'dashboard:{id}',
		);

		const mockMatch = {
			params: { id: '123' },
			isExact: true,
			path: '/dashboard/:id',
			url: '/dashboard/123',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			const heading = document.querySelector('h3');
			expect(heading).toBeInTheDocument();
			expect(heading?.textContent).toMatch(/permission to view/i);
		});

		expect(screen.getByText(permission, { exact: false })).toBeInTheDocument();
		expect(
			screen.queryByText('Test Component: test-value'),
		).not.toBeInTheDocument();
	});

	it('should pass all props to wrapped component', async () => {
		const permission = buildPermission('read', 'dashboard:*');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(
					ctx.status(200),
					ctx.json({
						[permission]: true,
					}),
				);
			}),
		);

		const ComponentWithMultipleProps = ({
			prop1,
			prop2,
			prop3,
		}: {
			prop1: string;
			prop2: number;
			prop3: boolean;
		}): ReactElement => (
			<div>
				{prop1} - {prop2} - {prop3.toString()}
			</div>
		);

		const GuardedComponent = createGuardedRoute(
			ComponentWithMultipleProps,
			'read',
			'dashboard:*',
		);

		const mockMatch = {
			params: {},
			isExact: true,
			path: '/dashboard',
			url: '/dashboard',
		};

		const props = {
			prop1: 'value1',
			prop2: 42,
			prop3: true,
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('value1 - 42 - true')).toBeInTheDocument();
		});
	});

	it('should memoize resolved object based on route params', async () => {
		const permission1 = buildPermission('read', 'dashboard:123');
		const permission2 = buildPermission('read', 'dashboard:456');

		let requestCount = 0;
		const requestedPermissions: string[] = [];

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (req, res, ctx) => {
				requestCount++;
				const body = req.body as {
					permissions: Array<{ relation: string; object: string }>;
				};
				const perm = body.permissions[0];
				requestedPermissions.push(`${perm.relation}/${perm.object}`);

				if (perm.object === 'dashboard:123') {
					return res(
						ctx.status(200),
						ctx.json({
							[permission1]: true,
						}),
					);
				}

				return res(
					ctx.status(200),
					ctx.json({
						[permission2]: true,
					}),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'dashboard:{id}',
		);

		const mockMatch1 = {
			params: { id: '123' },
			isExact: true,
			path: '/dashboard/:id',
			url: '/dashboard/123',
		};

		const props1 = {
			testProp: 'test-value-1',
			match: mockMatch1,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		const { unmount } = render(<GuardedComponent {...props1} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value-1')).toBeInTheDocument();
		});

		expect(requestCount).toBe(1);
		expect(requestedPermissions).toContain('read/dashboard:123');

		unmount();

		const mockMatch2 = {
			params: { id: '456' },
			isExact: true,
			path: '/dashboard/:id',
			url: '/dashboard/456',
		};

		const props2 = {
			testProp: 'test-value-2',
			match: mockMatch2,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props2} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value-2')).toBeInTheDocument();
		});

		expect(requestCount).toBe(2);
		expect(requestedPermissions).toContain('read/dashboard:456');
	});

	it('should handle different relation types', async () => {
		const permission = buildPermission('delete', 'dashboard:789');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(
					ctx.status(200),
					ctx.json({
						[permission]: true,
					}),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'delete',
			'dashboard:{id}',
		);

		const mockMatch = {
			params: { id: '789' },
			isExact: true,
			path: '/dashboard/:id',
			url: '/dashboard/789',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: ({} as unknown) as RouteComponentProps['location'],
			history: ({} as unknown) as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});
});
