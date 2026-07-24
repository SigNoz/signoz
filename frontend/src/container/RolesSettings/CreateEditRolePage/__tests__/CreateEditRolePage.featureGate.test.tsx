import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { FeatureKeys } from 'constants/features';
import { server } from 'mocks-server/server';
import { defaultFeatureFlags, render, screen } from 'tests/test-utils';
import {
	invalidLicense,
	setupAuthzAdmin,
} from 'lib/authz/utils/authz-test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

beforeEach(() => {
	server.use(setupAuthzAdmin());
});

afterEach(() => {
	server.resetHandlers();
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

			await expect(
				screen.findByTestId('feature-gate-error-banner'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows error when license is invalid', async () => {
			renderCreatePage({ activeLicense: invalidLicense });

			await expect(
				screen.findByTestId('feature-gate-error-banner'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows Create Role title when feature disabled in create mode', async () => {
			renderCreatePage({ activeLicense: invalidLicense });

			await expect(screen.findByText('Create Role')).resolves.toBeInTheDocument();
		});

		it('shows back button when feature disabled', async () => {
			renderCreatePage({ activeLicense: invalidLicense });

			await expect(
				screen.findByTestId('cancel-button'),
			).resolves.toBeInTheDocument();
		});

		it('back button is enabled when feature disabled', async () => {
			renderCreatePage({ activeLicense: invalidLicense });

			const cancelButton = await screen.findByTestId('cancel-button');
			expect(cancelButton).not.toBeDisabled();
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

			await expect(
				screen.findByTestId('feature-gate-error-banner'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows error when license is invalid', async () => {
			renderEditPage(ROLE_ID, ROLE_NAME, { activeLicense: invalidLicense });

			await expect(
				screen.findByTestId('feature-gate-error-banner'),
			).resolves.toBeInTheDocument();
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
