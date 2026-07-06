import {
	allRoles,
	listRolesSuccessResponse,
} from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	defaultFeatureFlags,
	render,
	screen,
	userEvent,
} from 'tests/test-utils';
import { FeatureKeys } from 'constants/features';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import {
	invalidLicense,
	mockUseAuthZGrantAll,
} from 'lib/authz/utils/authz-test-utils';

import RolesSettings from '../RolesSettings';

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

const rolesApiURL = 'http://localhost/api/v1/roles';

describe('RolesSettings', () => {
	beforeEach(() => {
		mockUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
		server.use(
			rest.get(rolesApiURL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(listRolesSuccessResponse)),
			),
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
		server.resetHandlers();
	});

	it('renders the header and search input', async () => {
		render(<RolesSettings />);

		await expect(screen.findByText('Roles')).resolves.toBeInTheDocument();
		await expect(
			screen.findByText('Create and manage custom roles for your team.'),
		).resolves.toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Search for roles...'),
		).toBeInTheDocument();
	});

	it('displays roles grouped by managed and custom sections', async () => {
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		// Section headers
		await expect(screen.findByText('Managed roles')).resolves.toBeInTheDocument();
		await expect(screen.findByText('Custom roles')).resolves.toBeInTheDocument();

		// Managed roles
		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();
		await expect(screen.findByText('signoz-editor')).resolves.toBeInTheDocument();
		await expect(screen.findByText('signoz-viewer')).resolves.toBeInTheDocument();

		// Custom roles
		await expect(
			screen.findByText('billing-manager'),
		).resolves.toBeInTheDocument();
		await expect(
			screen.findByText('dashboard-creator'),
		).resolves.toBeInTheDocument();

		// Custom roles count badge
		await expect(screen.findByText('2')).resolves.toBeInTheDocument();

		// Column headers
		await expect(screen.findByText('Name')).resolves.toBeInTheDocument();
		await expect(screen.findByText('Description')).resolves.toBeInTheDocument();
		await expect(screen.findByText('Updated At')).resolves.toBeInTheDocument();
		await expect(screen.findByText('Created At')).resolves.toBeInTheDocument();
	});

	it('filters roles by search query on name', async () => {
		const user = userEvent.setup();
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		const searchInput = screen.getByPlaceholderText('Search for roles...');
		await user.clear(searchInput);
		await user.type(searchInput, 'billing');

		await expect(
			screen.findByText('billing-manager'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText('signoz-admin')).not.toBeInTheDocument();
		expect(screen.queryByText('signoz-editor')).not.toBeInTheDocument();
		expect(screen.queryByText('dashboard-creator')).not.toBeInTheDocument();
	});

	it('filters roles by search query on description', async () => {
		const user = userEvent.setup();
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		const searchInput = screen.getByPlaceholderText('Search for roles...');
		await user.clear(searchInput);
		await user.type(searchInput, 'read-only');

		await expect(screen.findByText('signoz-viewer')).resolves.toBeInTheDocument();
		expect(screen.queryByText('signoz-admin')).not.toBeInTheDocument();
		expect(screen.queryByText('billing-manager')).not.toBeInTheDocument();
	});

	it('shows empty state when search matches nothing', async () => {
		const user = userEvent.setup();
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		const searchInput = screen.getByPlaceholderText('Search for roles...');
		await user.clear(searchInput);
		await user.type(searchInput, 'nonexistentrole');

		await expect(
			screen.findByText('No roles match your search.'),
		).resolves.toBeInTheDocument();
	});

	it('shows loading skeleton while fetching', () => {
		server.use(
			rest.get(rolesApiURL, (_req, res, ctx) =>
				res(ctx.delay(200), ctx.status(200), ctx.json(listRolesSuccessResponse)),
			),
		);

		render(<RolesSettings />);

		expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
	});

	it('shows error state when API fails', async () => {
		const errorMessage = 'Failed to fetch roles';
		server.use(
			rest.get(rolesApiURL, (_req, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({
						error: {
							code: 'INTERNAL_ERROR',
							message: errorMessage,
							url: '',
							errors: [],
						},
					}),
				),
			),
		);

		render(<RolesSettings />);

		await expect(screen.findByText(errorMessage)).resolves.toBeInTheDocument();
	});

	it('shows empty state when API returns no roles', async () => {
		server.use(
			rest.get(rolesApiURL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: [] })),
			),
		);

		render(<RolesSettings />);

		await expect(
			screen.findByText('No roles found.'),
		).resolves.toBeInTheDocument();
	});

	it('renders descriptions for all roles', async () => {
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		for (const role of allRoles) {
			if (role.description) {
				await expect(
					screen.findByText(role.description),
				).resolves.toBeInTheDocument();
			}
		}
	});

	it('hides the create button and disables row clicks when fine-grained authz flag is inactive', async () => {
		render(<RolesSettings />, undefined, {
			appContextOverrides: {
				featureFlags: defaultFeatureFlags.map((f) =>
					f.name === FeatureKeys.USE_FINE_GRAINED_AUTHZ
						? { ...f, active: false }
						: f,
				),
			},
		});

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		expect(
			screen.queryByRole('button', { name: /custom role/i }),
		).not.toBeInTheDocument();

		const rows = document.querySelectorAll('.roles-table-row');
		rows.forEach((row) => {
			expect(row).not.toHaveClass('roles-table-row--clickable');
			expect(row.getAttribute('role')).not.toBe('button');
		});
	});

	it('hides the create button and disables row clicks when license is not valid', async () => {
		render(<RolesSettings />, undefined, {
			appContextOverrides: { activeLicense: invalidLicense },
		});

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		// Create button must be absent
		expect(
			screen.queryByRole('button', { name: /custom role/i }),
		).not.toBeInTheDocument();

		// Rows must not carry the clickable class or button role
		const rows = document.querySelectorAll('.roles-table-row');
		rows.forEach((row) => {
			expect(row).not.toHaveClass('roles-table-row--clickable');
			expect(row.getAttribute('role')).not.toBe('button');
		});
	});

	it('handles invalid dates gracefully by showing fallback', async () => {
		const invalidRole = {
			id: 'edge-0009',
			createdAt: 'invalid-date' as unknown as Date,
			updatedAt: 'not-a-date' as unknown as Date,
			name: 'invalid-date-role',
			description: 'Tests date parsing fallback.',
			type: 'custom',
			orgId: 'org-001',
		};

		server.use(
			rest.get(rolesApiURL, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: [invalidRole],
					}),
				),
			),
		);

		render(<RolesSettings />);

		await expect(
			screen.findByText('invalid-date-role'),
		).resolves.toBeInTheDocument();

		// Verify the "—" (em-dash) fallback is shown for both cells
		const dashFallback = screen.getAllByText('—');
		// In renderRow: name, description, updatedAt, createdAt.
		// Total dashes expected: 2 (for both dates)
		expect(dashFallback.length).toBeGreaterThanOrEqual(2);
	});
});
