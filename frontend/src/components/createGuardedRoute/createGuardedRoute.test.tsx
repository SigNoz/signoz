import { ReactElement } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import {
	AuthtypesGettableTransactionDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';

import { createGuardedRoute } from './createGuardedRoute';

const BASE_URL = ENVIRONMENT.baseURL || '';
const AUTHZ_CHECK_URL = `${BASE_URL}/api/v1/authz/check`;

function authzMockResponse(
	payload: AuthtypesTransactionDTO[],
	authorizedByIndex: boolean[],
): { data: AuthtypesGettableTransactionDTO[]; status: string } {
	return {
		data: payload.map((txn, i) => ({
			relation: txn.relation,
			object: txn.object,
			authorized: authorizedByIndex[i] ?? false,
		})),
		status: 'success',
	};
}

describe('createGuardedRoute', () => {
	const TestComponent = ({ testProp }: { testProp: string }): ReactElement => (
		<div>Test Component: {testProp}</div>
	);

	it('should render component when permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		const GuardedComponent = createGuardedRoute(TestComponent, 'read', 'role:*');

		const mockMatch = {
			params: {},
			isExact: true,
			path: '/dashboard',
			url: '/dashboard',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});

	it('should substitute route parameters in object string', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'role:{id}',
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
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});

	it('should handle multiple route parameters', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = (await req.json()) as AuthtypesTransactionDTO[];
				const txn = payload[0];
				const responseData: AuthtypesGettableTransactionDTO[] = [
					{
						relation: txn.relation,
						object: {
							resource: {
								kind: txn.object.resource.kind,
								type: txn.object.resource.type,
							},
							selector: '123:456',
						},
						authorized: true,
					},
				];
				return res(
					ctx.status(200),
					ctx.json({ data: responseData, status: 'success' }),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'update',
			'role:{id}:{version}',
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
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});

	it('should keep placeholder when route parameter is missing', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'role:{id}',
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
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});

	it('should render loading fallback when loading', () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (_req, res, ctx) => {
				return res(
					ctx.delay('infinite'),
					ctx.status(200),
					ctx.json({ data: [], status: 'success' }),
				);
			}),
		);

		const GuardedComponent = createGuardedRoute(TestComponent, 'read', 'role:*');

		const mockMatch = {
			params: {},
			isExact: true,
			path: '/dashboard',
			url: '/dashboard',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		expect(screen.getByText('SigNoz')).toBeInTheDocument();
		expect(
			screen.queryByText('Test Component: test-value'),
		).not.toBeInTheDocument();
	});

	it('should render error fallback when API error occurs', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
			}),
		);

		const GuardedComponent = createGuardedRoute(TestComponent, 'read', 'role:*');

		const mockMatch = {
			params: {},
			isExact: true,
			path: '/dashboard',
			url: '/dashboard',
		};

		const props = {
			testProp: 'test-value',
			match: mockMatch,
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
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
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [false])));
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'update',
			'role:{id}',
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
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			const heading = document.querySelector('h3');
			expect(heading).toBeInTheDocument();
			expect(heading?.textContent).toMatch(/permission to view/i);
		});

		expect(screen.getByText('update')).toBeInTheDocument();
		expect(screen.getByText('role:123')).toBeInTheDocument();
		expect(
			screen.queryByText('Test Component: test-value'),
		).not.toBeInTheDocument();
	});

	it('should pass all props to wrapped component', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
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
			'role:*',
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
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('value1 - 42 - true')).toBeInTheDocument();
		});
	});

	it('should memoize resolved object based on route params', async () => {
		let requestCount = 0;
		const requestedObjects: string[] = [];

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				requestCount++;
				const payload = (await req.json()) as AuthtypesTransactionDTO[];
				const obj = payload[0]?.object;
				const kind = obj?.resource?.kind;
				const selector = obj?.selector ?? '*';
				const objectStr =
					obj?.resource?.type === 'metaresources' ? kind : `${kind}:${selector}`;
				requestedObjects.push(objectStr ?? '');

				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'read',
			'role:{id}',
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
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		const { unmount } = render(<GuardedComponent {...props1} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value-1')).toBeInTheDocument();
		});

		expect(requestCount).toBe(1);
		expect(requestedObjects).toContain('role:123');

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
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props2} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value-2')).toBeInTheDocument();
		});

		expect(requestCount).toBe(2);
		expect(requestedObjects).toContain('role:456');
	});

	it('should handle different relation types', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		const GuardedComponent = createGuardedRoute(
			TestComponent,
			'delete',
			'role:{id}',
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
			location: {} as unknown as RouteComponentProps['location'],
			history: {} as unknown as RouteComponentProps['history'],
		};

		render(<GuardedComponent {...props} />);

		await waitFor(() => {
			expect(screen.getByText('Test Component: test-value')).toBeInTheDocument();
		});
	});
});
