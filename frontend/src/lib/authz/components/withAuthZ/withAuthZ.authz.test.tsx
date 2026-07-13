import React from 'react';
import { render, screen, waitFor, act } from 'tests/test-utils';
import { useQueryClient } from 'react-query';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
	setupAuthzAllow,
	setupAuthzDeny,
	setupAuthzGrantByPrefix,
} from 'lib/authz/utils/authz-test-utils';
import type { AuthZObject } from 'lib/authz/hooks/useAuthZ/types';
import {
	buildObjectString,
	buildPermission,
} from 'lib/authz/hooks/useAuthZ/utils';

import { withAuthZ, RouterContext } from './withAuthZ';
import { withAuthZContent } from './withAuthZContent';
import { withAuthZPage } from './withAuthZPage';

const mockUseParams = jest.fn();
const mockUseLocation = jest.fn();

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: (): Record<string, string> => mockUseParams(),
	useLocation: (): { pathname: string; search: string } => mockUseLocation(),
}));

const readPerm = buildPermission('read', 'role:*' as AuthZObject<'read'>);

function Base(): JSX.Element {
	return <div>Base component</div>;
}

beforeEach(() => {
	mockUseParams.mockReturnValue({});
	mockUseLocation.mockReturnValue({ pathname: '/', search: '' });
});

describe('withAuthZ', () => {
	it('renders the wrapped component when allowed', async () => {
		server.use(setupAuthzAllow(readPerm));
		const Guarded = withAuthZ(Base, { checks: [readPerm] });

		render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByText('Base component')).toBeInTheDocument();
		});
	});

	it('renders nothing when denied without a fallback', async () => {
		server.use(setupAuthzDeny(readPerm));
		const Guarded = withAuthZ(Base, { checks: [readPerm] });

		render(<Guarded />);

		await waitFor(() => {
			expect(screen.queryByText('Base component')).not.toBeInTheDocument();
		});
	});

	it('renders the provided fallback when denied', async () => {
		server.use(setupAuthzDeny(readPerm));
		const Guarded = withAuthZ(Base, {
			checks: [readPerm],
			fallback: <div>No access</div>,
		});

		render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByText('No access')).toBeInTheDocument();
		});
	});

	it('resolves checks from props via the selector form', async () => {
		type Props = { roleId: string };
		const RoleView = ({ roleId }: Props): JSX.Element => <div>role {roleId}</div>;
		const deniedPerm = buildPermission(
			'read',
			buildObjectString<'read'>('role', 'r-1'),
		);
		server.use(setupAuthzDeny(deniedPerm));

		const Guarded = withAuthZ<Props>(RoleView, {
			checks: ({ roleId }) => [
				buildPermission('read', buildObjectString<'read'>('role', roleId)),
			],
			fallback: <div>denied selector</div>,
		});

		render(<Guarded roleId="r-1" />);

		await waitFor(() => {
			expect(screen.getByText('denied selector')).toBeInTheDocument();
		});
		expect(screen.queryByText('role r-1')).not.toBeInTheDocument();
	});

	it('sets a descriptive displayName', () => {
		const Guarded = withAuthZ(Base, { checks: [readPerm] });
		expect(Guarded.displayName).toBe('withAuthZ(Base)');
	});
});

describe('withAuthZPage', () => {
	it('renders the full-page denied screen when denied', async () => {
		server.use(setupAuthzDeny(readPerm));
		const Guarded = withAuthZPage(Base, { checks: [readPerm] });

		render(<Guarded />);

		await waitFor(() => {
			expect(
				screen.getByText('Uh-oh! You are not authorized'),
			).toBeInTheDocument();
		});
	});
});

describe('withAuthZContent', () => {
	it('renders the denied callout when denied', async () => {
		server.use(setupAuthzDeny(readPerm));
		const Guarded = withAuthZContent(Base, { checks: [readPerm] });

		render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByText('read:role:*')).toBeInTheDocument();
		});
		expect(screen.queryByText('Base component')).not.toBeInTheDocument();
	});
});

