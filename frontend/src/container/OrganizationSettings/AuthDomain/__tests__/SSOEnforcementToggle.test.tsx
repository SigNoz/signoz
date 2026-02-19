import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import SSOEnforcementToggle from '../SSOEnforcementToggle';
import {
	AUTH_DOMAINS_UPDATE_ENDPOINT,
	mockErrorResponse,
	mockGoogleAuthDomain,
	mockUpdateSuccessResponse,
} from './mocks';

describe('SSOEnforcementToggle', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
				record={{ ...mockGoogleAuthDomain, ssoEnabled: false }}
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
		await user.click(switchElement);

		await waitFor(() => {
			expect(switchElement).not.toBeChecked();
		});

		expect(mockUpdateAPI).toHaveBeenCalledTimes(1);
		expect(mockUpdateAPI).toHaveBeenCalledWith(
			expect.objectContaining({
				config: expect.objectContaining({
					ssoEnabled: false,
				}),
			}),
		);
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
				record={{ ...mockGoogleAuthDomain, id: undefined }}
			/>,
		);

		const switchElement = screen.getByRole('switch');
		await user.click(switchElement);

		// Wait a bit to ensure no API call was made
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(apiCalled).toBe(false);
	});
});
