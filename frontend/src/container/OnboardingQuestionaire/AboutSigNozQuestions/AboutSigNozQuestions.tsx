/* eslint-disable sonarjs/cognitive-complexity */
import { useEffect, useState } from 'react';
import { Button } from '@signozhq/button';
import { Checkbox } from '@signozhq/checkbox';
import { Input } from '@signozhq/input';
import TextArea from 'antd/lib/input/TextArea';
import logEvent from 'api/common/logEvent';
import { ArrowRight } from 'lucide-react';

import { OnboardingQuestionHeader } from '../OnboardingQuestionHeader';

import '../OnboardingQuestionaire.styles.scss';

export interface SignozDetails {
	interestInSignoz: string[] | null;
	otherInterestInSignoz: string | null;
	discoverSignoz: string | null;
}

interface AboutSigNozQuestionsProps {
	signozDetails: SignozDetails;
	setSignozDetails: (details: SignozDetails) => void;
	onNext: () => void;
}

const interestedInOptions: Record<string, string> = {
	loweringCosts: 'Lowering observability costs',
	otelNativeStack: 'Interested in OTel-native stack',
	deploymentFlexibility: 'Deployment flexibility (Cloud/Self-Host) in future',
	singleTool:
		'Single Tool (logs, metrics & traces) to reduce operational overhead',
	correlateSignals: 'Correlate signals for faster troubleshooting',
};

export function AboutSigNozQuestions({
	signozDetails,
	setSignozDetails,
	onNext,
}: AboutSigNozQuestionsProps): JSX.Element {
	const [interestInSignoz, setInterestInSignoz] = useState<string[]>(
		signozDetails?.interestInSignoz || [],
	);
	const [otherInterestInSignoz, setOtherInterestInSignoz] = useState<string>(
		signozDetails?.otherInterestInSignoz || '',
	);
	const [discoverSignoz, setDiscoverSignoz] = useState<string>(
		signozDetails?.discoverSignoz || '',
	);
	const [isNextDisabled, setIsNextDisabled] = useState<boolean>(true);

	useEffect((): void => {
		if (
			discoverSignoz !== '' &&
			interestInSignoz.length > 0 &&
			(!interestInSignoz.includes('Others') || otherInterestInSignoz !== '')
		) {
			setIsNextDisabled(false);
		} else {
			setIsNextDisabled(true);
		}
	}, [interestInSignoz, otherInterestInSignoz, discoverSignoz]);

	const handleInterestChange = (option: string, checked: boolean): void => {
		if (checked) {
			setInterestInSignoz((prev) => [...prev, option]);
		} else {
			setInterestInSignoz((prev) => prev.filter((item) => item !== option));
		}
	};

	const createInterestChangeHandler = (option: string) => (
		checked: boolean,
	): void => {
		handleInterestChange(option, Boolean(checked));
	};

	const handleOnNext = (): void => {
		setSignozDetails({
			discoverSignoz,
			interestInSignoz,
			otherInterestInSignoz,
		});

		logEvent('Org Onboarding: Answered', {
			discoverSignoz,
			interestInSignoz,
			otherInterestInSignoz,
		});

		onNext();
	};

	return (
		<div className="questions-container">
			<OnboardingQuestionHeader
				title="Set up your workspace"
				subtitle="Tailor SigNoz to suit your observability needs."
			/>

			<div className="questions-form-container">
				<div className="questions-form">
					<div className="form-group">
						<div className="question">How did you first come across SigNoz?</div>

						<TextArea
							className="discover-signoz-input"
							placeholder={`e.g., googling "datadog alternative", a post on r/devops, from a friend/colleague, a LinkedIn post, ChatGPT, etc.`}
							value={discoverSignoz}
							autoFocus
							rows={4}
							onChange={(e): void => setDiscoverSignoz(e.target.value)}
						/>
					</div>

					<div className="form-group">
						<div className="question">What got you interested in SigNoz?</div>
						<div className="checkbox-grid">
							{Object.keys(interestedInOptions).map((option: string) => (
								<div key={option} className="checkbox-item">
									<Checkbox
										id={`checkbox-${option}`}
										checked={interestInSignoz.includes(option)}
										onCheckedChange={createInterestChangeHandler(option)}
										labelName={interestedInOptions[option]}
									/>
								</div>
							))}

							<div className="checkbox-item checkbox-item-others">
								<Checkbox
									id="others-checkbox"
									checked={interestInSignoz.includes('Others')}
									onCheckedChange={createInterestChangeHandler('Others')}
									labelName={interestInSignoz.includes('Others') ? '' : 'Others'}
								/>
								{interestInSignoz.includes('Others') && (
									<Input
										type="text"
										className="onboarding-questionaire-other-input"
										placeholder="What got you interested in SigNoz?"
										value={otherInterestInSignoz}
										autoFocus
										onChange={(e): void => setOtherInterestInSignoz(e.target.value)}
									/>
								)}
							</div>
						</div>
					</div>
				</div>

				<div className="onboarding-buttons-container">
					<Button
						variant="solid"
						color="primary"
						className={`onboarding-next-button ${isNextDisabled ? 'disabled' : ''}`}
						onClick={handleOnNext}
						disabled={isNextDisabled}
						suffixIcon={<ArrowRight size={12} />}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
