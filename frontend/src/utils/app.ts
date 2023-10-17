import getLocalStorage from 'api/browser/localstorage/get';
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
