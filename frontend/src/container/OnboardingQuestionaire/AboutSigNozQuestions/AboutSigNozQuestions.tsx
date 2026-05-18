import { useEffect, useMemo, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Input } from '@signozhq/ui/input';
import { Input as AntdInput } from 'antd';
import logEvent from 'api/common/logEvent';
import { ArrowRight } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';

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
	openSourceTooling: 'Prefer open-source tooling',
};

function seededShuffle<T>(array: T[], seed: string): T[] {
	const result = [...array];

	let num = 0;
	for (let i = 0; i < seed.length; i++) {
		num = Math.imul(num + seed.charCodeAt(i), 2654435761);
		num = Math.abs(num);
	}

	for (let i = result.length - 1; i > 0; i--) {
		num = Math.abs(Math.imul(num, 1664525) + 1013904223);
		const j = num % (i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}

	return result;
}

export function AboutSigNozQuestions({
	signozDetails,
	setSignozDetails,
	onNext,
}: AboutSigNozQuestionsProps): JSX.Element {
	const { versionData } = useAppContext();

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

	const shuffledOptionKeys = useMemo(
		() =>
			seededShuffle(Object.keys(interestedInOptions), versionData?.version ?? ''),
		[versionData?.version],
	);

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

	const createInterestChangeHandler =
		(option: string) =>
		(checked: boolean): void => {
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

						<AntdInput.TextArea
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
							{shuffledOptionKeys.map((option: string) => (
								<div key={option} className="checkbox-item">
									<Checkbox
										id={`checkbox-${option}`}
										value={interestInSignoz.includes(option)}
										onChange={createInterestChangeHandler(option)}
									>
										{interestedInOptions[option]}
									</Checkbox>
								</div>
							))}

							<div className="checkbox-item checkbox-item-others">
								<Checkbox
									id="others-checkbox"
									value={interestInSignoz.includes('Others')}
									onChange={createInterestChangeHandler('Others')}
								>
									{interestInSignoz.includes('Others') ? '' : 'Others'}
								</Checkbox>
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
						suffix={<ArrowRight size={12} />}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
