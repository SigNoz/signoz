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

	const [orgDetails, setOrgDetails] = useState<Record<string, string> | null>(
		null,
	);
	const [signozDetails, setSignozDetails] = useState<Record<
		string,
		string
	> | null>(null);
	const [optimiseSignozDetails, setOptimiseSignozDetails] = useState<Record<
		string,
		number
	> | null>(null);

	const [teamMembers, setTeamMembers] = useState<string[]>(['']);

	return (
		<div className="onboarding-questionaire-container">
			<div className="onboarding-questionaire-header">
				<OnboardingHeader />
			</div>

			<div className="onboarding-questionaire-content">
				{currentStep === 1 && (
					<OrgQuestions
						orgDetails={orgDetails}
						setOrgDetails={setOrgDetails}
						onNext={(): void => setCurrentStep(2)}
					/>
				)}

				{currentStep === 2 && (
					<AboutSigNozQuestions
						signozDetails={signozDetails}
						setSignozDetails={setSignozDetails}
						onBack={(): void => setCurrentStep(1)}
						onNext={(): void => setCurrentStep(3)}
					/>
				)}

				{currentStep === 3 && (
					<OptimiseSignozNeeds
						optimiseSignozDetails={optimiseSignozDetails}
						setOptimiseSignozDetails={setOptimiseSignozDetails}
						onBack={(): void => setCurrentStep(2)}
						onNext={(): void => setCurrentStep(4)}
					/>
				)}

				{currentStep === 4 && (
					<InviteTeamMembers
						teamMembers={teamMembers}
						setTeamMembers={setTeamMembers}
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
