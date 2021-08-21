import { SKIP_ONBOARDING } from "constants/onboarding";

export const isOnboardingSkipped = () => {
	return localStorage.getItem(SKIP_ONBOARDING) === "true";
};
