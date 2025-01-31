import getLocalStorage from 'api/browser/localstorage/get';
import { FeatureKeys } from 'constants/features';
import { SKIP_ONBOARDING } from 'constants/onboarding';

export const isOnboardingSkipped = (): boolean =>
	getLocalStorage(SKIP_ONBOARDING) === 'true';

export function extractDomain(email: string): string {
	const emailParts = email.split('@');
	if (emailParts.length !== 2) {
		return email;
	}
	return emailParts[1];
}

export const isCloudUser = (): boolean => {
	const { hostname } = window.location;

	return hostname?.endsWith('signoz.cloud');
};

export const isEECloudUser = (): boolean => {
	const { hostname } = window.location;

	return hostname?.endsWith('signoz.io');
};

export const checkVersionState = (
	currentVersion: string,
	latestVersion: string,
): boolean => {
	const versionCore = currentVersion?.split('-')[0];
	return versionCore === latestVersion;
};

// list of forbidden tags to remove in dompurify
export const FORBID_DOM_PURIFY_TAGS = ['img', 'form'];

export const isFeatureKeys = (key: string): key is keyof typeof FeatureKeys =>
	Object.keys(FeatureKeys).includes(key);
