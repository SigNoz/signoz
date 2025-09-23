/* eslint-disable sonarjs/cognitive-complexity */
import '../OnboardingQuestionaire.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Input, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import editOrg from 'api/organization/editOrg';
import { useNotifications } from 'hooks/useNotifications';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
};

function OrgQuestions({
	currentOrgData,
	orgDetails,
	onNext,
}: OrgQuestionsProps): JSX.Element {
	const { user, updateOrg } = useAppContext();
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

	const [usesOtel, setUsesOtel] = useState<boolean | null>(
		orgDetails?.usesOtel || null,
	);

	const handleOrgNameUpdate = async (): Promise<void> => {
		/* Early bailout if orgData is not set or if the organisation name is not set or if the organisation name is empty or if the organisation name is the same as the one in the orgData */
		if (
			!currentOrgData ||
			!organisationName ||
			organisationName === '' ||
			orgDetails.organisationName === organisationName
		) {
			logEvent('Org Onboarding: Answered', {
				usesObservability: !observabilityTool?.includes('None'),
				observabilityTool,
				otherTool,
				usesOtel,
			});

			onNext({
				organisationName,
				usesObservability: !observabilityTool?.includes('None'),
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
					usesObservability: !observabilityTool?.includes('None'),
					observabilityTool,
					otherTool,
					usesOtel,
				});

				onNext({
					organisationName,
					usesObservability: !observabilityTool?.includes('None'),
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

	const handleOnNext = (): void => {
		handleOrgNameUpdate();
	};

	return (
		<div className="questions-container">
			<Typography.Title level={3} className="title">
				{user?.displayName ? `Welcome, ${user.displayName}!` : 'Welcome!'}
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
							id="organisationName"
							placeholder="For eg. Simpsonville..."
							autoComplete="off"
							value={organisationName}
							onChange={(e): void => setOrganisationName(e.target.value)}
						/>
					</div>

					<div className="form-group">
						<label className="question" htmlFor="observabilityTool">
							Which observability tool do you currently use?
						</label>
						<div className="two-column-grid">
							{Object.keys(observabilityTools).map((tool) => (
								<Button
									key={tool}
									type="primary"
									className={`onboarding-questionaire-button ${
										observabilityTool === tool ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool(tool)}
								>
									{observabilityTools[tool as keyof typeof observabilityTools]}

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
									value={otherTool || ''}
									autoFocus
									addonAfter={
										otherTool && otherTool !== '' ? (
											<CheckCircle size={12} color={Color.BG_FOREST_500} />
										) : (
											''
										)
									}
									onChange={(e): void => setOtherTool(e.target.value)}
								/>
							) : (
								<Button
									type="primary"
									className={`onboarding-questionaire-button ${
										observabilityTool === 'Others' ? 'active' : ''
									}`}
									onClick={(): void => setObservabilityTool('Others')}
								>
									Others
								</Button>
							)}
						</div>
					</div>

					<div className="form-group">
						<div className="question">Do you already use OpenTelemetry?</div>
						<div className="two-column-grid">
							<Button
								type="primary"
								name="usesObservability"
								className={`onboarding-questionaire-button ${
									usesOtel === true ? 'active' : ''
								}`}
								onClick={(): void => {
									setUsesOtel(true);
								}}
							>
								Yes{' '}
								{usesOtel === true && (
									<CheckCircle size={12} color={Color.BG_FOREST_500} />
								)}
							</Button>
							<Button
								type="primary"
								className={`onboarding-questionaire-button ${
									usesOtel === false ? 'active' : ''
								}`}
								onClick={(): void => {
									setUsesOtel(false);
								}}
							>
								No{' '}
								{usesOtel === false && (
									<CheckCircle size={12} color={Color.BG_FOREST_500} />
								)}
							</Button>
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
						{isLoading ? (
							<Loader2 className="animate-spin" />
						) : (
							<ArrowRight size={14} />
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}

export default OrgQuestions;
