import { renderHook } from '@testing-library/react';
import { FeatureKeys } from 'constants/features';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { ChatSupportState, useChatSupport } from 'hooks/useChatSupport';
import { useAppContext } from 'providers/App/App';

jest.mock('providers/App/App');
jest.mock('hooks/useGetTenantLicense');

const mockAppContext = useAppContext as jest.MockedFunction<
	typeof useAppContext
>;
const mockLicense = useGetTenantLicense as jest.MockedFunction<
	typeof useGetTenantLicense
>;

const flag = (name: FeatureKeys, active: boolean): Record<string, unknown> => ({
	name,
	active,
	usage: 0,
	usage_limit: -1,
	route: '',
});

function setup({
	chatSupport = true,
	premiumSupport = false,
	trialConverted = false,
	isCloudUser = true,
	isEnterpriseSelfHostedUser = false,
	isLoggedIn = true,
	pylonEnabled = true,
	isFetchingFeatureFlags = false,
	activeLicense = {} as unknown,
	trialInfo = {} as unknown,
} = {}): void {
	window.signozBootData = {
		settings: { pylon: { enabled: pylonEnabled } },
	} as never;

	mockAppContext.mockReturnValue({
		featureFlags: [
			flag(FeatureKeys.CHAT_SUPPORT, chatSupport),
			flag(FeatureKeys.PREMIUM_SUPPORT, premiumSupport),
		],
		isFetchingFeatureFlags,
		featureFlagsFetchError: null,
		trialInfo: trialInfo && { trialConvertedToSubscription: trialConverted },
		isLoggedIn,
		activeLicense,
	} as never);

	mockLicense.mockReturnValue({
		isCloudUser,
		isEnterpriseSelfHostedUser,
	} as never);
}

const state = (): ChatSupportState =>
	renderHook(() => useChatSupport()).result.current;

describe('useChatSupport', () => {
	beforeEach(() => jest.clearAllMocks());

	describe('pylon', () => {
		it('hands off to Pylon for a cloud user past trial', () => {
			setup({ trialConverted: true });

			expect(state()).toBe(ChatSupportState.Pylon);
		});

		it('hands off to Pylon for enterprise self-hosted', () => {
			setup({
				trialConverted: true,
				isCloudUser: false,
				isEnterpriseSelfHostedUser: true,
			});

			expect(state()).toBe(ChatSupportState.Pylon);
		});

		it('hands off to Pylon when premium support is on, card or not', () => {
			setup({ premiumSupport: true, trialConverted: false });

			expect(state()).toBe(ChatSupportState.Pylon);
		});

		it('offers nothing when Pylon is not configured server side', () => {
			setup({ trialConverted: true, pylonEnabled: false });

			expect(state()).toBe(ChatSupportState.Unavailable);
		});
	});

	describe('needsCard', () => {
		it('offers the card flow to a cloud user still on trial', () => {
			setup({ trialConverted: false, premiumSupport: false });

			expect(state()).toBe(ChatSupportState.NeedsCard);
		});

		it('offers nothing to a non-cloud user needing a card', () => {
			setup({
				trialConverted: false,
				isCloudUser: false,
				isEnterpriseSelfHostedUser: true,
			});

			expect(state()).toBe(ChatSupportState.Unavailable);
		});
	});

	describe('unavailable', () => {
		it('offers nothing without the chat support flag', () => {
			setup({ chatSupport: false });

			expect(state()).toBe(ChatSupportState.Unavailable);
		});

		it('offers nothing when logged out', () => {
			setup({ isLoggedIn: false });

			expect(state()).toBe(ChatSupportState.Unavailable);
		});

		it('offers nothing while the flags are still loading', () => {
			setup({ isFetchingFeatureFlags: true });

			expect(state()).toBe(ChatSupportState.Unavailable);
		});

		it('offers nothing before the licence has loaded', () => {
			setup({ activeLicense: null });

			expect(state()).toBe(ChatSupportState.Unavailable);
		});

		it('offers nothing on a tenant that is neither cloud nor enterprise', () => {
			setup({
				trialConverted: true,
				isCloudUser: false,
				isEnterpriseSelfHostedUser: false,
			});

			expect(state()).toBe(ChatSupportState.Unavailable);
		});
	});
});
