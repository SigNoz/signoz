/* eslint-disable sonarjs/cognitive-complexity */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@signozhq/button';
import { Input } from '@signozhq/input';
import {
	RadioGroup,
	RadioGroupItem,
	RadioGroupLabel,
} from '@signozhq/radio-group';
import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import editOrg from 'api/organization/editOrg';
import { useNotifications } from 'hooks/useNotifications';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAppContext } from 'providers/App/App';

import '../OnboardingQuestionaire.styles.scss';

export interface OrgData {
	id: string;
	displayName: string;
}

export interface OrgDetails {
	organisationName: string;
	usesObservability: boolean | null;
	observabilityTool: string | null;
	otherTool: string | null;
	usesOtel: boolean | null;
	migrationTimeline: string | null;
}

interface OrgQuestionsProps {
	currentOrgData: OrgData | null;
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

function OrgQuestions({
	currentOrgData,
	orgDetails,
	onNext,
}: OrgQuestionsProps): JSX.Element {
	const { updateOrg } = useAppContext();
	const { notifications } = useNotifications();

	const { t } = useTranslation(['organizationsettings', 'common']);

	const [organisationName, setOrganisationName] = useState<string>(
		orgDetails?.organisationName || '',
	);
	const [observabilityTool, setObservabilityTool] = useState<string | null>(
		orgDetails?.observabilityTool || null,
	);
	const [otherTool, setOtherTool] = useState<string>(
		orgDetails?.otherTool || '',
	);
	const [isNextDisabled, setIsNextDisabled] = useState<boolean>(true);

	useEffect(() => {
		setOrganisationName(orgDetails.organisationName);
	}, [orgDetails.organisationName]);

	const [isLoading, setIsLoading] = useState<boolean>(false);

	const [usesOtel, setUsesOtel] = useState<boolean | null>(orgDetails.usesOtel);
	const [migrationTimeline, setMigrationTimeline] = useState<string | null>(
		null,
	);

	const showMigrationQuestion =
		observabilityTool !== null && observabilityTool !== 'None';

	const handleOrgNameUpdate = async (): Promise<void> => {
		const usesObservability =
			!observabilityTool?.includes('None') && observabilityTool !== null;

		/* Early bailout if orgData is not set or if the organisation name is not set or if the organisation name is empty or if the organisation name is the same as the one in the orgData */
		if (
			!currentOrgData ||
			!organisationName ||
			organisationName === '' ||
			orgDetails.organisationName === organisationName
		) {
			logEvent('Org Onboarding: Answered', {
				usesObservability,
				observabilityTool,
				otherTool,
				usesOtel,
				migrationTimeline,
			});

			onNext({
				organisationName,
				usesObservability,
				observabilityTool,
				otherTool,
				usesOtel,
				migrationTimeline,
			});

			return;
		}

		try {
			setIsLoading(true);
			const { statusCode, error } = await editOrg({
				displayName: organisationName,
				orgId: currentOrgData.id,
			});
			if (statusCode === 204) {
				updateOrg(currentOrgData?.id, organisationName);

				logEvent('Org Onboarding: Org Name Updated', {
					organisationName,
				});

				logEvent('Org Onboarding: Answered', {
					usesObservability,
					observabilityTool,
					otherTool,
					usesOtel,
					migrationTimeline,
				});

				onNext({
					organisationName,
					usesObservability,
					observabilityTool,
					otherTool,
					usesOtel,
					migrationTimeline,
				});
			} else {
				logEvent('Org Onboarding: Org Name Update Failed', {
					organisationName: orgDetails.organisationName,
				});

				notifications.error({
					message:
						error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	const isValidUsesObservability = (): boolean => {
		if (!observabilityTool || observabilityTool === '') {
			return false;
		}

		// eslint-disable-next-line sonarjs/prefer-single-boolean-return
		if (
			!observabilityTool?.includes('None') &&
			observabilityTool === 'Others' &&
			otherTool === ''
		) {
			return false;
		}

		return true;
	};

	useEffect(() => {
		const isValidObservability = isValidUsesObservability();
		const isMigrationValid = !showMigrationQuestion || migrationTimeline !== null;

		if (
			organisationName !== '' &&
			usesOtel !== null &&
			isValidObservability &&
			isMigrationValid
		) {
			setIsNextDisabled(false);
		} else {
			setIsNextDisabled(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		organisationName,
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

	const handleOnNext = (): void => {
		handleOrgNameUpdate();
	};

	return (
		<div className="questions-container">
			<div className="onboarding-header-section">
				<div className="onboarding-header-icon">🎉</div>
				<Typography.Title level={4} className="onboarding-header-title">
					Welcome to SigNoz Cloud
				</Typography.Title>
				<Typography.Paragraph className="onboarding-header-subtitle">
					Let&apos;s get you started
				</Typography.Paragraph>
			</div>

			<div className="questions-form-container">
				<div className="questions-form">
					<div className="form-group">
						<label className="question" htmlFor="observabilityTool">
							Which observability tool do you currently use?
						</label>
						<RadioGroup
							value={observabilityTool || ''}
							onValueChange={handleObservabilityToolChange}
							className="observability-tools-radio-container"
						>
							{Object.entries(observabilityTools).map(([tool, label]) => {
								if (tool === 'Others') {
									return (
										<div
											key={tool}
											className="radio-item observability-tool-radio-item observability-tool-others-item"
										>
											<RadioGroupItem value={tool} id={`radio-${tool}`} />
											{observabilityTool === 'Others' ? (
												<Input
													type="text"
													className="onboarding-questionaire-other-input"
													placeholder="What tool do you currently use?"
													value={otherTool || ''}
													autoFocus
													onChange={(e): void => setOtherTool(e.target.value)}
												/>
											) : (
												<RadioGroupLabel htmlFor={`radio-${tool}`}>{label}</RadioGroupLabel>
											)}
										</div>
									);
								}
								return (
									<div key={tool} className="radio-item observability-tool-radio-item">
										<RadioGroupItem value={tool} id={`radio-${tool}`} />
										<RadioGroupLabel htmlFor={`radio-${tool}`}>{label}</RadioGroupLabel>
									</div>
								);
							})}
						</RadioGroup>
					</div>

					{showMigrationQuestion && (
						<div className="form-group">
							<div className="question">
								What is your timeline for migrating to SigNoz?
							</div>
							<RadioGroup
								value={migrationTimeline || ''}
								onValueChange={setMigrationTimeline}
								className="migration-timeline-radio-container"
							>
								{Object.entries(migrationTimelineOptions).map(([key, label]) => (
									<div key={key} className="radio-item migration-timeline-radio-item">
										<RadioGroupItem value={key} id={`radio-migration-${key}`} />
										<RadioGroupLabel htmlFor={`radio-migration-${key}`}>
											{label}
										</RadioGroupLabel>
									</div>
								))}
							</RadioGroup>
						</div>
					)}

					<div className="form-group">
						<div className="question">Do you already use OpenTelemetry?</div>
						<RadioGroup
							value={usesOtel === true ? 'yes' : usesOtel === false ? 'no' : ''}
							onValueChange={handleOtelChange}
							className="opentelemetry-radio-container"
						>
							<div className="radio-item opentelemetry-radio-item">
								<RadioGroupItem value="yes" id="radio-otel-yes" />
								<RadioGroupLabel htmlFor="radio-otel-yes">Yes</RadioGroupLabel>
							</div>
							<div className="radio-item opentelemetry-radio-item">
								<RadioGroupItem value="no" id="radio-otel-no" />
								<RadioGroupLabel htmlFor="radio-otel-no">No</RadioGroupLabel>
							</div>
						</RadioGroup>
					</div>
				</div>

				<Button
					variant="solid"
					color="primary"
					className={`onboarding-next-button ${isNextDisabled ? 'disabled' : ''}`}
					onClick={handleOnNext}
					disabled={isNextDisabled}
					suffixIcon={
						isLoading ? (
							<Loader2 className="animate-spin" size={12} />
						) : (
							<ArrowRight size={12} />
						)
					}
				>
					Next
				</Button>
			</div>
		</div>
	);
}

export default OrgQuestions;
