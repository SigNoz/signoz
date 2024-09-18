/* eslint-disable sonarjs/cognitive-complexity */
import '../OnboardingQuestionaire.styles.scss';

import { Button, Typography } from 'antd';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

interface OrgQuestionsProps {
	onNext: () => void;
}

function OrgQuestions({ onNext }: OrgQuestionsProps): JSX.Element {
	const [organisationName, setOrganisationName] = useState<string>('');
	const [usesObservability, setUsesObservability] = useState<boolean | null>(
		null,
	);
	const [observabilityTool, setObservabilityTool] = useState<string | null>(
		null,
	);
	const [otherTool, setOtherTool] = useState<string>('');
	const [familiarity, setFamiliarity] = useState<string | null>(null);
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

						<div className="radio-group">
							<button
								type="button"
								name="usesObservability"
								className={`radio-button ${usesObservability === true ? 'active' : ''}`}
								onClick={(): void => {
									setUsesObservability(true);
								}}
							>
								Yes
							</button>
							<button
								type="button"
								className={`radio-button ${
									usesObservability === false ? 'active' : ''
								}`}
								onClick={(): void => {
									setUsesObservability(false);
									setObservabilityTool(null);
									setOtherTool('');
								}}
							>
								No
							</button>
						</div>
					</div>

					{usesObservability && (
						<div className="form-group">
							<label className="question" htmlFor="observabilityTool">
								Which observability tool do you currently use?
							</label>
							<div className="tool-grid">
								<button
									type="button"
									className={`tool-button ${
										observabilityTool === 'AWS Cloudwatch' ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool('AWS Cloudwatch')}
								>
									AWS Cloudwatch
								</button>
								<button
									type="button"
									className={`tool-button ${
										observabilityTool === 'DataDog' ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool('DataDog')}
								>
									DataDog
								</button>
								<button
									type="button"
									className={`tool-button ${
										observabilityTool === 'New Relic' ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool('New Relic')}
								>
									New Relic
								</button>
								<button
									type="button"
									className={`tool-button ${
										observabilityTool === 'Grafana / Prometheus' ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool('Grafana / Prometheus')}
								>
									Grafana / Prometheus
								</button>
								<button
									type="button"
									className={`tool-button ${
										observabilityTool === 'Azure App Monitor' ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool('Azure App Monitor')}
								>
									Azure App Monitor
								</button>
								<button
									type="button"
									className={`tool-button ${
										observabilityTool === 'GCP-native o11y tools' ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool('GCP-native o11y tools')}
								>
									GCP-native o11y tools
								</button>
								<button
									type="button"
									className={`tool-button ${
										observabilityTool === 'Honeycomb' ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool('Honeycomb')}
								>
									Honeycomb
								</button>

								{observabilityTool === 'Others' ? (
									<input
										type="text"
										className="tool-button input-field"
										placeholder="Please specify the tool"
										value={otherTool}
										onChange={(e): void => setOtherTool(e.target.value)}
									/>
								) : (
									<button
										type="button"
										className={`tool-button ${
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
						<div className="grid">
							<button
								type="button"
								className={`grid-button ${familiarity === 'new' ? 'active' : ''}`}
								onClick={(): void => setFamiliarity('new')}
							>
								I&apos;m completely new
							</button>
							<button
								type="button"
								className={`grid-button ${
									familiarity === 'built-stack' ? 'active' : ''
								}`}
								onClick={(): void => setFamiliarity('built-stack')}
							>
								I&apos;ve built a stack before
							</button>
							<button
								type="button"
								className={`grid-button ${
									familiarity === 'experienced' ? 'active' : ''
								}`}
								onClick={(): void => setFamiliarity('experienced')}
							>
								I have some experience
							</button>
							<button
								type="button"
								className={`grid-button ${familiarity === 'dont-know' ? 'active' : ''}`}
								onClick={(): void => setFamiliarity('dont-know')}
							>
								I don&apos;t know what it is
							</button>
						</div>
					</div>
				</div>

				<div className="next-prev-container">
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

export default OrgQuestions;
