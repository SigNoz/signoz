import * as roleApi from 'api/generated/services/role';
import { server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';
import {
	invalidLicense,
	setupAuthzAdmin,
} from 'lib/authz/utils/authz-test-utils';

import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
} from './testUtils';

describe('ViewRolePage - Feature Gate', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());

		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	describe('feature disabled', () => {
		it('shows error when license is invalid', async () => {
			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				appContextOverrides: { activeLicense: invalidLicense },
			});

			await expect(
				screen.findByTestId('feature-gate-error-banner'),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows back button when feature disabled', async () => {
			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				appContextOverrides: { activeLicense: invalidLicense },
			});

			await expect(
				screen.findByTestId('cancel-button'),
			).resolves.toBeInTheDocument();
		});

		it('back button is enabled when feature disabled', async () => {
			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				appContextOverrides: { activeLicense: invalidLicense },
			});

			await waitFor(() => {
				expect(screen.getByTestId('cancel-button')).not.toBeDisabled();
			});
		});
	});
});
