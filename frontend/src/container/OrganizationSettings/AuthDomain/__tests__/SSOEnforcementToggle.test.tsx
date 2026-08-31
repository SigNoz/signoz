import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

jest.mock('@signozhq/ui/switch', () => ({
	...jest.requireActual('@signozhq/ui/switch'),
	Switch: ({
		value,
		onChange,
		disabled,
	}: {
		value: boolean;
		onChange: (checked: boolean) => void;
		disabled?: boolean;
	}): JSX.Element => (
		<button
			type="button"
			role="switch"
			aria-checked={value}
			disabled={disabled}
			onClick={(): void => onChange(!value)}
		/>
	),
}));

import SSOEnforcementToggle from '../SSOEnforcementToggle';
import {
	AUTH_DOMAINS_UPDATE_ENDPOINT,
	mockDomainWithRoleMapping,
	mockErrorResponse,
	mockGoogleAuthDomain,
	mockUpdateSuccessResponse,
} from './mocks';

describe('SSOEnforcementToggle', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('renders switch with correct initial state', () => {
		render(
			<SSOEnforcementToggle
				isDefaultChecked={true}
				record={mockGoogleAuthDomain}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		expect(switchElement).toBeChecked();
	});

	it('renders unchecked switch when SSO is disabled', () => {
		render(
			<SSOEnforcementToggle
				isDefaultChecked={false}
				record={{
					...mockGoogleAuthDomain,
					enabled: false,
				}}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		expect(switchElement).not.toBeChecked();
	});

	it('calls update API when toggle is clicked', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockUpdateAPI = jest.fn();

		server.use(
			rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, async (req, res, ctx) => {
				const body = await req.json();
				mockUpdateAPI(body);
				return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
			}),
		);

		render(
			<SSOEnforcementToggle
				isDefaultChecked={true}
				record={mockGoogleAuthDomain}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		await waitFor(() => {
			expect(switchElement).toBeEnabled();
		});
		await user.click(switchElement);

		await waitFor(() => {
			expect(switchElement).not.toBeChecked();
		});

		expect(mockUpdateAPI).toHaveBeenCalledTimes(1);
		expect(mockUpdateAPI).toHaveBeenCalledWith(
			expect.objectContaining({
				enabled: false,
				config: mockGoogleAuthDomain.config,
			}),
		);
	});

	// The toggle sends a full replacement, so anything it fails to echo back is
	// dropped from the domain — role mappings included.
	it('echoes the existing role mapping when toggling enforcement', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const mockUpdateAPI = jest.fn();

		server.use(
			rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, async (req, res, ctx) => {
				mockUpdateAPI(await req.json());
				return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
			}),
		);

		render(
			<SSOEnforcementToggle
				isDefaultChecked={true}
				record={mockDomainWithRoleMapping}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		await waitFor(() => {
			expect(switchElement).toBeEnabled();
		});
		await user.click(switchElement);

		await waitFor(() => expect(mockUpdateAPI).toHaveBeenCalledTimes(1));
		expect(mockUpdateAPI).toHaveBeenCalledWith({
			enabled: false,
			config: mockDomainWithRoleMapping.config,
			roleMapping: mockDomainWithRoleMapping.roleMapping,
		});
	});

	it('shows error modal when update fails', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		server.use(
			rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(500), ctx.json(mockErrorResponse)),
			),
		);

		render(
			<SSOEnforcementToggle
				isDefaultChecked={true}
				record={mockGoogleAuthDomain}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		await waitFor(() => {
			expect(switchElement).toBeEnabled();
		});
		await user.click(switchElement);

		await waitFor(() => {
			expect(screen.getByText(/failed to perform operation/i)).toBeInTheDocument();
		});
	});

	it('does not call API when record has no id', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		let apiCalled = false;

		server.use(
			rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, (_, res, ctx) => {
				apiCalled = true;
				return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
			}),
		);

		render(
			<SSOEnforcementToggle
				isDefaultChecked={true}
				record={{ ...mockGoogleAuthDomain, id: '' }}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		await user.click(switchElement);

		// Wait a bit to ensure no API call was made
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(apiCalled).toBe(false);
	});
});