describe('withAuthZ router context', () => {
	it('extracts checks from route params via router.params', async () => {
		mockUseParams.mockReturnValue({ roleId: 'r-123' });

		const rolePerm = buildPermission(
			'read',
			buildObjectString<'read'>('role', 'r-123'),
		);
		server.use(setupAuthzAllow(rolePerm));

		const RoleView = (): JSX.Element => <div>role view</div>;
		const Guarded = withAuthZ(RoleView, {
			checks: (_props, router: RouterContext) => [
				buildPermission(
					'read',
					buildObjectString<'read'>('role', router.params.roleId ?? ''),
				),
			],
		});

		render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByText('role view')).toBeInTheDocument();
		});
	});

	it('extracts checks from query params via router.searchParams', async () => {
		mockUseLocation.mockReturnValue({
			pathname: '/roles',
			search: '?roleId=r-456',
		});

		const rolePerm = buildPermission(
			'read',
			buildObjectString<'read'>('role', 'r-456'),
		);
		server.use(setupAuthzAllow(rolePerm));

		const RoleListView = (): JSX.Element => <div>role list view</div>;
		const Guarded = withAuthZ(RoleListView, {
			checks: (_props, router: RouterContext) => [
				buildPermission(
					'read',
					buildObjectString<'read'>('role', router.searchParams.get('roleId') ?? ''),
				),
			],
		});

		render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByText('role list view')).toBeInTheDocument();
		});
	});

	it('extracts checks from pathname via router.matchPath', async () => {
		mockUseLocation.mockReturnValue({
			pathname: '/settings/roles/r-789/edit',
			search: '',
		});

		const rolePerm = buildPermission(
			'update',
			buildObjectString<'update'>('role', 'r-789'),
		);
		server.use(setupAuthzAllow(rolePerm));

		const EditRoleView = (): JSX.Element => <div>edit role</div>;
		const Guarded = withAuthZ(EditRoleView, {
			checks: (_props, router: RouterContext) => {
				const match = router.matchPath<{ roleId: string }>(
					'/settings/roles/:roleId/edit',
				);
				return match
					? [
							buildPermission(
								'update',
								buildObjectString<'update'>('role', match.roleId),
							),
						]
					: [];
			},
		});

		render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByText('edit role')).toBeInTheDocument();
		});
	});

	it('denies when router-derived permission is not allowed', async () => {
		mockUseParams.mockReturnValue({ roleId: 'r-denied' });

		const deniedPerm = buildPermission(
			'read',
			buildObjectString<'read'>('role', 'r-denied'),
		);
		server.use(setupAuthzDeny(deniedPerm));

		const RoleView = (): JSX.Element => <div>role view</div>;
		const Guarded = withAuthZ(RoleView, {
			checks: (_props, router: RouterContext) => [
				buildPermission(
					'read',
					buildObjectString<'read'>('role', router.params.roleId ?? ''),
				),
			],
			fallback: <div>access denied</div>,
		});

		render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByText('access denied')).toBeInTheDocument();
		});
		expect(screen.queryByText('role view')).not.toBeInTheDocument();
	});
});

describe('withAuthZ router context stability', () => {
	let renderCount = 0;

	function RenderCounter(): JSX.Element {
		renderCount += 1;
		return <div data-testid="render-count">{renderCount}</div>;
	}

	beforeEach(() => {
		renderCount = 0;
		server.use(setupAuthzGrantByPrefix('read||__||role'));
	});

	it('does not re-render when useParams returns new object with same values', async () => {
		mockUseParams.mockReturnValue({ roleId: 'r-1' });
		mockUseLocation.mockReturnValue({ pathname: '/', search: '' });

		const Guarded = withAuthZ(RenderCounter, {
			checks: (_props, router: RouterContext) => [
				buildPermission(
					'read',
					buildObjectString<'read'>('role', router.params.roleId ?? '*'),
				),
			],
		});

		const { rerender } = render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByTestId('render-count')).toBeInTheDocument();
		});

		const initialCount = renderCount;

		// Return NEW object with SAME values — should not cause re-render
		mockUseParams.mockReturnValue({ roleId: 'r-1' });
		rerender(<Guarded />);

		// Allow any pending effects to flush
		await waitFor(() => {
			expect(renderCount).toBe(initialCount);
		});
	});

	it('does not re-render when useLocation returns new object with same pathname', async () => {
		mockUseParams.mockReturnValue({});
		mockUseLocation.mockReturnValue({ pathname: '/roles', search: '' });

		const Guarded = withAuthZ(RenderCounter, {
			checks: (_props, router: RouterContext) => {
				const match = router.matchPath<{ id: string }>('/roles/:id');
				return match
					? [buildPermission('read', buildObjectString<'read'>('role', match.id))]
					: [readPerm];
			},
		});

		const { rerender } = render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByTestId('render-count')).toBeInTheDocument();
		});

		const initialCount = renderCount;

		// Return NEW object with SAME pathname — should not cause re-render
		mockUseLocation.mockReturnValue({ pathname: '/roles', search: '' });
		rerender(<Guarded />);

		await waitFor(() => {
			expect(renderCount).toBe(initialCount);
		});
	});

	it('does not re-render when useLocation returns new object with same search params', async () => {
		mockUseParams.mockReturnValue({});
		mockUseLocation.mockReturnValue({ pathname: '/', search: '?tab=keys' });

		const Guarded = withAuthZ(RenderCounter, {
			checks: (_props, router: RouterContext) => {
				// Access searchParams to ensure it's part of the dependency chain
				void router.searchParams.get('tab');
				return [readPerm];
			},
		});

		const { rerender } = render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByTestId('render-count')).toBeInTheDocument();
		});

		const initialCount = renderCount;

		// Return NEW object with SAME search — should not cause re-render
		mockUseLocation.mockReturnValue({ pathname: '/', search: '?tab=keys' });
		rerender(<Guarded />);

		await waitFor(() => {
			expect(renderCount).toBe(initialCount);
		});
	});

	it('re-renders when params values actually change', async () => {
		mockUseParams.mockReturnValue({ roleId: 'r-1' });
		mockUseLocation.mockReturnValue({ pathname: '/', search: '' });

		const Guarded = withAuthZ(RenderCounter, {
			checks: (_props, router: RouterContext) => [
				buildPermission(
					'read',
					buildObjectString<'read'>('role', router.params.roleId ?? '*'),
				),
			],
		});

		const { unmount } = render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByTestId('render-count')).toBeInTheDocument();
		});

		const initialCount = renderCount;
		unmount();

		// Return DIFFERENT values — re-mount with new mock values
		mockUseParams.mockReturnValue({ roleId: 'r-2' });
		render(<Guarded />);

		await waitFor(() => {
			expect(renderCount).toBeGreaterThan(initialCount);
		});
	});

	it('re-renders when pathname actually changes', async () => {
		mockUseParams.mockReturnValue({});
		mockUseLocation.mockReturnValue({ pathname: '/roles', search: '' });

		const Guarded = withAuthZ(RenderCounter, {
			checks: [readPerm],
		});

		const { unmount } = render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByTestId('render-count')).toBeInTheDocument();
		});

		const initialCount = renderCount;
		unmount();

		// DIFFERENT pathname — re-mount with new mock values
		mockUseLocation.mockReturnValue({ pathname: '/users', search: '' });
		render(<Guarded />);

		await waitFor(() => {
			expect(renderCount).toBeGreaterThan(initialCount);
		});
	});

	it('re-renders when search params actually change', async () => {
		mockUseParams.mockReturnValue({});
		mockUseLocation.mockReturnValue({ pathname: '/', search: '?tab=keys' });

		const Guarded = withAuthZ(RenderCounter, {
			checks: [readPerm],
		});

		const { unmount } = render(<Guarded />);

		await waitFor(() => {
			expect(screen.getByTestId('render-count')).toBeInTheDocument();
		});

		const initialCount = renderCount;
		unmount();

		// DIFFERENT search — re-mount with new mock values
		mockUseLocation.mockReturnValue({ pathname: '/', search: '?tab=details' });
		render(<Guarded />);

		await waitFor(() => {
			expect(renderCount).toBeGreaterThan(initialCount);
		});
	});
});

