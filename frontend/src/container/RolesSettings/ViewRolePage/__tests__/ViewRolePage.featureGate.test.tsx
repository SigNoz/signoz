import * as roleApi from 'api/generated/services/role';
import { FeatureKeys } from 'constants/features';
import * as useAuthZModule from 'hooks/useAuthZ/useAuthZ';
import { defaultFeatureFlags, render, screen } from 'tests/test-utils';
import { invalidLicense, mockUseAuthZGrantAll } from 'tests/authz-test-utils';

import ViewRolePage from '../ViewRolePage';

import {
	buildViewRoleRoute,
	CUSTOM_ROLE_ID,
	CUSTOM_ROLE_NAME,
} from './testUtils';

describe('ViewRolePage - Feature Gate', () => {
	beforeEach(() => {
		jest
			.spyOn(useAuthZModule, 'useAuthZ')
			.mockImplementation(mockUseAuthZGrantAll);

		jest.spyOn(roleApi, 'useGetRole').mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
			error: null,
		} as ReturnType<typeof roleApi.useGetRole>);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('feature disabled', () => {
		it('shows error when fine-grained authz flag is inactive', async () => {
			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				appContextOverrides: {
					featureFlags: defaultFeatureFlags.map((f) =>
						f.name === FeatureKeys.USE_FINE_GRAINED_AUTHZ
							? { ...f, active: false }
							: f,
					),
				},
			});

			expect(screen.getByTestId('feature-gate-error-banner')).toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows error when license is invalid', async () => {
			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				appContextOverrides: { activeLicense: invalidLicense },
			});

			expect(screen.getByTestId('feature-gate-error-banner')).toBeInTheDocument();
			await expect(
				screen.findByText(/Custom roles feature is not available/i),
			).resolves.toBeInTheDocument();
		});

		it('shows back button when feature disabled', () => {
			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				appContextOverrides: { activeLicense: invalidLicense },
			});

			expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
		});

		it('back button is enabled when feature disabled', () => {
			render(<ViewRolePage />, undefined, {
				initialRoute: buildViewRoleRoute(CUSTOM_ROLE_ID, CUSTOM_ROLE_NAME),
				appContextOverrides: { activeLicense: invalidLicense },
			});

			expect(screen.getByTestId('cancel-button')).not.toBeDisabled();
		});
	});
});
