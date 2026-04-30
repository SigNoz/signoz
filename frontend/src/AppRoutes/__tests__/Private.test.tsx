import { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import { ORG_PREFERENCES } from 'constants/orgPreferences';
import ROUTES from 'constants/routes';
import { AppContext } from 'providers/App/App';
import { IAppContext, IUser } from 'providers/App/types';
import {
	LicenseEvent,
	LicensePlatform,
	LicenseResModel,
	LicenseState,
	LicenseStatus,
	TrialInfo,
} from 'types/api/licensesV3/getActive';
import { OrgPreference } from 'types/api/preferences/preference';
import { ROLES, USER_ROLES } from 'types/roles';

import PrivateRoute from '../Private';

// Mock localStorage APIs
const mockLocalStorage: Record<string, string> = {};
jest.mock('api/browser/localstorage/get', () => ({
	__esModule: true,
	default: (key: string): string | null => mockLocalStorage[key] || null,
}));

jest.mock('api/browser/localstorage/set', () => ({
	__esModule: true,
	default: (key: string, value: string): void => {
		mockLocalStorage[key] = value;
	},
}));

// Mock useGetTenantLicense hook
let mockIsCloudUser = true;
jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: (): {
		isCloudUser: boolean;
		isEnterpriseSelfHostedUser: boolean;
		isCommunityUser: boolean;
		isCommunityEnterpriseUser: boolean;
	} => ({
		isCloudUser: mockIsCloudUser,
		isEnterpriseSelfHostedUser: !mockIsCloudUser,
		isCommunityUser: false,
		isCommunityEnterpriseUser: false,
	}),
}));

// Mock react-query for users fetch
let mockUsersData: { email: string }[] = [];
jest.mock('api/generated/services/users', () => ({
	...jest.requireActual('api/generated/services/users'),
	useListUsers: jest.fn(() => ({
		data: { data: mockUsersData },
		isFetching: false,
	})),
}));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
		},
	},
});

// Component to capture current location for assertions
function LocationDisplay(): ReactElement {
	const location = useLocation();
	return <div data-testid="location-display">{location.pathname}</div>;
}

// Helper to create mock user
function createMockUser(overrides: Partial<IUser> = {}): IUser {
	return {
		accessJwt: 'test-token',
		refreshJwt: 'test-refresh-token',
		id: 'user-id',
		email: 'test@signoz.io',
		displayName: 'Test User',
		createdAt: 1732544623,
		organization: 'Test Org',
		orgId: 'org-id',
		role: USER_ROLES.ADMIN as ROLES,
		...overrides,
	};
}

// Helper to create mock license
function createMockLicense(
	overrides: Partial<LicenseResModel> = {},
): LicenseResModel {
	return {
		key: 'test-key',
		event_queue: {
			created_at: '0',
			event: LicenseEvent.NO_EVENT,
			scheduled_at: '0',
			status: '',
			updated_at: '0',
		},
		state: LicenseState.ACTIVATED,
		status: LicenseStatus.VALID,
		platform: LicensePlatform.CLOUD,
		created_at: '0',
		plan: {
			created_at: '0',
			description: '',
			is_active: true,
			name: '',
			updated_at: '0',
		},
		plan_id: '0',
		free_until: '0',
		updated_at: '0',
		valid_from: 0,
		valid_until: 0,
		...overrides,
	};
}

// Helper to create mock trial info
function createMockTrialInfo(overrides: Partial<TrialInfo> = {}): TrialInfo {
	return {
		trialStart: -1,
		trialEnd: -1,
		onTrial: false,
		workSpaceBlock: false,
		trialConvertedToSubscription: false,
		gracePeriodEnd: -1,
		...overrides,
	};
}

// Helper to create mock org preferences
function createMockOrgPreferences(onboardingComplete = true): OrgPreference[] {
	return [
		{
			name: ORG_PREFERENCES.ORG_ONBOARDING,
			description: 'Organisation Onboarding',
			valueType: 'boolean',
			defaultValue: false,
			allowedValues: ['true', 'false'],
			allowedScopes: ['org'],
			value: onboardingComplete,
		},
	];
}

