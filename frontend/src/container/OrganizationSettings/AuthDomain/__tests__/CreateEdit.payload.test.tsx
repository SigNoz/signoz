import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
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
	}: {
		children?: React.ReactNode;
		onClick?: React.MouseEventHandler<HTMLButtonElement>;
		loading?: boolean;
		disabled?: boolean;
		'aria-label'?: string;
		prefix?: React.ReactNode;
		suffix?: React.ReactNode;
	}) => (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			aria-label={ariaLabel}
		>
			{prefix}
			{children}
			{suffix}
		</button>
	),
}));

describe('CreateEdit — save payload correctness', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('sends groupMappings: {} when all group mappings are deleted', async () => {
		let capturedPayload: unknown = null;

		server.use(
			rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, async (req, res, ctx) => {
				capturedPayload = await req.json();
				return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
			}),
		);

		render(
			<CreateEdit
				isCreate={false}
				record={mockDomainWithRoleMapping}
				onClose={jest.fn()}
			/>,
		);

		// Open the Role Mapping collapse (Ant Design Collapse responds to click events)
		fireEvent.click(screen.getByText(/role mapping \(advanced\)/i));

		// Wait for the 3 group mapping rows to appear
		await waitFor(() =>
			expect(
				screen.getAllByRole('button', { name: /remove mapping/i }),
			).toHaveLength(3),
		);

		// Delete each row; re-query after each removal
		fireEvent.click(
			screen.getAllByRole('button', { name: /remove mapping/i })[0],
		);
		await waitFor(() =>
			expect(
				screen.getAllByRole('button', { name: /remove mapping/i }),
			).toHaveLength(2),
		);

		fireEvent.click(
			screen.getAllByRole('button', { name: /remove mapping/i })[0],
		);
		await waitFor(() =>
			expect(
				screen.getAllByRole('button', { name: /remove mapping/i }),
			).toHaveLength(1),
		);

		fireEvent.click(
			screen.getAllByRole('button', { name: /remove mapping/i })[0],
		);
		await waitFor(() =>
			expect(
				screen.queryAllByRole('button', { name: /remove mapping/i }),
			).toHaveLength(0),
		);

		// Submit — MSW intercepts the PUT request
		fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

		await waitFor(() => expect(capturedPayload).not.toBeNull());

		expect(capturedPayload).toMatchObject({
			config: expect.objectContaining({
				roleMapping: expect.objectContaining({ groupMappings: {} }),
			}),
		});
	});

	it('sends domainToAdminEmail: {} when all domain mappings are deleted', async () => {
		let capturedPayload: unknown = null;

		server.use(
			rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, async (req, res, ctx) => {
				capturedPayload = await req.json();
				return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
			}),
		);

		render(
			<CreateEdit
				isCreate={false}
				record={mockGoogleAuthWithWorkspaceGroups}
				onClose={jest.fn()}
			/>,
		);

		// Open the Google Workspace Groups collapse
		fireEvent.click(screen.getByText(/google workspace groups/i));

		// Wait for the single domain mapping row
		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: /remove mapping/i }),
			).toBeInTheDocument(),
		);

		// Delete the row
		fireEvent.click(screen.getByRole('button', { name: /remove mapping/i }));
		await waitFor(() =>
			expect(
				screen.queryAllByRole('button', { name: /remove mapping/i }),
			).toHaveLength(0),
		);

		// Submit
		fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

		await waitFor(() => expect(capturedPayload).not.toBeNull());

		expect(capturedPayload).toMatchObject({
			config: expect.objectContaining({
				googleAuthConfig: expect.objectContaining({
					domainToAdminEmail: {},
				}),
			}),
		});
	});
});
