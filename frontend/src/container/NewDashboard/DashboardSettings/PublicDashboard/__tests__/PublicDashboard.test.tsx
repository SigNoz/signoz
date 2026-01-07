import { toast } from '@signozhq/sonner';
import { fireEvent, within } from '@testing-library/react';
import { StatusCodes } from 'http-status-codes';
import {
	publishedPublicDashboardMeta,
	unpublishedPublicDashboardMeta,
} from 'mocks-server/__mockdata__/publicDashboard';
import { rest, server } from 'mocks-server/server';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCopyToClipboard } from 'react-use';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import PublicDashboardSetting from '../index';

// Mock dependencies
jest.mock('providers/Dashboard/Dashboard');
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: jest.fn(),
}));
jest.mock('@signozhq/sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

const mockUseDashboard = jest.mocked(useDashboard);
const mockUseCopyToClipboard = jest.mocked(useCopyToClipboard);
const mockToast = jest.mocked(toast);

// Test constants
const MOCK_DASHBOARD_ID = 'test-dashboard-id';
const MOCK_PUBLIC_PATH = '/public/dashboard/test-dashboard-id';
const DEFAULT_TIME_RANGE = '30m';
const DASHBOARD_VARIABLES_WARNING =
	"Dashboard variables won't work in public dashboards";

// Use wildcard pattern to match both relative and absolute URLs in MSW
const publicDashboardURL = `*/api/v1/dashboards/${MOCK_DASHBOARD_ID}/public`;

const mockSelectedDashboard = {
	id: MOCK_DASHBOARD_ID,
	data: {
		title: 'Test Dashboard',
		widgets: [],
		layout: [],
		panelMap: {},
		variables: {},
	},
};

beforeAll(() => {
	server.listen();
});

afterAll(() => {
	server.close();
});

const mockSetCopyPublicDashboardURL = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();

	// Mock window.open
	window.open = jest.fn();

	// Mock useDashboard
	mockUseDashboard.mockReturnValue(({
		selectedDashboard: mockSelectedDashboard,
	} as unknown) as ReturnType<typeof useDashboard>);

	// Mock useCopyToClipboard
	mockUseCopyToClipboard.mockReturnValue(([
		undefined,
		mockSetCopyPublicDashboardURL,
	] as unknown) as ReturnType<typeof useCopyToClipboard>);
});

afterEach(() => {
	server.resetHandlers();
	jest.clearAllMocks();
});

