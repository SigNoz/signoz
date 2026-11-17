import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';

import CreateEdit from '../CreateEdit/CreateEdit';
import {
	AUTH_DOMAINS_UPDATE_ENDPOINT,
	mockDomainWithRoleMapping,
	mockGoogleAuthWithWorkspaceGroups,
	mockUpdateSuccessResponse,
} from './mocks';

// TODO: https://github.com/SigNoz/platform-pod/issues/2602
// The real @signozhq/ui/button has internal effects that prevent form.validateFields()
// from resolving inside act(). Mirror the pattern from SSOEnforcementToggle.test.tsx
// which mocks @signozhq/ui/switch for the same reason.
jest.mock('@signozhq/ui/button', () => ({
	...jest.requireActual('@signozhq/ui/button'),
	Button: ({
		children,
		onClick,
		loading,
		disabled,
		'aria-label': ariaLabel,
		prefix,
		suffix,
		testId,
	}: {
		children?: React.ReactNode;
		onClick?: React.MouseEventHandler<HTMLButtonElement>;
		loading?: boolean;
		disabled?: boolean;
		'aria-label'?: string;
		prefix?: React.ReactNode;
		suffix?: React.ReactNode;
		testId?: string;
	}) => (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			aria-label={ariaLabel}
			data-testid={testId}
		>
			{prefix}
			{children}
			{suffix}
		</button>
	),
}));

function capturePayload(): { get: () => unknown } {
	let payload: unknown = null;
	server.use(
		rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, async (req, res, ctx) => {
			payload = await req.json();
			return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
		}),
	);
	return { get: (): unknown => payload };
}

describe('CreateEdit — save payload correctness', () => {
	it('sends groupMappings: {} when all group mappings are deleted', async () => {
		const user = userEvent.setup();
		const payload = capturePayload();

		render(
			<CreateEdit
				isCreate={false}
				record={mockDomainWithRoleMapping}
				onClose={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('role-mapping-header'));

		const removeButtons = await screen.findAllByTestId('role-mapping-remove');
		expect(removeButtons).toHaveLength(3);
		for (let i = 0; i < removeButtons.length; i += 1) {
			await user.click(screen.getAllByTestId('role-mapping-remove')[0]);
		}
		expect(screen.queryAllByTestId('role-mapping-remove')).toHaveLength(0);

		await user.click(screen.getByTestId('auth-domain-save'));

		await waitFor(() => expect(payload.get()).not.toBeNull());
		expect(payload.get()).toMatchObject({
			roleMapping: expect.objectContaining({ groupMappings: {} }),
		});
	});

	it('sends domainToAdminEmail: {} when all domain mappings are deleted', async () => {
		const user = userEvent.setup();
		const payload = capturePayload();

		render(
			<CreateEdit
				isCreate={false}
				record={mockGoogleAuthWithWorkspaceGroups}
				onClose={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('google-auth-workspace-groups-header'));
		await user.click(await screen.findByTestId('domain-mapping-remove'));
		expect(screen.queryByTestId('domain-mapping-remove')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('auth-domain-save'));

		await waitFor(() => expect(payload.get()).not.toBeNull());
		expect(payload.get()).toMatchObject({
			config: expect.objectContaining({
				spec: expect.objectContaining({
					domainToAdminEmail: {},
				}),
			}),
		});
	});
});
