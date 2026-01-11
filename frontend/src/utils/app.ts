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

/**
 * Builds an absolute path by combining the current page's pathname with a relative path.
 *
 * @param {Object} params - The parameters for building the absolute path
 * @param {string} params.relativePath - The relative path to append to the current pathname
 * @param {string} [params.urlQueryString] - Optional query string to append to the final path (without leading '?')
 *
 * @returns {string} The constructed absolute path, optionally with query string
 */
export function buildAbsolutePath({
	relativePath,
	urlQueryString,
}: {
	relativePath: string;
	urlQueryString?: string;
}): string {
	const { pathname } = window.location;
	// ensure base path always ends with a forward slash
	const basePath = pathname.endsWith('/') ? pathname : `${pathname}/`;

	// handle relative path starting with a forward slash
	const normalizedRelativePath = relativePath.startsWith('/')
		? relativePath.slice(1)
		: relativePath;

	const absolutePath = basePath + normalizedRelativePath;

	return urlQueryString ? `${absolutePath}?${urlQueryString}` : absolutePath;
}
