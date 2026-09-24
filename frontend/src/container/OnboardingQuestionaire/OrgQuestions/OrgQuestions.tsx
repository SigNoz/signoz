import { useEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { RadioGroup } from '@signozhq/ui/radio-group';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { ArrowRight } from '@signozhq/icons';

import '../OnboardingQuestionaire.styles.scss';

export interface OrgDetails {
	usesObservability: boolean | null;
	observabilityTool: string | null;
	otherTool: string | null;
	usesOtel: boolean | null;
	migrationTimeline: string | null;
}

interface OrgQuestionsProps {
	orgDetails: OrgDetails;
	onNext: (details: OrgDetails) => void;
}

const observabilityTools = {
	AWSCloudwatch: 'AWS Cloudwatch',
	DataDog: 'DataDog',
	NewRelic: 'New Relic',
	GrafanaPrometheus: 'Grafana / Prometheus',
	AzureAppMonitor: 'Azure App Monitor',
	GCPNativeO11yTools: 'GCP-native o11y tools',
	Honeycomb: 'Honeycomb',
	None: 'None/Starting fresh',
	Others: 'Others',
};

const migrationTimelineOptions = {
	lessThanMonth: 'Less than a month',
	oneToThreeMonths: '1-3 months',
	greaterThanThreeMonths: 'Greater than 3 months',
	justExploring: 'Just exploring',
};

function OrgQuestions({ orgDetails, onNext }: OrgQuestionsProps): JSX.Element {
	const [observabilityTool, setObservabilityTool] = useState<string | null>(
		orgDetails?.observabilityTool || null,
	);
	const [otherTool, setOtherTool] = useState<string>(
		orgDetails?.otherTool || '',
	);
	const [isNextDisabled, setIsNextDisabled] = useState<boolean>(true);

	const [usesOtel, setUsesOtel] = useState<boolean | null>(orgDetails.usesOtel);
	const [migrationTimeline, setMigrationTimeline] = useState<string | null>(
		orgDetails?.migrationTimeline || null,
	);

	const showMigrationQuestion =
		observabilityTool !== null && observabilityTool !== 'None';

	const handleNext = (): void => {
		const usesObservability =
			!observabilityTool?.includes('None') && observabilityTool !== null;

		logEvent('Org Onboarding: Answered', {
			usesObservability,
			observabilityTool,
			otherTool,
			usesOtel,
			migrationTimeline,
		});

		onNext({
			usesObservability,
			observabilityTool,
			otherTool,
			usesOtel,
			migrationTimeline,
		});
	};

	const isValidUsesObservability = (): boolean => {
		if (!observabilityTool || observabilityTool === '') {
			return false;
		}

		return !(
			!observabilityTool?.includes('None') &&
			observabilityTool === 'Others' &&
			otherTool === ''
		);
	};

	const getNextDisabledReason = (): string => {
		if (!observabilityTool) {
			return 'Select the observability tool you use';
		}
		if (observabilityTool === 'Others' && otherTool === '') {
			return 'Enter the observability tool you use';
		}
		if (showMigrationQuestion && migrationTimeline === null) {
			return 'Select your migration timeline';
		}
		return 'Tell us if you already use OpenTelemetry';
	};

	useEffect(() => {
		const isValidObservability = isValidUsesObservability();
		const isMigrationValid = !showMigrationQuestion || migrationTimeline !== null;

		if (usesOtel !== null && isValidObservability && isMigrationValid) {
			setIsNextDisabled(false);
		} else {
			setIsNextDisabled(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		usesOtel,
		observabilityTool,
		otherTool,
		migrationTimeline,
		showMigrationQuestion,
	]);

	const handleObservabilityToolChange = (value: string): void => {
		setObservabilityTool(value);
		if (value !== 'Others') {
			setOtherTool('');
		}
		if (value === 'None') {
			setMigrationTimeline(null);
		}
	};

	const handleOtelChange = (value: string): void => {
		setUsesOtel(value === 'yes');
	};

	return (
		<div className="questions-container">
			<div className="onboarding-header-section">
				<div className="onboarding-header-icon">🎉</div>
				<Typography.Title level={4} className="onboarding-header-title">
					Welcome to SigNoz Cloud
				</Typography.Title>
				<Typography.Text className="onboarding-header-subtitle">
					Let&apos;s get you started
				</Typography.Text>
			</div>

			<div className="questions-form-container">
				<div className="questions-form">
					<div className="form-group">
						<label className="question" htmlFor="observabilityTool">
							Which observability tool do you currently use?
						</label>
						<RadioGroup
							color="primary"
							textOverflow="visible"
							value={observabilityTool}
							onChange={handleObservabilityToolChange}
							items={Object.entries(observabilityTools).map(([tool, label]) => ({
								value: tool,
								label:
									tool === 'Others' && observabilityTool === 'Others' ? (
										<Input
											type="text"
											className="onboarding-questionaire-other-input"
											placeholder="What tool do you currently use?"
											value={otherTool || ''}
											autoFocus
											style={{ userSelect: 'text' }}
											onKeyDown={(e): void => e.stopPropagation()}
											onChange={(e): void => setOtherTool(e.target.value)}
										/>
									) : (
										label
									),
							}))}
						/>
					</div>

					{showMigrationQuestion && (
						<div className="form-group">
							<div className="question">
								What is your timeline for migrating to SigNoz?
							</div>
							<RadioGroup
								color="primary"
								value={migrationTimeline}
								onChange={setMigrationTimeline}
								items={Object.entries(migrationTimelineOptions).map(([key, label]) => ({
									value: key,
									label,
								}))}
							/>
						</div>
					)}

					<div className="form-group">
						<div className="question">Do you already use OpenTelemetry?</div>
						<RadioGroup
							color="primary"
							value={usesOtel === true ? 'yes' : usesOtel === false ? 'no' : null}
							onChange={handleOtelChange}
							items={[
								{ value: 'yes', label: 'Yes' },
								{ value: 'no', label: 'No' },
							]}
						/>
					</div>
				</div>

				<Button
					size="md"
					variant="solid"
					color="primary"
					width="100%"
					onClick={handleNext}
					disabled={isNextDisabled}
					disabledTooltip={getNextDisabledReason()}
					suffix={<ArrowRight size={12} />}
				>
					Next
				</Button>
			</div>
		</div>
	);
}

export default OrgQuestions;
