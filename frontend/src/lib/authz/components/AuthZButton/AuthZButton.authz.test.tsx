import { server } from 'mocks-server/server';
import { rest } from 'msw';
import type { AuthZObject } from 'lib/authz/hooks/useAuthZ/types';
import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import AuthZButton, { AuthZButtonProps } from './AuthZButton';

const createPerm = buildPermission(
	'create',
	'serviceaccount:*' as AuthZObject<'create'>,
);

function renderButton(props: Partial<AuthZButtonProps> = {}): void {
	render(
		<AuthZButton
			size="md"
			variant="solid"
			color="primary"
			checks={[createPerm]}
			testId="create-btn"
			{...(props as object)}
		>
			Create
		</AuthZButton>,
	);
}

describe('AuthZButton', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('shows as loading while the check is pending', () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
		);

		renderButton();

		expect(screen.getByTestId('create-btn')).toHaveAttribute('aria-busy', 'true');
	});

	it('enables a granted button', async () => {
		server.use(setupAuthzAdmin());

		renderButton();

		await waitFor(() => {
			expect(screen.getByTestId('create-btn')).not.toHaveAttribute('aria-busy');
		});
		expect(screen.getByTestId('create-btn')).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('disables a denied button and names the permission', async () => {
		server.use(setupAuthzDeny(createPerm));

		renderButton();

		await waitFor(() => {
			expect(screen.getByTestId('create-btn')).toHaveAttribute(
				'data-denied-permissions',
				createPerm,
			);
		});
		expect(screen.getByTestId('create-btn')).toHaveAttribute(
			'aria-disabled',
			'true',
		);

		await userEvent.hover(screen.getByTestId('create-btn'));
		await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
			'is not authorized to perform create:serviceaccount:*',
		);
	});

	it('uses tooltipMessage in place of the denial wording', async () => {
		server.use(setupAuthzDeny(createPerm));

		renderButton({ tooltipMessage: 'Ask an admin' });

		await waitFor(() => {
			expect(screen.getByTestId('create-btn')).toHaveAttribute(
				'data-denied-permissions',
			);
		});
		await userEvent.hover(screen.getByTestId('create-btn'));
		await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
			'Ask an admin',
		);
	});

	it('lets disabledTooltip outrank its checks', async () => {
		const onCheck = jest.fn();
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				onCheck();
				return res(ctx.status(200));
			}),
		);

		renderButton({ disabledTooltip: 'Locked' });

		expect(screen.getByTestId('create-btn')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
		await userEvent.hover(screen.getByTestId('create-btn'));
		await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
			'Locked',
		);
		expect(onCheck).not.toHaveBeenCalled();
	});

	it('skips the check when authZEnabled is false', async () => {
		const onCheck = jest.fn();
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => {
				onCheck();
				return res(ctx.status(200));
			}),
		);

		renderButton({ authZEnabled: false });

		expect(screen.getByTestId('create-btn')).not.toHaveAttribute('aria-busy');
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(onCheck).not.toHaveBeenCalled();
	});
});
