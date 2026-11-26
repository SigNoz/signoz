import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import CreateEdit from '../CreateEdit/CreateEdit';
import {
	AUTH_DOMAINS_CREATE_ENDPOINT,
	AUTH_DOMAINS_UPDATE_ENDPOINT,
	mockGoogleAuthDomain,
} from './mocks';

// The real @signozhq/ui/button keeps form.validateFields() from resolving inside
// act(); see CreateEdit.payload.test.tsx for the same workaround.
jest.mock('@signozhq/ui/button', () => ({
	...jest.requireActual('@signozhq/ui/button'),
	Button: ({
		children,
		onClick,
		loading,
		disabled,
		testId,
	}: {
		children?: React.ReactNode;
		onClick?: React.MouseEventHandler<HTMLButtonElement>;
		loading?: boolean;
		disabled?: boolean;
		testId?: string;
	}) => (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			data-testid={testId}
		>
			{children}
		</button>
	),
}));

const FORBIDDEN_RESPONSE = {
	error: {
		code: 'authz_forbidden',
		message: 'not allowed to save this domain',
		url: '',
	},
};

describe('CreateEdit — authz', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('shows the error modal and keeps the filled form when create is rejected', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClose = jest.fn();
		server.use(
			rest.post(AUTH_DOMAINS_CREATE_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(403), ctx.json(FORBIDDEN_RESPONSE)),
			),
		);

		render(<CreateEdit isCreate onClose={onClose} />);

		await user.click(
			await screen.findByTestId('authn-provider-configure-google'),
		);
		await user.type(await screen.findByLabelText(/^domain/i), 'acme.io');
		await user.type(screen.getByLabelText(/client id/i), 'client-id');
		await user.type(screen.getByLabelText(/client secret/i), 'secret');
		await user.click(screen.getByTestId('auth-domain-save'));

		expect(
			(
				await screen.findAllByText(/not allowed to save this domain/i, undefined, {
					timeout: 5000,
				})
			).length,
		).toBeGreaterThan(0);
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByLabelText(/^domain/i)).toHaveValue('acme.io');
		expect(screen.getByLabelText(/client id/i)).toHaveValue('client-id');
	});

	it('shows the error modal and keeps the form when update is rejected', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onClose = jest.fn();
		let updateCalls = 0;
		server.use(
			rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, (_, res, ctx) => {
				updateCalls += 1;
				return res(ctx.status(403), ctx.json(FORBIDDEN_RESPONSE));
			}),
		);

		render(
			<CreateEdit
				isCreate={false}
				record={mockGoogleAuthDomain}
				onClose={onClose}
			/>,
		);

		await user.click(await screen.findByTestId('auth-domain-save'));

		await waitFor(() => expect(updateCalls).toBe(1));
		expect(
			(
				await screen.findAllByText(/not allowed to save this domain/i, undefined, {
					timeout: 5000,
				})
			).length,
		).toBeGreaterThan(0);
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByLabelText(/client id/i)).toHaveValue('test-client-id');
	});
});
