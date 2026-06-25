import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { FeatureKeys } from 'constants/features';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';
import { defaultFeatureFlags, render, screen } from 'tests/test-utils';
import { invalidLicense, mockUseAuthZGrantAll } from 'tests/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

jest.mock('hooks/useAuthZ/useAuthZ');
const mockUseAuthZ = useAuthZ as jest.MockedFunction<typeof useAuthZ>;

beforeEach(() => {
	mockUseAuthZ.mockImplementation(mockUseAuthZGrantAll);
});

afterEach(() => {
	jest.clearAllMocks();
});

function renderCreatePage(
	appContextOverrides?: Record<string, unknown>,
): ReturnType<typeof render> {
	return render(
		<Switch>
			<Route path={ROUTES.ROLES_SETTINGS} exact>
				<div data-testid="roles-list-redirect" />
			</Route>
			<Route path={ROUTES.ROLE_CREATE}>
				<CreateEditRolePage />
			</Route>
		</Switch>,
		undefined,
		{ initialRoute: '/settings/roles/new', appContextOverrides },
	);
}

function renderEditPage(
	roleId: string,
	roleName: string,
	appContextOverrides?: Record<string, unknown>,
): ReturnType<typeof render> {
	return render(
		<Switch>
			<Route path={ROUTES.ROLES_SETTINGS} exact>
				<div data-testid="roles-list-redirect" />
			</Route>
			<Route path={ROUTES.ROLE_EDIT}>
				<CreateEditRolePage />
			</Route>
		</Switch>,
		undefined,
		{
			initialRoute: `/settings/roles/${roleId}/edit?name=${encodeURIComponent(roleName)}`,
			appContextOverrides,
		},
	);
}

describe('CreateEditRolePage - Feature Gate', () => {
	describe('create mode - feature disabled', () => {
		it('shows error when fine-grained authz flag is inactive', async () => {
			renderCreatePage({
				featureFlags: defaultFeatureFlags.map((f) =>
					f.name === FeatureKeys.USE_FINE_GRAINED_AUTHZ
						? { ...f, active: false }
						: f,
				),
			});

			expect(screen.getByTestId('feature-gate-error-banner')).toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows error when license is invalid', async () => {
			renderCreatePage({ activeLicense: invalidLicense });

			expect(screen.getByTestId('feature-gate-error-banner')).toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows Create Role title when feature disabled in create mode', async () => {
			renderCreatePage({ activeLicense: invalidLicense });

			await expect(screen.findByText('Create Role')).resolves.toBeInTheDocument();
		});

		it('shows back button when feature disabled', () => {
			renderCreatePage({ activeLicense: invalidLicense });

			expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
		});

		it('back button is enabled when feature disabled', () => {
			renderCreatePage({ activeLicense: invalidLicense });

			expect(screen.getByTestId('cancel-button')).not.toBeDisabled();
		});
	});

	describe('edit mode - feature disabled', () => {
		const ROLE_ID = '019c24aa-3333-0001-aaaa-111111111111';
		const ROLE_NAME = 'test-role';

		it('shows error when fine-grained authz flag is inactive', async () => {
			renderEditPage(ROLE_ID, ROLE_NAME, {
				featureFlags: defaultFeatureFlags.map((f) =>
					f.name === FeatureKeys.USE_FINE_GRAINED_AUTHZ
						? { ...f, active: false }
						: f,
				),
			});

			expect(screen.getByTestId('feature-gate-error-banner')).toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows error when license is invalid', async () => {
			renderEditPage(ROLE_ID, ROLE_NAME, { activeLicense: invalidLicense });

			expect(screen.getByTestId('feature-gate-error-banner')).toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows Edit Role title when feature disabled in edit mode', async () => {
			renderEditPage(ROLE_ID, ROLE_NAME, { activeLicense: invalidLicense });

			await expect(screen.findByText('Edit Role')).resolves.toBeInTheDocument();
		});
	});
});
