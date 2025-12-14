import getLocalStorage from 'api/browser/localstorage/get';
import { FeatureKeys } from 'constants/features';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import { get } from 'lodash-es';

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
	const versionCore = currentVersion?.split('-')[0];
	return versionCore === latestVersion;
};

// list of forbidden tags to remove in dompurify
export const FORBID_DOM_PURIFY_TAGS = ['img', 'form', 'style'];
export const FORBID_DOM_PURIFY_ATTR = ['style'];

export const isFeatureKeys = (key: string): key is keyof typeof FeatureKeys =>
	Object.keys(FeatureKeys).includes(key);

export function isIngestionActive(data: any): boolean {
	const table = get(data, 'data.newResult.data.result[0].table');
	if (!table) return false;

	const key = get(table, 'columns[0].id');
	const value = get(table, `rows[0].data["${key}"]`) || '0';

	return parseInt(value, 10) > 0;
}
