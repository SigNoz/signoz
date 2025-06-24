/* eslint-disable sonarjs/cognitive-complexity */
import '../OnboardingQuestionaire.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Input, Typography } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import logEvent from 'api/common/logEvent';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface SignozDetails {
	interestInSignoz: string | null;
	otherInterestInSignoz: string | null;
	discoverSignoz: string | null;
}

interface AboutSigNozQuestionsProps {
	signozDetails: SignozDetails;
	setSignozDetails: (details: SignozDetails) => void;
	onNext: () => void;
	onBack: () => void;
}

const interestedInOptions: Record<string, string> = {
	savingCosts: 'Saving costs',
	otelNativeStack: 'Interested in Otel-native stack',
	allInOne: 'All in one (Logs, Metrics & Traces)',
};

export function AboutSigNozQuestions({
	signozDetails,
	setSignozDetails,
	onNext,
	onBack,
}: AboutSigNozQuestionsProps): JSX.Element {
	const [interestInSignoz, setInterestInSignoz] = useState<string | null>(
		signozDetails?.interestInSignoz || null,
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
			interestInSignoz !== null &&
			(interestInSignoz !== 'Others' || otherInterestInSignoz !== '')
		) {
			setIsNextDisabled(false);
		} else {
			setIsNextDisabled(true);
		}
	}, [interestInSignoz, otherInterestInSignoz, discoverSignoz]);

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

	const handleOnBack = (): void => {
		setSignozDetails({
			discoverSignoz,
			interestInSignoz,
			otherInterestInSignoz,
		});

		onBack();
	};

	return (
		<div className="questions-container">
			<Typography.Title level={3} className="title">
				Tell Us About Your Interest in SigNoz
			</Typography.Title>
			<Typography.Paragraph className="sub-title">
				We&apos;d love to know a little bit about you and your interest in SigNoz
			</Typography.Paragraph>

			<div className="questions-form-container">
				<div className="questions-form">
					<div className="form-group">
						<div className="question">How did you first come across SigNoz?</div>

						<TextArea
							className="discover-signoz-input"
							placeholder="e.g., Google Search, Hacker News, Reddit, a friend, ChatGPT, a blog post, a conference, etc."
							value={discoverSignoz}
							autoFocus
							rows={4}
							onChange={(e): void => setDiscoverSignoz(e.target.value)}
						/>
					</div>

					<div className="form-group">
						<div className="question">What got you interested in SigNoz?</div>
						<div className="two-column-grid">
							{Object.keys(interestedInOptions).map((option: string) => (
								<Button
									key={option}
									type="primary"
									className={`onboarding-questionaire-button ${
										interestInSignoz === option ? 'active' : ''
									}`}
									onClick={(): void => setInterestInSignoz(option)}
								>
									{interestedInOptions[option]}
									{interestInSignoz === option && (
										<CheckCircle size={12} color={Color.BG_FOREST_500} />
									)}
								</Button>
							))}

							{interestInSignoz === 'Others' ? (
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
							) : (
								<Button
									type="primary"
									className={`onboarding-questionaire-button ${
										interestInSignoz === 'Others' ? 'active' : ''
									}`}
									onClick={(): void => setInterestInSignoz('Others')}
								>
									Others
								</Button>
							)}
						</div>
					</div>
				</div>

				<div className="next-prev-container">
					<Button type="default" className="next-button" onClick={handleOnBack}>
						<ArrowLeft size={14} />
						Back
					</Button>

					<Button
						type="primary"
						className={`next-button ${isNextDisabled ? 'disabled' : ''}`}
						onClick={handleOnNext}
						disabled={isNextDisabled}
					>
						Next
						<ArrowRight size={14} />
					</Button>
				</div>
			</div>
		</div>
	);
}