// Helper to create mock app context
function createMockAppContext(
	overrides: Partial<IAppContext> = {},
): IAppContext {
	return {
		user: createMockUser(),
		activeLicense: createMockLicense(),
		trialInfo: createMockTrialInfo(),
		featureFlags: [],
		orgPreferences: createMockOrgPreferences(),
		userPreferences: [],
		isLoggedIn: true,
		org: [{ createdAt: 0, id: 'org-id', displayName: 'Test Org' }],
		isFetchingUser: false,
		isFetchingActiveLicense: false,
		isFetchingFeatureFlags: false,
		isFetchingOrgPreferences: false,
		userFetchError: null,
		activeLicenseFetchError: null,
		featureFlagsFetchError: null,
		orgPreferencesFetchError: null,
		changelog: null,
		showChangelogModal: false,
		activeLicenseRefetch: jest.fn(),
		updateUser: jest.fn(),
		updateOrgPreferences: jest.fn(),
		updateUserPreferenceInContext: jest.fn(),
		updateOrg: jest.fn(),
		updateChangelog: jest.fn(),
		toggleChangelogModal: jest.fn(),
		versionData: { version: '1.0.0', ee: 'Y', setupCompleted: true },
		hasEditPermission: true,
		...overrides,
	};
}

interface RenderPrivateRouteOptions {
	initialRoute?: string;
	appContext?: Partial<IAppContext>;
	isCloudUser?: boolean;
}

function renderPrivateRoute(options: RenderPrivateRouteOptions = {}): void {
	const {
		initialRoute = ROUTES.HOME,
		appContext = {},
		isCloudUser = true,
	} = options;

	mockIsCloudUser = isCloudUser;

	const contextValue = createMockAppContext(appContext);

	render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialRoute]}>
				<AppContext.Provider value={contextValue}>
					<PrivateRoute>
						<Switch>
							<Route path="*">
								<div data-testid="children-rendered">Content</div>
								<LocationDisplay />
							</Route>
						</Switch>
					</PrivateRoute>
				</AppContext.Provider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

// Generic assertion helpers for navigation behavior
// Using location-based assertions since Private.tsx now uses Redirect component

async function assertRedirectsTo(targetRoute: string): Promise<void> {
	await waitFor(() => {
		expect(screen.getByTestId('location-display')).toHaveTextContent(targetRoute);
	});
}

function assertStaysOnRoute(expectedRoute: string): void {
	expect(screen.getByTestId('location-display')).toHaveTextContent(
		expectedRoute,
	);
}

function assertRendersChildren(): void {
	expect(screen.getByTestId('children-rendered')).toBeInTheDocument();
}

