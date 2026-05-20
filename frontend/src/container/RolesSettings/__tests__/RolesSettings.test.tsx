import {
	allRoles,
	listRolesSuccessResponse,
} from 'mocks-server/__mockdata__/roles';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import {
	defaultFeatureFlags,
	fireEvent,
	render,
	screen,
} from 'tests/test-utils';
import { FeatureKeys } from 'constants/features';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { invalidLicense, mockUseAuthZGrantAll } from 'tests/authz-test-utils';

import RolesSettings from '../RolesSettings';

jest.mock('hooks/useAuthZ/useAuthZ');
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

	it('renders the header and search input', () => {
		render(<RolesSettings />);

		expect(screen.getByText('Roles')).toBeInTheDocument();
		expect(
			screen.getByText('Create and manage custom roles for your team.'),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Search for roles...'),
		).toBeInTheDocument();
	});

	it('displays roles grouped by managed and custom sections', async () => {
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		// Section headers
		expect(screen.getByText('Managed roles')).toBeInTheDocument();
		expect(screen.getByText('Custom roles')).toBeInTheDocument();

		// Managed roles
		expect(screen.getByText('signoz-admin')).toBeInTheDocument();
		expect(screen.getByText('signoz-editor')).toBeInTheDocument();
		expect(screen.getByText('signoz-viewer')).toBeInTheDocument();

		// Custom roles
		expect(screen.getByText('billing-manager')).toBeInTheDocument();
		expect(screen.getByText('dashboard-creator')).toBeInTheDocument();

		// Custom roles count badge
		expect(screen.getByText('2')).toBeInTheDocument();

		// Column headers
		expect(screen.getByText('Name')).toBeInTheDocument();
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText('Updated At')).toBeInTheDocument();
		expect(screen.getByText('Created At')).toBeInTheDocument();
	});

	it('filters roles by search query on name', async () => {
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText('Search for roles...'), {
			target: { value: 'billing' },
		});

		await expect(
			screen.findByText('billing-manager'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText('signoz-admin')).not.toBeInTheDocument();
		expect(screen.queryByText('signoz-editor')).not.toBeInTheDocument();
		expect(screen.queryByText('dashboard-creator')).not.toBeInTheDocument();
	});

	it('filters roles by search query on description', async () => {
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText('Search for roles...'), {
			target: { value: 'read-only' },
		});

		await expect(screen.findByText('signoz-viewer')).resolves.toBeInTheDocument();
		expect(screen.queryByText('signoz-admin')).not.toBeInTheDocument();
		expect(screen.queryByText('billing-manager')).not.toBeInTheDocument();
	});

	it('shows empty state when search matches nothing', async () => {
		render(<RolesSettings />);

		await expect(screen.findByText('signoz-admin')).resolves.toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText('Search for roles...'), {
			target: { value: 'nonexistentrole' },
		});

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
				expect(screen.getByText(role.description)).toBeInTheDocument();
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