describe('PublicDashboardSetting', () => {
	describe('Unpublished Dashboard', () => {
		it('Unpublished dashboard should be handled correctly', async () => {
			server.use(
				rest.get(
					`*/api/v1/dashboards/${MOCK_DASHBOARD_ID}/public`,
					(_req, res, ctx) =>
						res(
							ctx.status(StatusCodes.NOT_FOUND),
							ctx.json(unpublishedPublicDashboardMeta),
						),
				),
			);

			render(<PublicDashboardSetting />);

			await waitFor(() => {
				expect(
					screen.getByText(
						/This dashboard is private. Publish it to make it accessible to anyone with the link./i,
					),
				).toBeInTheDocument();
			});

			expect(
				await screen.findByRole('checkbox', { name: /enable time range/i }),
			).toBeInTheDocument();

			expect(await screen.findByText(/default time range/i)).toBeInTheDocument();

			expect(screen.getByText(/Last 30 minutes/i)).toBeInTheDocument();

			await waitFor(() => {
				expect(
					screen.getByText(new RegExp(DASHBOARD_VARIABLES_WARNING, 'i')),
				).toBeInTheDocument();
			});

			expect(
				await screen.findByRole('button', { name: /publish dashboard/i }),
			).toBeInTheDocument();
		});
	});

	describe('Published Dashboard', () => {
		it('Published dashboard should be handled correctly', async () => {
			server.use(
				rest.get(
					`*/api/v1/dashboards/${MOCK_DASHBOARD_ID}/public`,
					(_req, res, ctx) =>
						res(ctx.status(StatusCodes.OK), ctx.json(publishedPublicDashboardMeta)),
				),
			);

			render(<PublicDashboardSetting />);

			await waitFor(() => {
				expect(
					screen.getByText(
						/This dashboard is publicly accessible. Anyone with the link can view it./i,
					),
				).toBeInTheDocument();
			});

			expect(
				await screen.findByRole('checkbox', { name: /enable time range/i }),
			).toBeChecked();

			await waitFor(() => {
				expect(screen.getByText(/default time range/i)).toBeInTheDocument();
			});

			expect(screen.getByText(/Last 30 minutes/i)).toBeInTheDocument();

			await waitFor(() => {
				expect(screen.getByText(/Public Dashboard URL/i)).toBeInTheDocument();
			});

			expect(
				await screen.findByRole('button', { name: /update published dashboard/i }),
			).toBeInTheDocument();

			expect(
				await screen.findByRole('button', { name: /unpublish dashboard/i }),
			).toBeInTheDocument();
		});
	});

	describe('Time Range Settings', () => {
		beforeEach(() => {
			server.use(
				rest.get(
					`*/api/v1/dashboards/${MOCK_DASHBOARD_ID}/public`,
					(_req, res, ctx) =>
						res(ctx.status(StatusCodes.OK), ctx.json(publishedPublicDashboardMeta)),
				),
			);
		});

		it('should toggle time range enabled when checkbox is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<PublicDashboardSetting />);

			// Wait for checkbox to be rendered and verify initial state
			const checkbox = await screen.findByRole('checkbox', {
				name: /enable time range/i,
			});
			expect(checkbox).toBeChecked();

			await user.click(checkbox);

			await waitFor(() => {
				expect(checkbox).not.toBeChecked();
			});
		});

		it('should update default time range when select value changes', async () => {
			render(<PublicDashboardSetting />);

			const selectContainer = await screen.findByTestId(
				'default-time-range-select-dropdown',
			);

			const combobox = within(selectContainer).getByRole('combobox');

			fireEvent.mouseDown(combobox);

			await screen.findByRole('listbox');

			const option = await screen.findByText(/Last 1 hour/i, {
				selector: '.ant-select-item-option-content',
			});
			fireEvent.click(option);

			await waitFor(() => {
				expect(
					within(selectContainer).getByText(/Last 1 hour/i),
				).toBeInTheDocument();
			});
		});
	});

	describe('Create Public Dashboard', () => {
		it('should call create API when publish button is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let createApiCalled = false;

			server.use(
				rest.get(publicDashboardURL, (_req, res, ctx) =>
					res(
						ctx.status(StatusCodes.OK),
						ctx.json({
							data: {
								timeRangeEnabled: true,
								defaultTimeRange: DEFAULT_TIME_RANGE,
								publicPath: '',
							},
						}),
					),
				),
				rest.post(publicDashboardURL, async (req, res, ctx) => {
					const body = await req.json();
					createApiCalled = true;
					expect(body).toEqual({
						timeRangeEnabled: true,
						defaultTimeRange: DEFAULT_TIME_RANGE,
					});
					return res(
						ctx.status(StatusCodes.CREATED),
						ctx.json({
							data: {
								timeRangeEnabled: true,
								defaultTimeRange: DEFAULT_TIME_RANGE,
								publicPath: MOCK_PUBLIC_PATH,
							},
						}),
					);
				}),
			);

			render(<PublicDashboardSetting />);

			// Find and click publish button
			const publishButton = await screen.findByRole('button', {
				name: /publish dashboard/i,
			});
			await user.click(publishButton);

			await waitFor(() => {
				expect(createApiCalled).toBe(true);
				expect(mockToast.success).toHaveBeenCalledWith(
					'Public dashboard created successfully',
				);
			});
		});
	});

	describe('Update Public Dashboard', () => {
		it('should call update API when update button is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let updateApiCalled = false;
			let capturedRequestBody: {
				timeRangeEnabled: boolean;
				defaultTimeRange: string;
			} | null = null;

			server.use(
				rest.get(
					`*/api/v1/dashboards/${MOCK_DASHBOARD_ID}/public`,
					(_req, res, ctx) =>
						res(ctx.status(StatusCodes.OK), ctx.json(publishedPublicDashboardMeta)),
				),
				rest.put(publicDashboardURL, async (req, res, ctx) => {
					const body = await req.json();
					updateApiCalled = true;
					capturedRequestBody = body;
					return res(ctx.status(StatusCodes.NO_CONTENT), ctx.json({}));
				}),
			);

			render(<PublicDashboardSetting />);

			// Wait for API response and component update
			const updateButton = await screen.findByRole(
				'button',
				{ name: /update published dashboard/i },
				{ timeout: 5000 },
			);
			await user.click(updateButton);

			await waitFor(() => {
				expect(updateApiCalled).toBe(true);
				expect(capturedRequestBody).toEqual({
					timeRangeEnabled: true,
					defaultTimeRange: DEFAULT_TIME_RANGE,
				});
				expect(mockToast.success).toHaveBeenCalledWith(
					'Public dashboard updated successfully',
				);
			});
		});
	});

	describe('Revoke Public Dashboard Access', () => {
		it('should call revoke API when unpublish button is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			let revokeApiCalled = false;
			let capturedDashboardId: string | null = null;

			server.use(
				rest.get(
					`*/api/v1/dashboards/${MOCK_DASHBOARD_ID}/public`,
					(_req, res, ctx) =>
						res(ctx.status(StatusCodes.OK), ctx.json(publishedPublicDashboardMeta)),
				),
				rest.delete(publicDashboardURL, (req, res, ctx) => {
					revokeApiCalled = true;
					// Extract dashboard ID from URL: /api/v1/dashboards/{id}/public
					const urlMatch = req.url.pathname.match(
						/\/api\/v1\/dashboards\/([^/]+)\/public/,
					);
					capturedDashboardId = urlMatch ? urlMatch[1] : null;
					return res(ctx.status(StatusCodes.NO_CONTENT), ctx.json({}));
				}),
			);

			render(<PublicDashboardSetting />);

			// Wait for API response and component update
			const unpublishButton = await screen.findByRole(
				'button',
				{ name: /unpublish dashboard/i },
				{ timeout: 5000 },
			);
			await user.click(unpublishButton);

			await waitFor(() => {
				expect(revokeApiCalled).toBe(true);
				expect(capturedDashboardId).toBe(MOCK_DASHBOARD_ID);
				expect(mockToast.success).toHaveBeenCalledWith(
					'Dashboard unpublished successfully',
				);
			});
		});
	});

	describe('Non-admin user permissions', () => {
		it('should disable "Publish dashboard" button for non-admin users', async () => {
			server.use(
				rest.get(
					`*/api/v1/dashboards/${MOCK_DASHBOARD_ID}/public`,
					// eslint-disable-next-line sonarjs/no-identical-functions
					(_req, res, ctx) =>
						res(
							ctx.status(StatusCodes.NOT_FOUND),
							ctx.json(unpublishedPublicDashboardMeta),
						),
				),
			);

			render(<PublicDashboardSetting />, {}, { role: USER_ROLES.VIEWER });

			const publishButton = await screen.findByRole('button', {
				name: /publish dashboard/i,
			});
			expect(publishButton).toBeInTheDocument();
			expect(publishButton).toBeDisabled();
			expect(publishButton).toHaveAttribute('disabled');
		});

		describe('Published dashboard buttons for non-admin users', () => {
			// eslint-disable-next-line sonarjs/no-identical-functions
			beforeEach(() => {
				server.use(
					rest.get(
						`*/api/v1/dashboards/${MOCK_DASHBOARD_ID}/public`,
						(_req, res, ctx) =>
							res(ctx.status(StatusCodes.OK), ctx.json(publishedPublicDashboardMeta)),
					),
				);
			});

			it('should disable "Unpublish dashboard" button for non-admin users', async () => {
				render(<PublicDashboardSetting />, {}, { role: USER_ROLES.VIEWER });

				const unpublishButton = await screen.findByRole('button', {
					name: /unpublish dashboard/i,
				});
				expect(unpublishButton).toBeInTheDocument();
				expect(unpublishButton).toBeDisabled();
				expect(unpublishButton).toHaveAttribute('disabled');
			});

			it('should disable "Update published dashboard" button for non-admin users', async () => {
				render(<PublicDashboardSetting />, {}, { role: USER_ROLES.VIEWER });

				const updateButton = await screen.findByRole('button', {
					name: /update published dashboard/i,
				});
				expect(updateButton).toBeInTheDocument();
				expect(updateButton).toBeDisabled();
				expect(updateButton).toHaveAttribute('disabled');
			});
		});
	});
});
