/* eslint-disable sonarjs/cognitive-complexity */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@signozhq/button';
import { Checkbox } from '@signozhq/checkbox';
import { Input } from '@signozhq/input';
import { Radio, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/es/radio';
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
			});

			onNext({
				organisationName,
				usesObservability,
				observabilityTool,
				otherTool,
				usesOtel,
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
				});

				onNext({
					organisationName,
					usesObservability,
					observabilityTool,
					otherTool,
					usesOtel,
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

		if (organisationName !== '' && usesOtel !== null && isValidObservability) {
			setIsNextDisabled(false);
		} else {
			setIsNextDisabled(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [organisationName, usesOtel, observabilityTool, otherTool]);

	const createObservabilityToolHandler = (tool: string) => (
		checked: boolean,
	): void => {
		if (checked) {
			setObservabilityTool(tool);
		} else if (observabilityTool === tool) {
			setObservabilityTool(null);
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
						<label className="question" htmlFor="organisationName">
							Name of your company
						</label>
						<Input
							type="text"
							name="organisationName"
							id="organisationName"
							placeholder="e.g. Simpsonville"
							autoComplete="off"
							value={organisationName}
							onChange={(e): void => setOrganisationName(e.target.value)}
						/>
					</div>

					<div className="form-group">
						<label className="question" htmlFor="observabilityTool">
							Which observability tool do you currently use?
						</label>
						<div className="observability-tools-checkbox-container">
							{Object.entries(observabilityTools).map(([tool, label]) => {
								if (tool === 'Others') {
									return (
										<div
											key={tool}
											className="checkbox-item observability-tool-checkbox-item observability-tool-others-item"
										>
											<Checkbox
												id={`checkbox-${tool}`}
												checked={observabilityTool === tool}
												onCheckedChange={createObservabilityToolHandler(tool)}
												labelName={observabilityTool === 'Others' ? '' : label}
											/>
											{observabilityTool === 'Others' && (
												<Input
													type="text"
													className="onboarding-questionaire-other-input"
													placeholder="What tool do you currently use?"
													value={otherTool || ''}
													autoFocus
													onChange={(e): void => setOtherTool(e.target.value)}
												/>
											)}
										</div>
									);
								}
								return (
									<div
										key={tool}
										className="checkbox-item observability-tool-checkbox-item"
									>
										<Checkbox
											id={`checkbox-${tool}`}
											checked={observabilityTool === tool}
											onCheckedChange={createObservabilityToolHandler(tool)}
											labelName={label}
										/>
									</div>
								);
							})}
						</div>
					</div>

					<div className="form-group">
						<div className="question">Do you already use OpenTelemetry?</div>
						<div className="opentelemetry-radio-container">
							<Radio.Group
								value={((): string | undefined => {
									if (usesOtel === true) {
										return 'yes';
									}
									if (usesOtel === false) {
										return 'no';
									}
									return undefined;
								})()}
								onChange={(e: RadioChangeEvent): void =>
									handleOtelChange(e.target.value)
								}
								className="opentelemetry-radio-group"
							>
								<div className="opentelemetry-radio-items-wrapper">
									<Radio value="yes" className="opentelemetry-radio-item">
										Yes
									</Radio>
									<Radio value="no" className="opentelemetry-radio-item">
										No
									</Radio>
								</div>
							</Radio.Group>
						</div>
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
