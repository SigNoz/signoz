import { useState } from 'react';
import type { AuthtypesTransactionDTO } from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	AUTHZ_CHECK_URL,
	authzMockResponse,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import type { AuthZObject } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';

import { AuthZGuard } from './AuthZGuard';
import { AuthZGuardContent } from './AuthZGuardContent';
import { AuthZGuardPage } from './AuthZGuardPage';

const readPerm = buildPermission('read', 'role:*' as AuthZObject<'read'>);

const Protected = (): JSX.Element => <div>Protected content</div>;

describe('AuthZGuard', () => {
	it('renders children when allowed', async () => {
		server.use(setupAuthzAllow(readPerm));

		render(
			<AuthZGuard checks={[readPerm]}>
				<Protected />
			</AuthZGuard>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected content')).toBeInTheDocument();
		});
	});

	it('renders the fallback when denied', async () => {
		server.use(setupAuthzDeny(readPerm));

		render(
			<AuthZGuard checks={[readPerm]} fallback={<div>No access</div>}>
				<Protected />
			</AuthZGuard>,
		);

		await waitFor(() => {
			expect(screen.getByText('No access')).toBeInTheDocument();
		});
		expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
	});

	it('passes denied permissions to a function fallback', async () => {
		server.use(setupAuthzDeny(readPerm));

		render(
			<AuthZGuard
				checks={[readPerm]}
				fallback={({ deniedPermissions }): JSX.Element => (
					<div>denied: {deniedPermissions.length}</div>
				)}
			>
				<Protected />
			</AuthZGuard>,
		);

		await waitFor(() => {
			expect(screen.getByText('denied: 1')).toBeInTheDocument();
		});
	});

	it('renders nothing for a denied check with no fallback', async () => {
		server.use(setupAuthzDeny(readPerm));

		const { container } = render(
			<AuthZGuard checks={[readPerm]}>
				<Protected />
			</AuthZGuard>,
		);

		await waitFor(() => {
			expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
		});
		expect(container).toBeEmptyDOMElement();
	});

	it('renders the loading fallback while checking', () => {
		server.use(setupAuthzAllow(readPerm));

		render(
			<AuthZGuard checks={[readPerm]} fallbackOnLoading={<div>Loading…</div>}>
				<Protected />
			</AuthZGuard>,
		);

		expect(screen.getByText('Loading…')).toBeInTheDocument();
	});

	it('keeps content shown while checking mounted once allowed', async () => {
		let answerCheck = (): void => {};
		const checkAnswered = new Promise<void>((resolve) => {
			answerCheck = resolve;
		});
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = (await req.json()) as AuthtypesTransactionDTO[];
				await checkAnswered;
				return res(
					ctx.json(
						authzMockResponse(
							payload,
							payload.map(() => true),
						),
					),
				);
			}),
		);
		function Draft(): JSX.Element {
			const [value, setValue] = useState('');
			return (
				<input
					data-testid="draft"
					value={value}
					onChange={(event): void => setValue(event.target.value)}
				/>
			);
		}
		function CheckDone(): JSX.Element | null {
			const { isLoading } = useAuthZ([readPerm]);
			return isLoading ? null : <span data-testid="check-done" />;
		}
		// A fragment, as a list's content often is.
		const content = (
			<>
				<Draft />
			</>
		);
		render(
			<>
				<CheckDone />
				<AuthZGuard checks={[readPerm]} fallbackOnLoading={content}>
					{content}
				</AuthZGuard>
			</>,
		);

		await userEvent.setup().type(screen.getByTestId('draft'), 'kept');
		answerCheck();
		await screen.findByTestId('check-done');

		expect(screen.getByTestId('draft')).toHaveValue('kept');
	});

	it('fails open on error by default (renders children)', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ error: 'boom' })),
			),
		);

		render(
			<AuthZGuard checks={[readPerm]} fallback={<div>No access</div>}>
				<Protected />
			</AuthZGuard>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected content')).toBeInTheDocument();
		});
	});

	it('renders the fallback on error when failOpenOnError is false', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ error: 'boom' })),
			),
		);

		render(
			<AuthZGuard
				checks={[readPerm]}
				onFailRenderContent={false}
				fallback={<div>No access</div>}
			>
				<Protected />
			</AuthZGuard>,
		);

		await waitFor(() => {
			expect(screen.getByText('No access')).toBeInTheDocument();
		});
		expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
	});
});

describe('AuthZGuardPage', () => {
	it('renders the full-page denied screen when denied', async () => {
		server.use(setupAuthzDeny(readPerm));

		render(
			<AuthZGuardPage checks={[readPerm]}>
				<Protected />
			</AuthZGuardPage>,
		);

		await waitFor(() => {
			expect(
				screen.getByText('Uh-oh! You are not authorized'),
			).toBeInTheDocument();
		});
		expect(screen.getByText('read:role:*')).toBeInTheDocument();
	});

	it('renders the app loader while checking', () => {
		server.use(setupAuthzDeny(readPerm));

		render(
			<AuthZGuardPage checks={[readPerm]}>
				<Protected />
			</AuthZGuardPage>,
		);

		expect(
			screen.getByText(
				'OpenTelemetry-Native Logs, Metrics and Traces in a single pane',
			),
		).toBeInTheDocument();
	});
});

describe('AuthZGuardContent', () => {
	it('renders the denied callout when denied', async () => {
		server.use(setupAuthzDeny(readPerm));

		render(
			<AuthZGuardContent checks={[readPerm]}>
				<Protected />
			</AuthZGuardContent>,
		);

		await waitFor(() => {
			expect(screen.getByText('read:role:*')).toBeInTheDocument();
		});
		expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
	});

	it('renders children when allowed', async () => {
		server.use(setupAuthzAllow(readPerm));

		render(
			<AuthZGuardContent checks={[readPerm]}>
				<Protected />
			</AuthZGuardContent>,
		);

		await waitFor(() => {
			expect(screen.getByText('Protected content')).toBeInTheDocument();
		});
	});
});
