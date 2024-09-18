/* eslint-disable sonarjs/cognitive-complexity */
import '../OnboardingQuestionaire.styles.scss';

import { Button, Typography } from 'antd';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AboutSigNozQuestionsProps {
	onNext: () => void;
	onBack: () => void;
}

export function AboutSigNozQuestions({
	onNext,
	onBack,
}: AboutSigNozQuestionsProps): JSX.Element {
	const [hearAboutSignoz, setHearAboutSignoz] = useState<string | null>(null);
	const [otherAboutSignoz, setOtherAboutSignoz] = useState<string>('');
	const [interestedSignoz, setInterestedSignoz] = useState<string | null>(null);
	const [otherInterest, setOtherInterest] = useState<string>('');
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
						<div className="tool-grid">
							<button
								type="button"
								className={`tool-button ${hearAboutSignoz === 'Blog' ? 'active' : ''}`}
								onClick={(): void => setHearAboutSignoz('Blog')}
							>
								Blog
							</button>
							<button
								type="button"
								className={`tool-button ${
									hearAboutSignoz === 'Hacker News' ? 'active' : ''
								}`}
								onClick={(): void => setHearAboutSignoz('Hacker News')}
							>
								Hacker News
							</button>
							<button
								type="button"
								className={`tool-button ${
									hearAboutSignoz === 'LinkedIn' ? 'active' : ''
								}`}
								onClick={(): void => setHearAboutSignoz('LinkedIn')}
							>
								LinkedIn
							</button>
							<button
								type="button"
								className={`tool-button ${
									hearAboutSignoz === 'Twitter' ? 'active' : ''
								}`}
								onClick={(): void => setHearAboutSignoz('Twitter')}
							>
								Twitter
							</button>
							<button
								type="button"
								className={`tool-button ${
									hearAboutSignoz === 'Reddit' ? 'active' : ''
								}`}
								onClick={(): void => setHearAboutSignoz('Reddit')}
							>
								Reddit
							</button>
							<button
								type="button"
								className={`tool-button ${
									hearAboutSignoz === 'colleagues/friends' ? 'active' : ''
								}`}
								onClick={(): void => setHearAboutSignoz('colleagues/friends')}
							>
								Colleagues / Friends
							</button>

							{hearAboutSignoz === 'Others' ? (
								<input
									type="text"
									className="tool-button input-field"
									placeholder="Please specify where you heard about SigNoz"
									value={otherAboutSignoz}
									onChange={(e): void => setOtherAboutSignoz(e.target.value)}
								/>
							) : (
								<button
									type="button"
									className={`tool-button ${
										hearAboutSignoz === 'Others' ? 'active' : ''
									}`}
									onClick={(): void => setHearAboutSignoz('Others')}
								>
									Others
								</button>
							)}
						</div>
					</div>

					<div className="form-group">
						<div className="question">
							What are you interested in doing with SigNoz?
						</div>
						<div className="grid">
							<button
								type="button"
								className={`grid-button ${
									interestedSignoz === 'Saving costs' ? 'active' : ''
								}`}
								onClick={(): void => setInterestedSignoz('Saving costs')}
							>
								Saving costs
							</button>
							<button
								type="button"
								className={`grid-button ${
									interestedSignoz === 'Interested in Otel-native stack' ? 'active' : ''
								}`}
								onClick={(): void =>
									setInterestedSignoz('Interested in Otel-native stack')
								}
							>
								Interested in Otel-native stack
							</button>
							<button
								type="button"
								className={`grid-button ${
									interestedSignoz === 'All-in-one' ? 'active' : ''
								}`}
								onClick={(): void => setInterestedSignoz('All-in-one')}
							>
								All-in-one
							</button>

							{interestedSignoz === 'Others' ? (
								<input
									type="text"
									className="tool-button input-field"
									placeholder="Please specify your interest"
									value={otherInterest}
									onChange={(e): void => setOtherInterest(e.target.value)}
								/>
							) : (
								<button
									type="button"
									className={`tool-button ${
										interestedSignoz === 'Others' ? 'active' : ''
									}`}
									onClick={(): void => setInterestedSignoz('Others')}
								>
									Others
								</button>
							)}
						</div>
					</div>
				</div>

				<div className="next-prev-container">
					<Button type="default" className="next-button" onClick={onBack}>
						<ArrowLeft size={14} />
						Back
					</Button>

					<Button
						type="primary"
						className={`next-button ${isNextDisabled ? 'disabled' : ''}`}
						onClick={onNext}
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
