import { SKIP_ONBOARDING } from 'constants/onboarding';
import getLocalStorage from 'api/browser/localstorage/get';

export const isOnboardingSkipped = (): boolean => {
	return getLocalStorage(SKIP_ONBOARDING) === 'true';
};
