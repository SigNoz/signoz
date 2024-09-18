import './OnboardingQuestionaire.styles.scss';

import { useState } from 'react';

import { AboutSigNozQuestions } from './AboutSigNozQuestions/AboutSigNozQuestions';
import InviteTeamMembers from './InviteTeamMembers/InviteTeamMembers';
import { OnboardingFooter } from './OnboardingFooter/OnboardingFooter';
import { OnboardingHeader } from './OnboardingHeader/OnboardingHeader';
import OptimiseSignozNeeds from './OptimiseSignozNeeds/OptimiseSignozNeeds';
import OrgQuestions from './OrgQuestions/OrgQuestions';

function OnboardingQuestionaire(): JSX.Element {
	const [currentStep, setCurrentStep] = useState<number>(1);

	return (
		<div className="onboarding-questionaire-container">
			<div className="onboarding-questionaire-header">
				<OnboardingHeader />
			</div>

			<div className="onboarding-questionaire-content">
				{currentStep === 1 && (
					<OrgQuestions onNext={(): void => setCurrentStep(2)} />
				)}

				{currentStep === 2 && (
					<AboutSigNozQuestions
						onBack={(): void => setCurrentStep(1)}
						onNext={(): void => setCurrentStep(3)}
					/>
				)}

				{currentStep === 3 && (
					<OptimiseSignozNeeds
						onBack={(): void => setCurrentStep(2)}
						onNext={(): void => setCurrentStep(4)}
					/>
				)}

				{currentStep === 4 && (
					<InviteTeamMembers
						onBack={(): void => setCurrentStep(3)}
						onNext={(): void => setCurrentStep(5)}
					/>
				)}
			</div>

			<div className="onboarding-questionaire-footer">
				<OnboardingFooter />
			</div>
		</div>
	);
}

export default OnboardingQuestionaire;
