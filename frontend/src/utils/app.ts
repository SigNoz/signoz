import { SKIP_ONBOARDING } from 'constants/onboarding';

export const isOnboardingSkipped = (): boolean => {
	return localStorage.getItem(SKIP_ONBOARDING) === 'true';
};