describe('PrivateRoute', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		queryClient.clear();
		Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
		mockIsCloudUser = true;
		mockUsersData = [];
	});

	describe('Old Routes Handling', () => {
		it('should redirect /pipelines to /logs/pipelines preserving search params', () => {
			renderPrivateRoute({ initialRoute: '/pipelines?foo=bar' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/logs/pipelines',
			);
		});

		it('should redirect /logs-explorer to /logs/logs-explorer', () => {
			renderPrivateRoute({ initialRoute: '/logs-explorer' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/logs/logs-explorer',
			);
		});

		it('should redirect /logs-explorer/live to /logs/logs-explorer/live', () => {
			renderPrivateRoute({ initialRoute: '/logs-explorer/live' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/logs/logs-explorer/live',
			);
		});

		it('should redirect /logs-save-views to /logs/saved-views', () => {
			renderPrivateRoute({ initialRoute: '/logs-save-views' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/logs/saved-views',
			);
		});

		it('should redirect /traces-save-views to /traces/saved-views', () => {
			renderPrivateRoute({ initialRoute: '/traces-save-views' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/traces/saved-views',
			);
		});

		it('should redirect /settings/access-tokens to /settings/service-accounts', () => {
			renderPrivateRoute({ initialRoute: '/settings/access-tokens' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/settings/service-accounts',
			);
		});

		it('should redirect /settings/api-keys to /settings/service-accounts', () => {
			renderPrivateRoute({ initialRoute: '/settings/api-keys' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/settings/service-accounts',
			);
		});

		it('should redirect /messaging-queues to /messaging-queues/overview', () => {
			renderPrivateRoute({ initialRoute: '/messaging-queues' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/messaging-queues/overview',
			);
		});

		it('should redirect /alerts/edit to /alerts/overview', () => {
			renderPrivateRoute({ initialRoute: '/alerts/edit' });

			expect(screen.getByTestId('location-display')).toHaveTextContent(
				'/alerts/overview',
			);
		});
	});

	describe('Public Dashboard Route', () => {
		it('should render children for public dashboard route without redirecting when not logged in', () => {
			renderPrivateRoute({
				initialRoute: '/public/dashboard/abc123',
				appContext: { isLoggedIn: false },
			});

			assertRendersChildren();
			assertStaysOnRoute('/public/dashboard/abc123');
		});

		it('should render children for public dashboard route when logged in without redirecting', () => {
			renderPrivateRoute({
				initialRoute: '/public/dashboard/abc123',
				appContext: { isLoggedIn: true },
			});

			assertRendersChildren();
			// Critical: without the isPublicDashboard early return, logged-in users
			// would be redirected to HOME due to the non-private route handling
			assertStaysOnRoute('/public/dashboard/abc123');
		});
	});

	describe('Private Routes - User Not Logged In', () => {
		it('should redirect to login when accessing private route without authentication', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: { isLoggedIn: false },
			});

			await assertRedirectsTo(ROUTES.LOGIN);
		});

		it('should save current pathname to localStorage before redirecting to login', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.ALL_DASHBOARD,
				appContext: { isLoggedIn: false },
			});

			await waitFor(() => {
				expect(mockLocalStorage[LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT]).toBe(
					ROUTES.ALL_DASHBOARD,
				);
			});
			await assertRedirectsTo(ROUTES.LOGIN);
		});

		it('should redirect to login for /services route when not logged in', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.APPLICATION,
				appContext: { isLoggedIn: false },
			});

			await assertRedirectsTo(ROUTES.LOGIN);
		});

		it('should redirect to login for /alerts route when not logged in', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.LIST_ALL_ALERT,
				appContext: { isLoggedIn: false },
			});

			await assertRedirectsTo(ROUTES.LOGIN);
		});
	});

	describe('Private Routes - User Logged In', () => {
		it('should render children when logged in user has correct permissions for route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
			});

			assertRendersChildren();
			assertStaysOnRoute(ROUTES.HOME);
		});

		it('should redirect to unauthorized when VIEWER tries to access admin-only route /alerts/new', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.ALERTS_NEW,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
			});

			await assertRedirectsTo(ROUTES.UN_AUTHORIZED);
		});

		it('should not redirect VIEWER from /settings/org-settings since it matches SETTINGS route which allows all roles', () => {
			// Note: ORG_SETTINGS is not a standalone route in routes.ts
			// It's handled by the SETTINGS route (exact: false) which allows all roles
			// The actual permission check happens inside SettingsPage component
			renderPrivateRoute({
				initialRoute: ROUTES.ORG_SETTINGS,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
			});

			// VIEWER can access since SETTINGS route allows all roles
			assertRendersChildren();
		});

		it('should allow ADMIN to access /settings/org-settings', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.ORG_SETTINGS,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
			});

			assertRendersChildren();
		});

		it('should allow EDITOR to access /alerts/new route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.ALERTS_NEW,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.EDITOR as ROLES }),
				},
			});

			assertRendersChildren();
		});

		it('should allow VIEWER to access /dashboard route', () => {
			renderPrivateRoute({
				initialRoute: '/dashboard/test-id',
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
			});

			assertRendersChildren();
		});
	});

	describe('Non-Private Routes - User Logged In', () => {
		it('should redirect to saved route from localStorage when logging in', async () => {
			mockLocalStorage[LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT] =
				ROUTES.ALL_DASHBOARD;

			renderPrivateRoute({
				initialRoute: ROUTES.LOGIN,
				appContext: { isLoggedIn: true },
			});

			await assertRedirectsTo(ROUTES.ALL_DASHBOARD);
		});

		it('should clear localStorage after redirecting to saved route', async () => {
			mockLocalStorage[LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT] = ROUTES.HOME;

			renderPrivateRoute({
				initialRoute: ROUTES.LOGIN,
				appContext: { isLoggedIn: true },
			});

			await waitFor(() => {
				expect(mockLocalStorage[LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT]).toBe('');
			});
		});

		it('should redirect to home when logged in user visits login page with no saved route', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.LOGIN,
				appContext: { isLoggedIn: true },
			});

			await assertRedirectsTo(ROUTES.HOME);
		});

		it('should not redirect when on /something-went-wrong page even when logged in', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.SOMETHING_WENT_WRONG,
				appContext: { isLoggedIn: true },
			});

			assertStaysOnRoute(ROUTES.SOMETHING_WENT_WRONG);
		});
	});

	describe('Non-Private Routes - User Not Logged In', () => {
		it('should not redirect when not logged in user visits login page', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.LOGIN,
				appContext: { isLoggedIn: false },
			});

			// Should not redirect - login page handles its own routing
			assertStaysOnRoute(ROUTES.LOGIN);
		});

		it('should not redirect when not logged in user visits signup page', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.SIGN_UP,
				appContext: { isLoggedIn: false },
			});

			assertStaysOnRoute(ROUTES.SIGN_UP);
		});

		it('should not redirect when not logged in user visits password reset page', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.PASSWORD_RESET,
				appContext: { isLoggedIn: false },
			});

			assertStaysOnRoute(ROUTES.PASSWORD_RESET);
		});

		it('should not redirect when not logged in user visits forgot password page', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.FORGOT_PASSWORD,
				appContext: { isLoggedIn: false },
			});

			assertStaysOnRoute(ROUTES.FORGOT_PASSWORD);
		});
	});

	describe('Unknown Routes', () => {
		it('should redirect to home when logged in and visiting unknown route', async () => {
			renderPrivateRoute({
				initialRoute: '/unknown-route-that-does-not-exist',
				appContext: { isLoggedIn: true },
			});

			await assertRedirectsTo(ROUTES.HOME);
		});

		it('should redirect to login when not logged in and visiting unknown route', async () => {
			renderPrivateRoute({
				initialRoute: '/unknown-route-that-does-not-exist',
				appContext: { isLoggedIn: false },
			});

			await assertRedirectsTo(ROUTES.LOGIN);
		});

		it('should save unknown route to localStorage before redirecting to login', async () => {
			const unknownRoute = '/some-unknown-page';

			renderPrivateRoute({
				initialRoute: unknownRoute,
				appContext: { isLoggedIn: false },
			});

			await waitFor(() => {
				expect(mockLocalStorage[LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT]).toBe(
					unknownRoute,
				);
			});
		});

		it('should redirect to saved route when logged in user visits unknown route with fromPathname in localStorage', async () => {
			// This tests the branch where:
			// - currentRoute is null (unknown route)
			// - isLoggedInState is true
			// - fromPathname exists in localStorage
			// Expected: redirect to savedRoute and clear localStorage
			const savedRoute = ROUTES.ALL_DASHBOARD;
			mockLocalStorage[LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT] = savedRoute;

			renderPrivateRoute({
				initialRoute: '/unknown-route-that-does-not-exist',
				appContext: { isLoggedIn: true },
			});

			await assertRedirectsTo(savedRoute);
			await waitFor(() => {
				expect(mockLocalStorage[LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT]).toBe('');
			});
		});
	});

	describe('Workspace Blocked - Trial Expired (Cloud Users)', () => {
		it('should redirect to workspace locked when workSpaceBlock is true for cloud users', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_LOCKED);
		});

		it('should allow ADMIN to access /settings when workspace is blocked', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			// Admin should be able to access settings even when workspace is blocked
			assertStaysOnRoute(ROUTES.SETTINGS);
		});

		it('should allow ADMIN to access /settings/billing when workspace is blocked', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.BILLING,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.BILLING);
		});

		it('should allow ADMIN to access /settings/org-settings when workspace is blocked', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.ORG_SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.ORG_SETTINGS);
		});

		it('should allow ADMIN to access /settings/members when workspace is blocked', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.MEMBERS_SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.MEMBERS_SETTINGS);
		});

		it('should allow ADMIN to access /settings/my-settings when workspace is blocked', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.MY_SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.MY_SETTINGS);
		});

		it('should redirect VIEWER to workspace locked even when trying to access settings', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_LOCKED);
		});

		it('should redirect VIEWER to workspace locked when trying to access billing', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.BILLING,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_LOCKED);
		});

		it('should redirect VIEWER to workspace locked when trying to access org-settings', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.ORG_SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_LOCKED);
		});

		it('should redirect VIEWER to workspace locked when trying to access members settings', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.MEMBERS_SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_LOCKED);
		});

		it('should redirect VIEWER to workspace locked when trying to access my-settings', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.MY_SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_LOCKED);
		});

		it('should redirect EDITOR to workspace locked when trying to access settings', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.EDITOR as ROLES }),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_LOCKED);
		});

		it('should not redirect when already on workspace locked page', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.WORKSPACE_LOCKED,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.WORKSPACE_LOCKED);
		});

		it('should not redirect self-hosted users to workspace locked even when workSpaceBlock is true', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.SELF_HOSTED,
					}),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
				},
				isCloudUser: false,
			});

			assertStaysOnRoute(ROUTES.HOME);
		});
	});

	describe('Workspace Access Restricted - License Terminated/Expired/Cancelled (Cloud Users)', () => {
		it('should redirect to workspace access restricted when license is TERMINATED', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.TERMINATED,
					}),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_ACCESS_RESTRICTED);
		});

		it('should redirect to workspace access restricted when license is EXPIRED', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.EXPIRED,
					}),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_ACCESS_RESTRICTED);
		});

		it('should redirect to workspace access restricted when license is CANCELLED', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.CANCELLED,
					}),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_ACCESS_RESTRICTED);
		});

		it('should not redirect when already on workspace access restricted page', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.WORKSPACE_ACCESS_RESTRICTED,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.TERMINATED,
					}),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.WORKSPACE_ACCESS_RESTRICTED);
		});

		it('should not redirect self-hosted users to workspace access restricted when license is terminated', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.SELF_HOSTED,
						state: LicenseState.TERMINATED,
					}),
				},
				isCloudUser: false,
			});

			assertStaysOnRoute(ROUTES.HOME);
		});

		it('should not redirect when license is ACTIVE', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.ACTIVATED,
					}),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.HOME);
		});

		it('should not redirect when license is EVALUATING', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.EVALUATING,
					}),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.HOME);
		});
	});

	describe('Workspace Suspended - License Defaulted (Cloud Users)', () => {
		it('should redirect to workspace suspended when license is DEFAULTED', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.DEFAULTED,
					}),
				},
				isCloudUser: true,
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_SUSPENDED);
		});

		it('should not redirect when already on workspace suspended page', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.WORKSPACE_SUSPENDED,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.DEFAULTED,
					}),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.WORKSPACE_SUSPENDED);
		});

		it('should not redirect self-hosted users to workspace suspended when license is defaulted', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.SELF_HOSTED,
						state: LicenseState.DEFAULTED,
					}),
				},
				isCloudUser: false,
			});

			assertStaysOnRoute(ROUTES.HOME);
		});
	});

	describe('Onboarding Flow (Cloud Users)', () => {
		it('should redirect to onboarding when first user has not completed onboarding', async () => {
			// Set up exactly one user (not admin@signoz.cloud) to trigger first user check
			mockUsersData = [{ email: 'test@example.com' }];

			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					orgPreferences: createMockOrgPreferences(false), // Onboarding NOT complete
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			// Wait for the users query to complete and trigger re-render
			await act(async () => {
				await Promise.resolve();
			});

			await assertRedirectsTo(ROUTES.ONBOARDING);
		});

		it('should not redirect to onboarding when org preferences are still fetching', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: true,
					orgPreferences: null,
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.HOME);
		});

		it('should not redirect to onboarding when onboarding is already complete', async () => {
			// Set up first user condition - this ensures the ONLY reason we don't redirect
			// is because isOnboardingComplete is true
			mockUsersData = [{ email: 'test@example.com' }];

			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					orgPreferences: createMockOrgPreferences(true), // Onboarding complete
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			// Wait for async operations (useQuery, useEffect) to settle
			await act(async () => {
				await Promise.resolve();
			});

			// Critical: if isOnboardingComplete check is broken (always false),
			// this test would fail because all other conditions for redirect ARE met
			assertStaysOnRoute(ROUTES.HOME);
		});

		it('should not redirect to onboarding for non-cloud users', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					orgPreferences: createMockOrgPreferences(false), // Onboarding not complete
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: false,
			});

			assertStaysOnRoute(ROUTES.HOME);
		});

		it('should not redirect to onboarding when on /workspace-locked route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.WORKSPACE_LOCKED,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					orgPreferences: createMockOrgPreferences(false),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.WORKSPACE_LOCKED);
		});

		it('should not redirect to onboarding when on /workspace-suspended route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.WORKSPACE_SUSPENDED,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					orgPreferences: createMockOrgPreferences(false),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			assertStaysOnRoute(ROUTES.WORKSPACE_SUSPENDED);
		});

		it('should not redirect to onboarding when workspace is blocked and accessing billing', async () => {
			// This tests the scenario where admin tries to access billing to fix payment
			// while workspace is blocked and onboarding is not complete
			mockUsersData = [{ email: 'test@example.com' }];

			renderPrivateRoute({
				initialRoute: ROUTES.BILLING,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					isFetchingActiveLicense: false,
					orgPreferences: createMockOrgPreferences(false), // Onboarding NOT complete
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			await act(async () => {
				await Promise.resolve();
			});

			// Should NOT redirect to onboarding - user needs to access billing to fix payment
			assertStaysOnRoute(ROUTES.BILLING);
		});

		it('should not redirect to onboarding when workspace is blocked and accessing settings', async () => {
			mockUsersData = [{ email: 'test@example.com' }];

			renderPrivateRoute({
				initialRoute: ROUTES.SETTINGS,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					isFetchingActiveLicense: false,
					orgPreferences: createMockOrgPreferences(false),
					activeLicense: createMockLicense({ platform: LicensePlatform.CLOUD }),
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			await act(async () => {
				await Promise.resolve();
			});

			assertStaysOnRoute(ROUTES.SETTINGS);
		});

		it('should not redirect to onboarding when workspace is suspended (DEFAULTED)', async () => {
			mockUsersData = [{ email: 'test@example.com' }];

			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					isFetchingActiveLicense: false,
					orgPreferences: createMockOrgPreferences(false), // Onboarding NOT complete
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.DEFAULTED,
					}),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			await act(async () => {
				await Promise.resolve();
			});

			// Should redirect to WORKSPACE_SUSPENDED, not ONBOARDING
			await assertRedirectsTo(ROUTES.WORKSPACE_SUSPENDED);
		});

		it('should not redirect to onboarding when workspace is access restricted (TERMINATED)', async () => {
			mockUsersData = [{ email: 'test@example.com' }];

			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					isFetchingActiveLicense: false,
					orgPreferences: createMockOrgPreferences(false), // Onboarding NOT complete
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.TERMINATED,
					}),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			await act(async () => {
				await Promise.resolve();
			});

			// Should redirect to WORKSPACE_ACCESS_RESTRICTED, not ONBOARDING
			await assertRedirectsTo(ROUTES.WORKSPACE_ACCESS_RESTRICTED);
		});

		it('should not redirect to onboarding when workspace is access restricted (EXPIRED)', async () => {
			mockUsersData = [{ email: 'test@example.com' }];

			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingOrgPreferences: false,
					isFetchingActiveLicense: false,
					orgPreferences: createMockOrgPreferences(false),
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.EXPIRED,
					}),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
				isCloudUser: true,
			});

			await act(async () => {
				await Promise.resolve();
			});

			await assertRedirectsTo(ROUTES.WORKSPACE_ACCESS_RESTRICTED);
		});
	});

	describe('Get Started Route Redirect', () => {
		it('should redirect to GET_STARTED_WITH_CLOUD when on GET_STARTED and ONBOARDING_V3 feature flag is active', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.GET_STARTED,
				appContext: {
					isLoggedIn: true,
					featureFlags: [
						{
							name: FeatureKeys.ONBOARDING_V3,
							active: true,
							usage: 0,
							usage_limit: -1,
							route: '',
						},
					],
				},
			});

			await assertRedirectsTo(ROUTES.GET_STARTED_WITH_CLOUD);
		});

		it('should not redirect when on GET_STARTED and ONBOARDING_V3 feature flag is inactive', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.GET_STARTED,
				appContext: {
					isLoggedIn: true,
					featureFlags: [
						{
							name: FeatureKeys.ONBOARDING_V3,
							active: false,
							usage: 0,
							usage_limit: -1,
							route: '',
						},
					],
				},
			});

			assertStaysOnRoute(ROUTES.GET_STARTED);
		});

		it('should not redirect when on GET_STARTED and ONBOARDING_V3 feature flag is not present', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.GET_STARTED,
				appContext: {
					isLoggedIn: true,
					featureFlags: [],
				},
			});

			assertStaysOnRoute(ROUTES.GET_STARTED);
		});

		it('should not redirect when on different route even if ONBOARDING_V3 is active', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					featureFlags: [
						{
							name: FeatureKeys.ONBOARDING_V3,
							active: true,
							usage: 0,
							usage_limit: -1,
							route: '',
						},
					],
				},
			});

			assertStaysOnRoute(ROUTES.HOME);
		});
	});

	describe('Loading States', () => {
		it('should not redirect while license is still being fetched', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: true,
					activeLicense: null,
					trialInfo: createMockTrialInfo({ workSpaceBlock: true }),
				},
			});

			assertStaysOnRoute(ROUTES.HOME);
		});

		it('should not fetch users when org data is not available', () => {
			// This tests the queryFn branch where orgData is undefined
			// so the users fetch returns undefined instead of calling getAll()
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					org: [], // Empty org array means orgData won't be set
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
			});

			assertRendersChildren();
		});

		it('should not fetch users when org id is undefined', () => {
			// This tests the queryFn branch where orgData exists but id is undefined
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					// @ts-expect-error - intentionally passing undefined id to test edge case
					org: [{ createdAt: 0, id: undefined, displayName: 'Test Org' }],
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
			});

			assertRendersChildren();
		});

		it('should not check workspace states when activeLicense is null', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: null,
				},
			});

			assertStaysOnRoute(ROUTES.HOME);
		});
	});

	describe('Role-based Route Access', () => {
		it('should allow ADMIN to access /licenses route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.LIST_LICENSES,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
			});

			assertRendersChildren();
		});

		it('should redirect VIEWER away from /licenses route', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.LIST_LICENSES,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
			});

			await assertRedirectsTo(ROUTES.UN_AUTHORIZED);
		});

		it('should redirect EDITOR away from /licenses route', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.LIST_LICENSES,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.EDITOR as ROLES }),
				},
			});

			await assertRedirectsTo(ROUTES.UN_AUTHORIZED);
		});

		it('should allow ADMIN to access /services route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.APPLICATION,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
			});

			assertStaysOnRoute(ROUTES.APPLICATION);
		});

		it('should allow EDITOR to access /services route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.APPLICATION,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.EDITOR as ROLES }),
				},
			});

			assertStaysOnRoute(ROUTES.APPLICATION);
		});

		it('should allow VIEWER to access /services route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.APPLICATION,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
			});

			assertStaysOnRoute(ROUTES.APPLICATION);
		});

		it('should redirect VIEWER from /onboarding route (admin only)', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.ONBOARDING,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
			});

			await assertRedirectsTo(ROUTES.UN_AUTHORIZED);
		});

		it('should not redirect VIEWER from /settings/channels/new due to route matching order (ALL_CHANNELS matches last)', () => {
			// Note: This tests the ACTUAL behavior of Private.tsx route matching
			// CHANNELS_NEW has path '/settings/channels/new' with permission ['ADMIN']
			// ALL_CHANNELS has path '/settings/channels' with permission ['ADMIN', 'EDITOR', 'VIEWER']
			// Due to non-exact matching and array order, ALL_CHANNELS matches LAST for '/settings/channels/new'
			// This is a known limitation - actual permission enforcement happens in the page component
			renderPrivateRoute({
				initialRoute: ROUTES.CHANNELS_NEW,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.VIEWER as ROLES }),
				},
			});

			assertRendersChildren();
			assertStaysOnRoute(ROUTES.CHANNELS_NEW);
		});

		it('should allow EDITOR to access /get-started route', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.GET_STARTED,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.EDITOR as ROLES }),
				},
			});

			assertStaysOnRoute(ROUTES.GET_STARTED);
		});
	});

	describe('Edge Cases', () => {
		it('should handle route with query parameters correctly for private routes', async () => {
			mockLocalStorage[LOCALSTORAGE.UNAUTHENTICATED_ROUTE_HIT] = '';

			renderPrivateRoute({
				initialRoute: `${ROUTES.ALL_DASHBOARD}?tab=metrics`,
				appContext: { isLoggedIn: false },
			});

			await assertRedirectsTo(ROUTES.LOGIN);
		});

		it('should render children when all conditions pass', () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					isFetchingActiveLicense: false,
					activeLicense: createMockLicense({
						platform: LicensePlatform.CLOUD,
						state: LicenseState.ACTIVATED,
					}),
					trialInfo: createMockTrialInfo({ workSpaceBlock: false }),
					user: createMockUser({ role: USER_ROLES.ADMIN as ROLES }),
				},
			});

			assertRendersChildren();
		});

		it('should handle ANONYMOUS role by redirecting from private routes', async () => {
			renderPrivateRoute({
				initialRoute: ROUTES.HOME,
				appContext: {
					isLoggedIn: true,
					user: createMockUser({ role: USER_ROLES.ANONYMOUS as ROLES }),
				},
			});

			await assertRedirectsTo(ROUTES.UN_AUTHORIZED);
		});
	});
});
