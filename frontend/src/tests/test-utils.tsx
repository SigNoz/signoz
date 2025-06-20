/* eslint-disable sonarjs/no-duplicate-string */
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { FeatureKeys } from 'constants/features';
import { ORG_PREFERENCES } from 'constants/orgPreferences';
import ROUTES from 'constants/routes';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import { AppContext } from 'providers/App/App';
import { IAppContext } from 'providers/App/types';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import TimezoneProvider from 'providers/Timezone';
import React, { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import store from 'store';
import {
	LicenseEvent,
	LicensePlatform,
	LicenseState,
	LicenseStatus,
} from 'types/api/licensesV3/getActive';
import { ROLES } from 'types/roles';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(new Date('2023-10-20'));
});

afterEach(() => {
	queryClient.clear();
	jest.useRealTimers();
});

const mockStore = configureStore([thunk]);
const mockStored = (role?: string): any =>
	mockStore({
		...store.getState(),
		app: {
			...store.getState().app,
			role, // Use the role provided
			user: {
				userId: '6f532456-8cc0-4514-a93b-aed665c32b47',
				email: 'test@signoz.io',
				name: 'TestUser',
				profilePictureURL: '',
				accessJwt: '',
				refreshJwt: '',
			},
			isLoggedIn: true,
			org: [
				{
					createdAt: 0,
					hasOptedUpdates: false,
					id: 'xyz',
					isAnonymous: false,
					name: 'Test Inc. - India',
				},
			],
		},
	});

jest.mock('react-i18next', () => ({
	useTranslation: (): {
		t: (str: string) => string;
		i18n: {
			changeLanguage: () => Promise<void>;
		};
	} => ({
		t: (str: string): string => str,
		i18n: {
			changeLanguage: (): Promise<void> => new Promise(() => {}),
		},
	}),
}));

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.TRACES_EXPLORER}/`,
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('react-router-dom-v5-compat', () => ({
	...jest.requireActual('react-router-dom-v5-compat'),
	useNavigationType: (): any => 'PUSH',
}));

export function getAppContextMock(
	role: string,
	appContextOverrides?: Partial<IAppContext>,
): IAppContext {
	return {
		activeLicense: {
			key: 'test-key',
			event_queue: {
				created_at: '0',
				event: LicenseEvent.NO_EVENT,
				scheduled_at: '0',
				status: '',
				updated_at: '0',
			},
			state: LicenseState.ACTIVE,
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
		},
		trialInfo: {
			trialStart: -1,
			trialEnd: -1,
			onTrial: false,
			workSpaceBlock: false,
			trialConvertedToSubscription: false,
			gracePeriodEnd: -1,
		},
		isFetchingActiveLicense: false,
		activeLicenseFetchError: null,
		changelog: null,
		user: {
			accessJwt: 'some-token',
			refreshJwt: 'some-refresh-token',
			id: 'some-user-id',
			email: 'does-not-matter@signoz.io',
			displayName: 'John Doe',
			createdAt: 1732544623,
			organization: 'Nightswatch',
			orgId: 'does-not-matter-id',
			role: role as ROLES,
		},
		org: [
			{
				createdAt: 0,
				id: 'does-not-matter-id',
				displayName: 'Pentagon',
			},
		],
		isFetchingUser: false,
		userFetchError: null,
		featureFlags: [
			{
				name: FeatureKeys.SSO,
				active: true,
				usage: 0,
				usage_limit: -1,
				route: '',
			},
			{
				name: FeatureKeys.USE_SPAN_METRICS,
				active: false,
				usage: 0,
				usage_limit: -1,
				route: '',
			},
			{
				name: FeatureKeys.GATEWAY,
				active: true,
				usage: 0,
				usage_limit: -1,
				route: '',
			},
			{
				name: FeatureKeys.PREMIUM_SUPPORT,
				active: true,
				usage: 0,
				usage_limit: -1,
				route: '',
			},
			{
				name: FeatureKeys.ANOMALY_DETECTION,
				active: true,
				usage: 0,
				usage_limit: -1,
				route: '',
			},
			{
				name: FeatureKeys.ONBOARDING,
				active: true,
				usage: 0,
				usage_limit: -1,
				route: '',
			},
			{
				name: FeatureKeys.CHAT_SUPPORT,
				active: true,
				usage: 0,
				usage_limit: -1,
				route: '',
			},
		],
		isFetchingFeatureFlags: false,
		featureFlagsFetchError: null,
		orgPreferences: [
			{
				name: ORG_PREFERENCES.ORG_ONBOARDING,
				description: 'Organisation Onboarding',
				valueType: 'boolean',
				defaultValue: false,
				allowedValues: ['true', 'false'],
				allowedScopes: ['org'],
				value: false,
			},
		],
		userPreferences: [],
		updateUserPreferenceInContext: jest.fn(),
		isFetchingOrgPreferences: false,
		orgPreferencesFetchError: null,
		isLoggedIn: true,
		updateUser: jest.fn(),
		updateOrg: jest.fn(),
		updateOrgPreferences: jest.fn(),
		activeLicenseRefetch: jest.fn(),
		updateChangelog: jest.fn(),
		versionData: {
			version: '1.0.0',
			ee: 'Y',
			setupCompleted: true,
		},
		...appContextOverrides,
	};
}

export function AllTheProviders({
	children,
	role, // Accept the role as a prop
	appContextOverrides,
}: {
	children: React.ReactNode;
	role: string; // Define the role prop
	appContextOverrides: Partial<IAppContext>;
}): ReactElement {
	return (
		<QueryClientProvider client={queryClient}>
			<Provider store={mockStored(role)}>
				<AppContext.Provider value={getAppContextMock(role, appContextOverrides)}>
					<ResourceProvider>
						<ErrorModalProvider>
							<BrowserRouter>
								<TimezoneProvider>
									<QueryBuilderProvider>{children}</QueryBuilderProvider>
								</TimezoneProvider>
							</BrowserRouter>
						</ErrorModalProvider>
					</ResourceProvider>
				</AppContext.Provider>
			</Provider>
		</QueryClientProvider>
	);
}

const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>,
	role = 'ADMIN', // Set a default role
	appContextOverrides?: Partial<IAppContext>,
): RenderResult =>
	render(ui, {
		wrapper: () => (
			<AllTheProviders role={role} appContextOverrides={appContextOverrides || {}}>
				{ui}
			</AllTheProviders>
		),
		...options,
	});

export * from '@testing-library/react';
export { customRender as render };
