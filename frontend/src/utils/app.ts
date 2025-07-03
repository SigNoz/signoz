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

export const checkVersionState = (
	currentVersion: string,
	latestVersion: string,
): boolean => {
	let versionCore = currentVersion?.split('-')[0];

	// extract only digits and dots (.) from a string
	const latestMatch = latestVersion.match(/[\d.]+/);
	const coreMatch = versionCore.match(/[\d.]+/);

	if (latestMatch && coreMatch) {
		latestVersion = latestMatch[0];
		versionCore = coreMatch[0];
	} else {
		latestVersion = latestVersion;
		versionCore = versionCore;
	}

	return versionCore === latestVersion;
};

// list of forbidden tags to remove in dompurify
export const FORBID_DOM_PURIFY_TAGS = ['img', 'form'];

export const isFeatureKeys = (key: string): key is keyof typeof FeatureKeys =>
	Object.keys(FeatureKeys).includes(key);
