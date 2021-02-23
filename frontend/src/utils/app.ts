export const isOnboardingSkipped = () => {
	return localStorage.getItem("skip_onboarding") === "true";
};
