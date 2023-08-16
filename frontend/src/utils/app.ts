import getLocalStorage from 'api/browser/localstorage/get';
import { SKIP_ONBOARDING } from 'constants/onboarding';

export const isOnboardingSkipped = (): boolean =>
	getLocalStorage(SKIP_ONBOARDING) === 'true';
