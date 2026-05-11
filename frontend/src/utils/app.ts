import getLocalStorage from 'api/browser/localstorage/get';
import { FeatureKeys } from 'constants/features';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import dayjs from 'dayjs';
import history from 'lib/history';
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

const stripVersionPrefix = (version: string): string =>
	version?.replace(/^v/i, '') ?? '';

export const checkVersionState = (
	currentVersion: string,
	latestVersion: string,
): boolean => {
	const versionCore = currentVersion?.split('-')[0];
	return stripVersionPrefix(versionCore) === stripVersionPrefix(latestVersion);
};

// list of forbidden tags to remove in dompurify
export const FORBID_DOM_PURIFY_TAGS = ['img', 'form', 'style'];
export const FORBID_DOM_PURIFY_ATTR = ['style'];

export const isFeatureKeys = (key: string): key is keyof typeof FeatureKeys =>
	Object.keys(FeatureKeys).includes(key);

export function isIngestionActive(data: any): boolean {
	const table = get(data, 'data.newResult.data.result[0].table');
	if (!table) {
		return false;
	}

	const key = get(table, 'columns[0].id');
	const value = get(table, `rows[0].data["${key}"]`) || '0';

	return Number.parseInt(value, 10) > 0;
}

/**
 * Builds a path by combining the current page's pathname with a relative path.
 *
 * @param {Object} params
 * @param {string} params.relativePath - Relative path to append to the current pathname
 * @param {string} [params.urlQueryString] - Query string without leading '?'
 * @returns {string} The constructed absolute path, optionally with query string
 */
export function buildAbsolutePath({
	relativePath,
	urlQueryString,
}: {
	relativePath: string;
	urlQueryString?: string;
}): string {
	const currentPathname = history.location.pathname;

	if (!relativePath) {
		return urlQueryString
			? `${currentPathname}?${urlQueryString}`
			: currentPathname;
	}

	// ensure base path always ends with a forward slash
	const basePath = currentPathname.endsWith('/')
		? currentPathname
		: `${currentPathname}/`;

	// handle relative path starting with a forward slash
	const normalizedRelativePath = relativePath.startsWith('/')
		? relativePath.slice(1)
		: relativePath;

	const absolutePath = basePath + normalizedRelativePath;

	return urlQueryString ? `${absolutePath}?${urlQueryString}` : absolutePath;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns true if the user is holding Cmd (Mac) or Ctrl (Windows/Linux)
 * during a click event, or if the middle mouse button is used —
 * the universal "open in new tab" modifiers.
 */
export const isModifierKeyPressed = (
	event: MouseEvent | React.MouseEvent,
): boolean => event.metaKey || event.ctrlKey || event.button === 1;

export function toISOString(
	date: Date | string | number | null | undefined,
): string | null {
	if (date == null) {
		return null;
	}

	const d = dayjs(date);

	if (!d.isValid()) {
		return null;
	}

	return d.toISOString();
}
