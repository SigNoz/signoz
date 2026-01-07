/* eslint-disable sonarjs/cognitive-complexity */
import '../OnboardingQuestionaire.styles.scss';

import { Button } from '@signozhq/button';
import { Checkbox } from '@signozhq/checkbox';
import { Color } from '@signozhq/design-tokens';
import { Input } from '@signozhq/input';
import { Typography } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import logEvent from 'api/common/logEvent';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

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
			<div className="onboarding-header-section">
				<div className="onboarding-header-icon">
					<img src="/svgs/barber-pool.svg" alt="SigNoz" width="32" height="32" />
				</div>
				<Typography.Title level={4} className="onboarding-header-title">
					Set up your workspace
				</Typography.Title>
				<Typography.Paragraph className="onboarding-header-subtitle">
					Tailor SigNoz to suit your observability needs.
				</Typography.Paragraph>
			</div>

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
										onCheckedChange={(checked): void =>
											handleInterestChange(option, Boolean(checked))
										}
										labelName={interestedInOptions[option]}
									/>
								</div>
							))}

							<div className="checkbox-item">
								<Checkbox
									id="others-checkbox"
									checked={interestInSignoz.includes('Others')}
									onCheckedChange={(checked): void =>
										handleInterestChange('Others', Boolean(checked))
									}
									labelName="Others"
								/>
								{interestInSignoz.includes('Others') && (
									<Input
										type="text"
										className="onboarding-questionaire-other-input"
										placeholder="Please specify your interest"
										value={otherInterestInSignoz}
										autoFocus
										addonAfter={
											otherInterestInSignoz !== '' ? (
												<CheckCircle size={12} color={Color.BG_FOREST_500} />
											) : (
												''
											)
										}
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
