import { ReactElement } from 'react';
import {
	AuthtypesGettableTransactionDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import { BrandedPermission } from 'hooks/useAuthZ/types';
import { buildPermission } from 'hooks/useAuthZ/utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';

import { GuardAuthZ } from './GuardAuthZ';

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

	it('should render fallbackOnError when API error occurs', async () => {
		const errorMessage = 'Internal Server Error';

		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: errorMessage }));
			}),
		);

		render(
			<GuardAuthZ relation="read" object="role:*" fallbackOnError={ErrorFallback}>
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
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: errorMessage }));
			}),
		);

		render(
			<GuardAuthZ
				relation="read"
				object="role:*"
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
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
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
