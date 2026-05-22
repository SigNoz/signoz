import { ReactElement } from 'react';
import { BrandedPermission } from 'hooks/useAuthZ/types';
import { buildPermission } from 'hooks/useAuthZ/utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';
import { AUTHZ_CHECK_URL, authzMockResponse } from 'tests/authz-test-utils';

import { GuardAuthZ } from './GuardAuthZ';

describe('GuardAuthZ', () => {
	const TestChild = (): ReactElement => <div>Protected Content</div>;
	const LoadingFallback = (): ReactElement => <div>Loading...</div>;
	const NoPermissionFallback = (_response: {
		requiredPermissionName: BrandedPermission;
	}): ReactElement => <div>Access denied</div>;
	const NoPermissionFallbackWithSuggestions = (response: {
		requiredPermissionName: BrandedPermission;
	}): ReactElement => (
		<div>
			Access denied. Required permission: {response.requiredPermissionName}
		</div>
	);

	it('should render children when permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		render(
			<GuardAuthZ relation="read" object="role:*">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected Content')).toBeInTheDocument();
		});
	});

	it('should render fallbackOnLoading when loading', () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (_req, res, ctx) => {
				return res(
					ctx.delay('infinite'),
					ctx.status(200),
					ctx.json({ data: [], status: 'success' }),
				);
			}),
		);

		render(
			<GuardAuthZ
				relation="read"
				object="role:*"
				fallbackOnLoading={<LoadingFallback />}
			>
				<TestChild />
			</GuardAuthZ>,
		);

		expect(screen.getByText('Loading...')).toBeInTheDocument();
		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should render null when loading and no fallbackOnLoading provided', () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (_req, res, ctx) => {
				return res(
					ctx.delay('infinite'),
					ctx.status(200),
					ctx.json({ data: [], status: 'success' }),
				);
			}),
		);

		const { container } = render(
			<GuardAuthZ relation="read" object="role:*">
				<TestChild />
			</GuardAuthZ>,
		);

		expect(container.firstChild).toBeNull();
		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should render children when API error occurs and no fallbackOnError provided (fail open)', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
			}),
		);

		render(
			<GuardAuthZ relation="read" object="role:*">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected Content')).toBeInTheDocument();
		});
	});

	it('should render fallbackOnError when API error occurs and fallbackOnError is provided', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
			}),
		);

		render(
			<GuardAuthZ
				relation="read"
				object="role:*"
				fallbackOnError={<div>Custom error fallback</div>}
			>
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
		});

		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should render fallbackOnNoPermissions when permission is denied', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [false])));
			}),
		);

		render(
			<GuardAuthZ
				relation="update"
				object="role:123"
				fallbackOnNoPermissions={NoPermissionFallback}
			>
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Access denied')).toBeInTheDocument();
		});

		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should render null when permission is denied and no fallbackOnNoPermissions provided', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [false])));
			}),
		);

		const { container } = render(
			<GuardAuthZ relation="update" object="role:123">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(container.firstChild).toBeNull();
		});

		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should render null when permissions object is null', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(200), ctx.json({ data: [], status: 'success' }));
			}),
		);

		const { container } = render(
			<GuardAuthZ relation="read" object="role:*">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(container.firstChild).toBeNull();
		});

		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should pass requiredPermissionName to fallbackOnNoPermissions', async () => {
		const permission = buildPermission('update', 'role:123');

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [false])));
			}),
		);

		render(
			<GuardAuthZ
				relation="update"
				object="role:123"
				fallbackOnNoPermissions={NoPermissionFallbackWithSuggestions}
			>
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(
				screen.getByText(/Access denied. Required permission:/),
			).toBeInTheDocument();
		});

		expect(
			screen.getAllByText(
				new RegExp(permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			).length,
		).toBeGreaterThan(0);
		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should handle different relation and object combinations', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		const { rerender } = render(
			<GuardAuthZ relation="read" object="role:*">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected Content')).toBeInTheDocument();
		});

		rerender(
			<GuardAuthZ relation="delete" object="role:456">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected Content')).toBeInTheDocument();
		});
	});
});
