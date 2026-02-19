import { ReactElement } from 'react-markdown/lib/react-markdown';
import { ENVIRONMENT } from 'constants/env';
import { BrandedPermission, buildPermission } from 'hooks/useAuthZ/utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';

import { GuardAuthZ } from './GuardAuthZ';

const BASE_URL = ENVIRONMENT.baseURL || '';

describe('GuardAuthZ', () => {
	const TestChild = (): ReactElement => <div>Protected Content</div>;
	const LoadingFallback = (): ReactElement => <div>Loading...</div>;
	const ErrorFallback = (error: Error): ReactElement => (
		<div>Error occurred: {error.message}</div>
	);
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

		render(
			<GuardAuthZ relation="read" object="dashboard:*">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected Content')).toBeInTheDocument();
		});
	});

	it('should render fallbackOnLoading when loading', () => {
		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(200), ctx.json({}));
			}),
		);

		render(
			<GuardAuthZ
				relation="read"
				object="dashboard:*"
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
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(200), ctx.json({}));
			}),
		);

		const { container } = render(
			<GuardAuthZ relation="read" object="dashboard:*">
				<TestChild />
			</GuardAuthZ>,
		);

		expect(container.firstChild).toBeNull();
		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should render fallbackOnError when API error occurs', async () => {
		const errorMessage = 'Internal Server Error';

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: errorMessage }));
			}),
		);

		render(
			<GuardAuthZ
				relation="read"
				object="dashboard:*"
				fallbackOnError={ErrorFallback}
			>
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText(/Error occurred:/)).toBeInTheDocument();
		});

		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should pass error object to fallbackOnError function', async () => {
		const errorMessage = 'Network request failed';
		let receivedError: Error | null = null;

		const errorFallbackWithCapture = (error: Error): ReactElement => {
			receivedError = error;
			return <div>Captured error: {error.message}</div>;
		};

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: errorMessage }));
			}),
		);

		render(
			<GuardAuthZ
				relation="read"
				object="dashboard:*"
				fallbackOnError={errorFallbackWithCapture}
			>
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(receivedError).not.toBeNull();
		});

		expect(receivedError).toBeInstanceOf(Error);
		expect(screen.getByText(/Captured error:/)).toBeInTheDocument();
	});

	it('should render null when error occurs and no fallbackOnError provided', async () => {
		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
			}),
		);

		const { container } = render(
			<GuardAuthZ relation="read" object="dashboard:*">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(container.firstChild).toBeNull();
		});

		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should render fallbackOnNoPermissions when permission is denied', async () => {
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

		render(
			<GuardAuthZ
				relation="update"
				object="dashboard:123"
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

		const { container } = render(
			<GuardAuthZ relation="update" object="dashboard:123">
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
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (_req, res, ctx) => {
				return res(ctx.status(200), ctx.json(null));
			}),
		);

		const { container } = render(
			<GuardAuthZ relation="read" object="dashboard:*">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(container.firstChild).toBeNull();
		});

		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should pass requiredPermissionName to fallbackOnNoPermissions', async () => {
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

		render(
			<GuardAuthZ
				relation="update"
				object="dashboard:123"
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

		expect(screen.getByText(new RegExp(permission))).toBeInTheDocument();
		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
	});

	it('should handle different relation and object combinations', async () => {
		const permission1 = buildPermission('read', 'dashboard:*');
		const permission2 = buildPermission('delete', 'dashboard:456');

		server.use(
			rest.post(`${BASE_URL}/api/v1/permissions/check`, (req, res, ctx) => {
				const body = req.body as {
					permissions: Array<{ relation: string; object: string }>;
				};
				const perm = body.permissions[0];
				const permKey = `${perm.relation}/${perm.object}`;

				if (permKey === permission1) {
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

		const { rerender } = render(
			<GuardAuthZ relation="read" object="dashboard:*">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected Content')).toBeInTheDocument();
		});

		rerender(
			<GuardAuthZ relation="delete" object="dashboard:456">
				<TestChild />
			</GuardAuthZ>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected Content')).toBeInTheDocument();
		});
	});
});
