import { ApiRoutingPolicy } from 'api/routingPolicies/getRoutingPolicies';
import { IAppContext, IUser } from 'providers/App/types';
import { Channels } from 'types/api/channels/getAll';

import { RoutingPolicy, UseRoutingPoliciesReturn } from '../types';

export const MOCK_ROUTING_POLICY_1: RoutingPolicy = {
	id: '1',
	name: 'Routing Policy 1',
	expression: 'expression 1',
	description: 'description 1',
	channels: ['Channel 1'],
	createdAt: '2021-01-04',
	updatedAt: undefined,
	createdBy: 'user1@signoz.io',
	updatedBy: undefined,
};

export const MOCK_ROUTING_POLICY_2: RoutingPolicy = {
	id: '2',
	name: 'Routing Policy 2',
	expression: 'expression 2',
	description: 'description 2',
	channels: ['Channel 2'],
	createdAt: '2021-01-05',
	updatedAt: '2021-01-05',
	createdBy: 'user2@signoz.io',
	updatedBy: 'user2@signoz.io',
};

export const MOCK_CHANNEL_1: Channels = {
	name: 'Channel 1',
	created_at: '2021-01-01',
	data: 'data 1',
	id: '1',
	type: 'type 1',
	updated_at: '2021-01-01',
};
export const MOCK_CHANNEL_2: Channels = {
	name: 'Channel 2',
	created_at: '2021-01-02',
	data: 'data 2',
	id: '2',
	type: 'type 2',
	updated_at: '2021-01-02',
};

export function getUseRoutingPoliciesMockData(
	overrides?: Partial<UseRoutingPoliciesReturn>,
): UseRoutingPoliciesReturn {
	return {
		selectedRoutingPolicy: MOCK_ROUTING_POLICY_1,
		routingPoliciesData: [MOCK_ROUTING_POLICY_1, MOCK_ROUTING_POLICY_2],
		isLoadingRoutingPolicies: false,
		isErrorRoutingPolicies: false,
		channels: [MOCK_CHANNEL_1, MOCK_CHANNEL_2],
		isLoadingChannels: false,
		searchTerm: '',
		setSearchTerm: jest.fn(),
		isDeleteModalOpen: false,
		handleDeleteModalOpen: jest.fn(),
		handleDeleteModalClose: jest.fn(),
		handleDeleteRoutingPolicy: jest.fn(),
		isDeletingRoutingPolicy: false,
		policyDetailsModalState: {
			mode: null,
			isOpen: false,
		},
		handlePolicyDetailsModalClose: jest.fn(),
		handlePolicyDetailsModalOpen: jest.fn(),
		handlePolicyDetailsModalAction: jest.fn(),
		isPolicyDetailsModalActionLoading: false,
		isErrorChannels: false,
		refreshChannels: jest.fn(),
		isFetchingRoutingPolicies: false,
		refetchRoutingPolicies: jest.fn(),
		...overrides,
	};
}

export function getAppContextMockState(
	overrides?: Partial<IUser>,
): IAppContext {
	return {
		user: {
			accessJwt: 'some-token',
			refreshJwt: 'some-refresh-token',
			id: 'some-user-id',
			email: 'user@signoz.io',
			displayName: 'John Doe',
			createdAt: 1732544623,
			organization: 'Nightswatch',
			orgId: 'does-not-matter-id',
			role: 'ADMIN',
			...overrides,
		},
		activeLicense: null,
		trialInfo: null,
		featureFlags: null,
		orgPreferences: null,
		userPreferences: null,
		isLoggedIn: false,
		org: null,
		isFetchingUser: false,
		isFetchingActiveLicense: false,
		isFetchingFeatureFlags: false,
		isFetchingOrgPreferences: false,
		userFetchError: undefined,
		activeLicenseFetchError: null,
		featureFlagsFetchError: undefined,
		orgPreferencesFetchError: undefined,
		changelog: null,
		showChangelogModal: false,
		activeLicenseRefetch: jest.fn(),
		updateUser: jest.fn(),
		updateOrgPreferences: jest.fn(),
		updateUserPreferenceInContext: jest.fn(),
		updateOrg: jest.fn(),
		updateChangelog: jest.fn(),
		toggleChangelogModal: jest.fn(),
		versionData: null,
		hasEditPermission: false,
	};
}

export function mockLocation(pathname: string): jest.Mock {
	return jest.fn().mockReturnValue({
		pathname,
	});
}

export function mockQueryParams(
	params: Record<string, string | null>,
): URLSearchParams {
	const realUrlQuery = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== null) {
			realUrlQuery.set(key, value);
		}
	});

	return Object.create(URLSearchParams.prototype, {
		toString: { value: (): string => realUrlQuery.toString() },
		get: { value: (key: string): string | null => realUrlQuery.get(key) },
	});
}

export function convertRoutingPolicyToApiResponse(
	routingPolicy: RoutingPolicy,
): ApiRoutingPolicy {
	return {
		id: routingPolicy.id,
		name: routingPolicy.name,
		expression: routingPolicy.expression,
		channels: routingPolicy.channels,
		description: routingPolicy.description || '',
		createdAt: routingPolicy.createdAt || '',
		updatedAt: routingPolicy.updatedAt || '',
		createdBy: routingPolicy.createdBy || '',
		updatedBy: routingPolicy.updatedBy || '',
	};
}
