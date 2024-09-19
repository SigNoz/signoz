/* eslint-disable sonarjs/cognitive-complexity */
import '../OnboardingQuestionaire.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Input, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

interface OrgQuestionsProps {
	orgDetails: any;
	setOrgDetails: (details: any) => void;
	onNext: () => void;
}

const observabilityTools = [
	'AWS Cloudwatch',
	'DataDog',
	'New Relic',
	'Grafana / Prometheus',
	'Azure App Monitor',
	'GCP-native o11y tools',
	'Honeycomb',
];

const o11yFamiliarityOptions: Record<string, string> = {
	new: "I'm completely new",
	builtStack: "I've built a stack before",
	experienced: 'I have some experience',
	dontKnow: "I don't know what it is",
};

function OrgQuestions({
	orgDetails,
	setOrgDetails,
	onNext,
}: OrgQuestionsProps): JSX.Element {
	const [organisationName, setOrganisationName] = useState<string>(
		orgDetails?.organisationName || '',
	);
	const [usesObservability, setUsesObservability] = useState<boolean | null>(
		orgDetails?.usesObservability || null,
	);
	const [observabilityTool, setObservabilityTool] = useState<string | null>(
		orgDetails?.observabilityTool || null,
	);
	const [otherTool, setOtherTool] = useState<string>(
		orgDetails?.otherTool || '',
	);
	const [familiarity, setFamiliarity] = useState<string | null>(
		orgDetails?.familiarity || null,
	);
	const [isNextDisabled, setIsNextDisabled] = useState<boolean>(true);

	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	useEffect(() => {
		if (
			organisationName !== '' &&
			usesObservability !== null &&
			familiarity !== null &&
			(observabilityTool !== 'Others' || (usesObservability && otherTool !== ''))
		) {
			setIsNextDisabled(false);
		} else {
			setIsNextDisabled(true);
		}
	}, [
		organisationName,
		usesObservability,
		familiarity,
		observabilityTool,
		otherTool,
	]);

	const handleOnNext = (): void => {
		setOrgDetails({
			organisationName,
			usesObservability,
			observabilityTool,
			otherTool,
			familiarity,
		});

		logEvent('Onboarding: Org Questions: Next', {
			organisationName,
			usesObservability,
			observabilityTool,
			otherTool,
			familiarity,
		});

		onNext();
	};

	return (
		<div className="questions-container">
			<Typography.Title level={3} className="title">
				Welcome, {user?.name}!
			</Typography.Title>
			<Typography.Paragraph className="sub-title">
				We&apos;ll help you get the most out of SigNoz, whether you&apos;re new to
				observability or a seasoned pro.
			</Typography.Paragraph>

			<div className="questions-form-container">
				<div className="questions-form">
					<div className="form-group">
						<label className="question" htmlFor="organisationName">
							Your Organisation Name
						</label>
						<input
							type="text"
							name="organisationName"
							id="organisation"
							placeholder="For eg. Simpsonville..."
							autoComplete="off"
							value={organisationName}
							onChange={(e): void => setOrganisationName(e.target.value)}
						/>
					</div>

					<div className="form-group">
						<label className="question" htmlFor="usesObservability">
							Do you currently use any observability/monitoring tool?
						</label>

						<div className="two-column-grid">
							<Button
								type="primary"
								name="usesObservability"
								className={`onboarding-questionaire-button ${
									usesObservability === true ? 'active' : ''
								}`}
								onClick={(): void => {
									setUsesObservability(true);
								}}
							>
								Yes{' '}
								{usesObservability === true && (
									<CheckCircle size={12} color={Color.BG_FOREST_500} />
								)}
							</Button>
							<Button
								type="primary"
								className={`onboarding-questionaire-button ${
									usesObservability === false ? 'active' : ''
								}`}
								onClick={(): void => {
									setUsesObservability(false);
									setObservabilityTool(null);
									setOtherTool('');
								}}
							>
								No{' '}
								{usesObservability === false && (
									<CheckCircle size={12} color={Color.BG_FOREST_500} />
								)}
							</Button>
						</div>
					</div>

					{usesObservability && (
						<div className="form-group">
							<label className="question" htmlFor="observabilityTool">
								Which observability tool do you currently use?
							</label>
							<div className="two-column-grid">
								{observabilityTools.map((tool) => (
									<Button
										key={tool}
										type="primary"
										className={`onboarding-questionaire-button ${
											observabilityTool === tool ? 'active' : ''
										}`}
										onClick={(): void => setObservabilityTool(tool)}
									>
										{tool}

										{observabilityTool === tool && (
											<CheckCircle size={12} color={Color.BG_FOREST_500} />
										)}
									</Button>
								))}

								{observabilityTool === 'Others' ? (
									<Input
										type="text"
										className="onboarding-questionaire-other-input"
										placeholder="Please specify the tool"
										value={otherTool}
										autoFocus
										addonAfter={
											otherTool !== '' ? (
												<CheckCircle size={12} color={Color.BG_FOREST_500} />
											) : (
												''
											)
										}
										onChange={(e): void => setOtherTool(e.target.value)}
									/>
								) : (
									<button
										type="button"
										className={`onboarding-questionaire-button ${
											observabilityTool === 'Others' ? 'active' : ''
										}`}
										onClick={(): void => setObservabilityTool('Others')}
									>
										Others
									</button>
								)}
							</div>
						</div>
					)}

					<div className="form-group">
						<div className="question">
							Are you familiar with observability (o11y)?
						</div>
						<div className="two-column-grid">
							{Object.keys(o11yFamiliarityOptions).map((option: string) => (
								<Button
									key={option}
									type="primary"
									className={`onboarding-questionaire-button ${
										familiarity === option ? 'active' : ''
									}`}
									onClick={(): void => setFamiliarity(option)}
								>
									{o11yFamiliarityOptions[option]}
									{familiarity === option && (
										<CheckCircle size={12} color={Color.BG_FOREST_500} />
									)}
								</Button>
							))}
						</div>
					</div>
				</div>

				<div className="next-prev-container">
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

export default OrgQuestions;
