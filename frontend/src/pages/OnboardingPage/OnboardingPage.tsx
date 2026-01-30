import OnboardingContainer from 'container/OnboardingContainer';
import { OnboardingContextProvider } from 'container/OnboardingContainer/context/OnboardingContext';

import './OnboardingPage.styles.scss';

function OnboardingPage(): JSX.Element {
	return (
		<OnboardingContextProvider>
			<div className="onboardingPageContainer">
				<OnboardingContainer />
			</div>
		</OnboardingContextProvider>
	);
}

export default OnboardingPage;
