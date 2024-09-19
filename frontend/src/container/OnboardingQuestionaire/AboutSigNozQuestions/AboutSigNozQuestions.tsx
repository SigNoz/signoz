/* eslint-disable sonarjs/cognitive-complexity */
import '../OnboardingQuestionaire.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Input, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AboutSigNozQuestionsProps {
	signozDetails: any;
	setSignozDetails: (details: any) => void;
	onNext: () => void;
	onBack: () => void;
}

const hearAboutSignozOptions: Record<string, string> = {
	blog: 'Blog',
	hackerNews: 'Hacker News',
	linkedin: 'LinkedIn',
	twitter: 'Twitter',
	reddit: 'Reddit',
	colleaguesFriends: 'Colleagues / Friends',
};

const interestedInOptions: Record<string, string> = {
	savingCosts: 'Saving costs',
	otelNativeStack: 'Interested in Otel-native stack',
	allInOne: 'All in one',
};

export function AboutSigNozQuestions({
	signozDetails,
	setSignozDetails,
	onNext,
	onBack,
}: AboutSigNozQuestionsProps): JSX.Element {
	const [hearAboutSignoz, setHearAboutSignoz] = useState<string | null>(
		signozDetails?.hearAboutSignoz || null,
	);
	const [otherAboutSignoz, setOtherAboutSignoz] = useState<string>(
		signozDetails?.otherAboutSignoz || '',
	);
	const [interestedSignoz, setInterestedSignoz] = useState<string | null>(
		signozDetails?.interestedSignoz || null,
	);
	const [otherInterest, setOtherInterest] = useState<string>(
		signozDetails?.otherInterest || '',
	);
	const [isNextDisabled, setIsNextDisabled] = useState<boolean>(true);

	useEffect((): void => {
		if (
			hearAboutSignoz !== null &&
			(hearAboutSignoz !== 'Others' || otherAboutSignoz !== '') &&
			interestedSignoz !== null &&
			(interestedSignoz !== 'Others' || otherInterest !== '')
		) {
			setIsNextDisabled(false);
		} else {
			setIsNextDisabled(true);
		}
	}, [hearAboutSignoz, otherAboutSignoz, interestedSignoz, otherInterest]);

	const handleOnNext = (): void => {
		setSignozDetails({
			hearAboutSignoz,
			otherAboutSignoz,
			interestedSignoz,
			otherInterest,
		});

		logEvent('Onboarding: SigNoz Questions: Next', {
			hearAboutSignoz,
			otherAboutSignoz,
			interestedSignoz,
			otherInterest,
		});

		onNext();
	};

	const handleOnBack = (): void => {
		setSignozDetails({
			hearAboutSignoz,
			otherAboutSignoz,
			interestedSignoz,
			otherInterest,
		});

		logEvent('Onboarding: SigNoz Questions: Back', {
			hearAboutSignoz,
			otherAboutSignoz,
			interestedSignoz,
			otherInterest,
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
						<div className="question">Where did you hear about SigNoz?</div>
						<div className="two-column-grid">
							{Object.keys(hearAboutSignozOptions).map((option: string) => (
								<Button
									key={option}
									type="primary"
									className={`onboarding-questionaire-button ${
										hearAboutSignoz === option ? 'active' : ''
									}`}
									onClick={(): void => setHearAboutSignoz(option)}
								>
									{hearAboutSignozOptions[option]}
									{hearAboutSignoz === option && (
										<CheckCircle size={12} color={Color.BG_FOREST_500} />
									)}
								</Button>
							))}

							{hearAboutSignoz === 'Others' ? (
								<Input
									type="text"
									className="onboarding-questionaire-other-input"
									placeholder="Please specify your interest"
									value={otherAboutSignoz}
									autoFocus
									addonAfter={
										otherAboutSignoz !== '' ? (
											<CheckCircle size={12} color={Color.BG_FOREST_500} />
										) : (
											''
										)
									}
									onChange={(e): void => setOtherAboutSignoz(e.target.value)}
								/>
							) : (
								<Button
									type="primary"
									className={`onboarding-questionaire-button ${
										hearAboutSignoz === 'Others' ? 'active' : ''
									}`}
									onClick={(): void => setHearAboutSignoz('Others')}
								>
									Others
								</Button>
							)}
						</div>
					</div>

					<div className="form-group">
						<div className="question">
							What are you interested in doing with SigNoz?
						</div>
						<div className="two-column-grid">
							{Object.keys(interestedInOptions).map((option: string) => (
								<Button
									key={option}
									type="primary"
									className={`onboarding-questionaire-button ${
										interestedSignoz === option ? 'active' : ''
									}`}
									onClick={(): void => setInterestedSignoz(option)}
								>
									{interestedInOptions[option]}
									{interestedSignoz === option && (
										<CheckCircle size={12} color={Color.BG_FOREST_500} />
									)}
								</Button>
							))}

							{interestedSignoz === 'Others' ? (
								<Input
									type="text"
									className="onboarding-questionaire-other-input"
									placeholder="Please specify your interest"
									value={otherInterest}
									autoFocus
									addonAfter={
										otherInterest !== '' ? (
											<CheckCircle size={12} color={Color.BG_FOREST_500} />
										) : (
											''
										)
									}
									onChange={(e): void => setOtherInterest(e.target.value)}
								/>
							) : (
								<Button
									type="primary"
									className={`onboarding-questionaire-button ${
										interestedSignoz === 'Others' ? 'active' : ''
									}`}
									onClick={(): void => setInterestedSignoz('Others')}
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
