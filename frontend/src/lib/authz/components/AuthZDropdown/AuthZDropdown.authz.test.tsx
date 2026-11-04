import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import type { AuthZObject } from 'lib/authz/hooks/useAuthZ/types';
import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';

import AuthZDropdown from './AuthZDropdown';
import type { AuthZDropdownItemType } from './types';

const createPerm = buildPermission(
	'create',
	'serviceaccount:*' as AuthZObject<'create'>,
);

const items: AuthZDropdownItemType[] = [
	{ type: 'item', value: 'open', label: 'Open', testId: 'row-open' },
	{
		type: 'item',
		value: 'create',
		label: 'Create',
		testId: 'row-create',
		checks: [createPerm],
	},
];

function renderDropdown(rows = items): void {
	render(
		<AuthZDropdown
			items={rows}
			nativeButton
			side="bottom"
			align="end"
			testId="menu"
		>
			<button type="button">Menu</button>
		</AuthZDropdown>,
	);
}

async function openMenu(): Promise<void> {
	await userEvent.click(screen.getByTestId('menu'));
	await screen.findByTestId('row-create');
}

describe('AuthZDropdown', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('fires no check until the menu opens', async () => {
		const onCheck = jest.fn();
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				onCheck();
				return res(ctx.status(200));
			}),
		);

		renderDropdown();

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(onCheck).not.toHaveBeenCalled();
	});

	it('shows a gated row as loading while its check is pending', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
		);

		renderDropdown();
		await openMenu();

		expect(screen.getByTestId('row-create')).toHaveAttribute('data-loading');
		expect(screen.getByTestId('row-create')).not.toHaveAttribute('data-disabled');
		expect(screen.getByTestId('row-open')).not.toHaveAttribute('data-loading');
	});

	it('disables a denied row and names the permission', async () => {
		server.use(setupAuthzDeny(createPerm));

		renderDropdown();
		await openMenu();

		await waitFor(() => {
			expect(screen.getByTestId('row-create')).toHaveAttribute('data-disabled');
		});
		expect(screen.getByTestId('row-open')).not.toHaveAttribute('data-disabled');

		await userEvent.hover(screen.getByTestId('row-create'));
		await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
			'is not authorized to perform create:serviceaccount:*',
		);
	});

	it('gates rows inside a group', async () => {
		server.use(setupAuthzDeny(createPerm));

		renderDropdown([
			{
				type: 'group',
				value: 'section',
				label: 'Section',
				items: [
					{ type: 'item', value: 'open', label: 'Open', testId: 'row-open' },
					{
						type: 'item',
						value: 'create',
						label: 'Create',
						testId: 'row-create',
						checks: [createPerm],
					},
				],
			},
		]);
		await openMenu();

		await waitFor(() => {
			expect(screen.getByTestId('row-create')).toHaveAttribute('data-disabled');
		});
		expect(screen.getByTestId('row-open')).not.toHaveAttribute('data-disabled');
	});

	it('enables a granted row', async () => {
		server.use(setupAuthzAdmin());

		renderDropdown();
		await openMenu();

		await waitFor(() => {
			expect(screen.getByTestId('row-create')).not.toHaveAttribute('data-loading');
		});
		expect(screen.getByTestId('row-create')).not.toHaveAttribute('data-disabled');
	});

	it('lets a row block outrank its checks', async () => {
		const onCheck = jest.fn();
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				onCheck();
				return res(ctx.status(200));
			}),
		);

		renderDropdown([
			{
				type: 'item',
				value: 'create',
				label: 'Create',
				testId: 'row-create',
				checks: [createPerm],
				disabled: true,
				disabledTooltip: 'Locked',
			},
		]);
		await openMenu();

		expect(screen.getByTestId('row-create')).toHaveAttribute('data-disabled');
		expect(onCheck).not.toHaveBeenCalled();
	});
});
