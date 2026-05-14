import { ReactElement } from 'react';
import {
	AuthtypesGettableTransactionDTO,
	AuthtypesTransactionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';
import AuthZTooltip from './AuthZTooltip';

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

const TestButton = (): ReactElement => <button type="button">Action</button>;

describe('AuthZTooltip — single check', () => {
	it('renders child unchanged when permission is granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true])));
			}),
		);

		render(
			<AuthZTooltip
				relation="create"
				object="serviceaccount:*"
				permissionName="serviceaccount:create"
			>
				<TestButton />
			</AuthZTooltip>,
		);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Action' })).not.toBeDisabled();
		});
	});

	it('disables child when permission is denied', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(ctx.status(200), ctx.json(authzMockResponse(payload, [false])));
			}),
		);

		render(
			<AuthZTooltip
				relation="create"
				object="serviceaccount:*"
				permissionName="serviceaccount:create"
			>
				<TestButton />
			</AuthZTooltip>,
		);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Action' })).toBeDisabled();
		});
	});

	it('does not disable child while loading (no premature disabled flash)', () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (_req, res, ctx) =>
				res(
					ctx.delay('infinite'),
					ctx.status(200),
					ctx.json({ data: [], status: 'success' }),
				),
			),
		);

		render(
			<AuthZTooltip
				relation="create"
				object="serviceaccount:*"
				permissionName="serviceaccount:create"
			>
				<TestButton />
			</AuthZTooltip>,
		);

		expect(screen.getByRole('button', { name: 'Action' })).not.toBeDisabled();
	});
});

describe('AuthZTooltip — multi-check (checks array)', () => {
	it('renders child enabled when all checks are granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [true, true])),
				);
			}),
		);

		render(
			<AuthZTooltip
				checks={[
					{
						relation: 'attach',
						object: 'serviceaccount:sa-1',
						permissionName: 'serviceaccount:attach',
					},
					{ relation: 'attach', object: 'role:*', permissionName: 'role:attach' },
				]}
			>
				<TestButton />
			</AuthZTooltip>,
		);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Action' })).not.toBeDisabled();
		});
	});

	it('disables child when first check is denied, second granted', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [false, true])),
				);
			}),
		);

		render(
			<AuthZTooltip
				checks={[
					{
						relation: 'attach',
						object: 'serviceaccount:sa-1',
						permissionName: 'serviceaccount:attach',
					},
					{ relation: 'attach', object: 'role:*', permissionName: 'role:attach' },
				]}
			>
				<TestButton />
			</AuthZTooltip>,
		);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Action' })).toBeDisabled();
		});
	});

	it('disables child when both checks are denied and message lists all denied permissions', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
				const payload = await req.json();
				return res(
					ctx.status(200),
					ctx.json(authzMockResponse(payload, [false, false])),
				);
			}),
		);

		render(
			<AuthZTooltip
				checks={[
					{
						relation: 'attach',
						object: 'serviceaccount:sa-1',
						permissionName: 'serviceaccount:attach',
					},
					{ relation: 'attach', object: 'role:*', permissionName: 'role:attach' },
				]}
			>
				<TestButton />
			</AuthZTooltip>,
		);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Action' })).toBeDisabled();
		});

		// Tooltip wrapper span should contain the denied permission names as data attr
		const wrapper = screen.getByRole('button', { name: 'Action' }).parentElement;
		expect(wrapper?.getAttribute('data-denied-permissions')).toContain(
			'serviceaccount:attach',
		);
		expect(wrapper?.getAttribute('data-denied-permissions')).toContain(
			'role:attach',
		);
	});
});
