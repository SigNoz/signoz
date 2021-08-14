import { SKIP_ONBOARDING } from 'Src/constants/onboarding';

export const isOnboardingSkipped = () => {
	return localStorage.getItem(SKIP_ONBOARDING) === 'true';
};