describe('withAuthZContent cache invalidation', () => {
	const testPerm = buildPermission(
		'read',
		'role:test-invalidation' as AuthZObject<'read'>,
	);
	// Callout displays permission as "relation:object" format
	const displayedPerm = 'read:role:test-invalidation';

	function ContentComponent(): JSX.Element {
		return <div data-testid="protected-content">Protected Content</div>;
	}

	function InvalidationTrigger({
		permission,
		onReady,
	}: {
		permission: string;
		onReady: (invalidate: () => Promise<void>) => void;
	}): null {
		const queryClient = useQueryClient();

		React.useEffect(() => {
			onReady(async () => {
				// Reset query to initial state and trigger refetch (matches devtools behavior)
				await queryClient.resetQueries(['authz', permission]);
			});
		}, [queryClient, permission, onReady]);

		return null;
	}

	it('re-renders from allowed to denied when cache is invalidated', async () => {
		let shouldGrant = true;
		let invalidateFn: (() => Promise<void>) | null = null;

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [shouldGrant])),
				);
			}),
		);

		const Guarded = withAuthZContent(ContentComponent, { checks: [testPerm] });

		render(
			<>
				<Guarded />
				<InvalidationTrigger
					permission={testPerm}
					onReady={(fn): void => {
						invalidateFn = fn;
					}}
				/>
			</>,
		);

		// Initially allowed - should show content
		await waitFor(() => {
			expect(screen.getByTestId('protected-content')).toBeInTheDocument();
		});

		// Change server response to deny
		shouldGrant = false;

		// Invalidate cache
		await act(async () => {
			await invalidateFn?.();
		});

		// Should now show denied callout
		await waitFor(() => {
			expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
		});

		// Callout should show the denied permission
		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText(displayedPerm)).toBeInTheDocument();
	});

	it('re-renders from denied to allowed when cache is invalidated', async () => {
		let shouldGrant = false;
		let invalidateFn: (() => Promise<void>) | null = null;

		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [shouldGrant])),
				);
			}),
		);

		const Guarded = withAuthZContent(ContentComponent, { checks: [testPerm] });

		render(
			<>
				<Guarded />
				<InvalidationTrigger
					permission={testPerm}
					onReady={(fn): void => {
						invalidateFn = fn;
					}}
				/>
			</>,
		);

		// Initially denied - should show callout
		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});
		expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

		// Change server response to allow
		shouldGrant = true;

		// Invalidate cache
		await act(async () => {
			await invalidateFn?.();
		});

		// Should now show protected content
		await waitFor(() => {
			expect(screen.getByTestId('protected-content')).toBeInTheDocument();
		});

		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
