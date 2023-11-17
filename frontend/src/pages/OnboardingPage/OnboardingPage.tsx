import './OnboardingPage.styles.scss';

import OnboardingContainer from 'container/OnboardingContainer';
import { OnboardingContextProvider } from 'container/OnboardingContainer/context/OnboardingContext';

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
