import { FeatureKeys } from 'constants/features';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useAppContext } from 'providers/App/App';
import { useMemo } from 'react';

export enum ChatSupportState {
	/** Pylon is configured for this user — hand off to the widget. */
	Pylon = 'pylon',
	/** Trial without a card — offer the Add Credit Card flow instead. */
	NeedsCard = 'needsCard',
	/** No support entry at all. */
	Unavailable = 'unavailable',
}

export function useChatSupport(): ChatSupportState {
	const {
		featureFlags,
		isFetchingFeatureFlags,
		featureFlagsFetchError,
		trialInfo,
		isLoggedIn,
		activeLicense,
	} = useAppContext();
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	return useMemo(() => {
		const isReady =
			!isFetchingFeatureFlags &&
			(featureFlags || featureFlagsFetchError) &&
			activeLicense &&
			trialInfo;
		if (!isReady || !isLoggedIn) {
			return ChatSupportState.Unavailable;
		}

		const flag = (name: FeatureKeys): boolean =>
			featureFlags?.find((f) => f.name === name)?.active || false;

		if (!flag(FeatureKeys.CHAT_SUPPORT)) {
			return ChatSupportState.Unavailable;
		}

		const needsCard =
			!flag(FeatureKeys.PREMIUM_SUPPORT) &&
			!trialInfo?.trialConvertedToSubscription;

		if (needsCard) {
			// The credit card flow is cloud-only
			return isCloudUser
				? ChatSupportState.NeedsCard
				: ChatSupportState.Unavailable;
		}

		const pylonConfigured = Boolean(
			window.signozBootData?.settings?.pylon?.enabled,
		);
		return (isCloudUser || isEnterpriseSelfHostedUser) && pylonConfigured
			? ChatSupportState.Pylon
			: ChatSupportState.Unavailable;
	}, [
		activeLicense,
		featureFlags,
		featureFlagsFetchError,
		isCloudUser,
		isEnterpriseSelfHostedUser,
		isFetchingFeatureFlags,
		isLoggedIn,
		trialInfo,
	]);
}
