import OnboardingQuestionaire from 'container/OnboardingQuestionaire';

// import OnboardingAddDataSource from './OnboardingAddDataSource';

function OnboardingPageV2(): JSX.Element {
	return (
		<div className="onboarding-v2">
			{/* #TODO: OnboardingAddDataSource is currently a Pure Component */}
			{/* <OnboardingAddDataSource /> */}
			<OnboardingQuestionaire />
		</div>
	);
}
export default OnboardingPageV2;
