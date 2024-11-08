/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Onboarding.styles.scss';

import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Card, Form, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import getIngestionData from 'api/settings/getIngestionData';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import FullScreenHeader from 'container/FullScreenHeader/FullScreenHeader';
import InviteUserModal from 'container/OrganizationSettings/InviteUserModal/InviteUserModal';
import { InviteMemberFormValues } from 'container/OrganizationSettings/PendingInvitesContainer';
import history from 'lib/history';
import { UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useEffectOnce } from 'react-use';

import ModuleStepsContainer from './common/ModuleStepsContainer/ModuleStepsContainer';
import { stepsMap } from './constants/stepsConfig';
import {
	OnboardingMethods,
	useOnboardingContext,
} from './context/OnboardingContext';
import { DataSourceType } from './Steps/DataSource/DataSource';
import {
	defaultApplicationDataSource,
	defaultAwsServices,
	defaultAzureServices,
	defaultInfraMetricsType,
	defaultLogsType,
	moduleRouteMap,
} from './utils/dataSourceUtils';
import {
	APM_STEPS,
	AWS_MONITORING_STEPS,
	AZURE_MONITORING_STEPS,
	getSteps,
	INFRASTRUCTURE_MONITORING_STEPS,
	LOGS_MANAGEMENT_STEPS,
} from './utils/getSteps';

export enum ModulesMap {
	APM = 'APM',
	LogsManagement = 'LogsManagement',
	InfrastructureMonitoring = 'InfrastructureMonitoring',
	AwsMonitoring = 'AwsMonitoring',
	AzureMonitoring = 'AzureMonitoring',
}

export interface ModuleProps {
	id: string;
	title: string;
	desc: string;
}

export interface SelectedModuleStepProps {
	id: string;
	title: string;
	component: any;
}

export const useCases = {
	APM: {
		id: ModulesMap.APM,
		title: 'Application Monitoring',
		desc:
			'Monitor application metrics like p99 latency, error rates, external API calls, and db calls.',
	},
	LogsManagement: {
		id: ModulesMap.LogsManagement,
		title: 'Logs Management',
		desc:
			'Easily filter and query logs, build dashboards and alerts based on attributes in logs',
	},
	InfrastructureMonitoring: {
		id: ModulesMap.InfrastructureMonitoring,
		title: 'Infrastructure Monitoring',
		desc:
			'Monitor Kubernetes infrastructure metrics, hostmetrics, or metrics of any third-party integration',
	},
	AwsMonitoring: {
		id: ModulesMap.AwsMonitoring,
		title: 'AWS Monitoring',
		desc:
			'Monitor your traces, logs and metrics for AWS services like EC2, ECS, EKS etc.',
	},
	AzureMonitoring: {
		id: ModulesMap.AzureMonitoring,
		title: 'Azure Monitoring',
		desc:
			'Monitor your traces, logs and metrics for Azure services like AKS, Container Apps, App Service etc.',
	},
};

export default function Onboarding(): JSX.Element {
	const [selectedModule, setSelectedModule] = useState<ModuleProps>(
		useCases.APM,
	);

	const [selectedModuleSteps, setSelectedModuleSteps] = useState(APM_STEPS);
	const [activeStep, setActiveStep] = useState(1);
	const [current, setCurrent] = useState(0);
	const { location } = history;
	const { t } = useTranslation(['onboarding']);

	const {
		selectedDataSource,
		selectedEnvironment,
		selectedMethod,
		updateSelectedModule,
		updateSelectedDataSource,
		resetProgress,
		updateActiveStep,
		updateIngestionData,
	} = useOnboardingContext();

	useEffectOnce(() => {
		logEvent('Onboarding V2 Started', {});
	});

	const { status, data: ingestionData } = useQuery({
		queryFn: () => getIngestionData(),
	});

	useEffect(() => {
		if (
			status === 'success' &&
			ingestionData &&
			ingestionData &&
			Array.isArray(ingestionData.payload)
		) {
			const payload = ingestionData.payload[0] || {
				ingestionKey: '',
				dataRegion: '',
			};

			updateIngestionData({
				SIGNOZ_INGESTION_KEY: payload?.ingestionKey,
				REGION: payload?.dataRegion,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [status, ingestionData?.payload]);

	const setModuleStepsBasedOnSelectedDataSource = (
		selectedDataSource: DataSourceType | null,
	): void => {
		if (selectedDataSource) {
			let steps: SelectedModuleStepProps[] = [];

			steps = getSteps({
				selectedDataSource,
			});

			setSelectedModuleSteps(steps);
		}
	};

	const removeStep = (
		stepToRemove: string,
		steps: SelectedModuleStepProps[],
	): SelectedModuleStepProps[] =>
		steps.filter((step) => step.id !== stepToRemove);

	const handleAPMSteps = (): void => {
		if (selectedEnvironment === 'kubernetes') {
			const updatedSteps = removeStep(stepsMap.selectMethod, APM_STEPS);
			setSelectedModuleSteps(updatedSteps);

			return;
		}

		if (selectedMethod === OnboardingMethods.QUICK_START) {
			const updatedSteps = removeStep(stepsMap.setupOtelCollector, APM_STEPS);
			setSelectedModuleSteps(updatedSteps);

			return;
		}

		setSelectedModuleSteps(APM_STEPS);
	};

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		if (selectedModule?.id === ModulesMap.InfrastructureMonitoring) {
			if (selectedDataSource) {
				setModuleStepsBasedOnSelectedDataSource(selectedDataSource);
			} else {
				setSelectedModuleSteps(INFRASTRUCTURE_MONITORING_STEPS);
				updateSelectedDataSource(defaultInfraMetricsType);
			}
		} else if (selectedModule?.id === ModulesMap.LogsManagement) {
			if (selectedDataSource) {
				setModuleStepsBasedOnSelectedDataSource(selectedDataSource);
			} else {
				setSelectedModuleSteps(LOGS_MANAGEMENT_STEPS);
				updateSelectedDataSource(defaultLogsType);
			}
		} else if (selectedModule?.id === ModulesMap.AwsMonitoring) {
			if (selectedDataSource) {
				setModuleStepsBasedOnSelectedDataSource(selectedDataSource);
			} else {
				setSelectedModuleSteps(AWS_MONITORING_STEPS);
				updateSelectedDataSource(defaultAwsServices);
			}
		} else if (selectedModule?.id === ModulesMap.AzureMonitoring) {
			if (selectedDataSource) {
				setModuleStepsBasedOnSelectedDataSource(selectedDataSource);
			} else {
				setSelectedModuleSteps(AZURE_MONITORING_STEPS);
				updateSelectedDataSource(defaultAzureServices);
			}
		} else if (selectedModule?.id === ModulesMap.APM) {
			handleAPMSteps();

			if (!selectedDataSource) {
				updateSelectedDataSource(defaultApplicationDataSource);
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedModule, selectedDataSource, selectedEnvironment, selectedMethod]);

	const handleNextStep = (): void => {
		if (activeStep <= 3) {
			const nextStep = activeStep + 1;

			// on next
			logEvent('Onboarding V2: Get Started', {
				selectedModule: selectedModule.id,
				nextStepId: nextStep,
			});

			setActiveStep(nextStep);
			setCurrent(current + 1);

			// set the active step info
			updateActiveStep({
				module: selectedModule,
				step: selectedModuleSteps[current],
			});
		}
	};

	const handleNext = (): void => {
		if (activeStep <= 3) {
			history.push(moduleRouteMap[selectedModule.id as ModulesMap]);
		}
	};

	const handleModuleSelect = (module: ModuleProps): void => {
		setSelectedModule(module);
		updateSelectedModule(module);
		updateSelectedDataSource(null);
	};

	const handleBackNavigation = (): void => {
		setCurrent(0);
		setActiveStep(1);
		setSelectedModule(useCases.APM);
		resetProgress();
	};

	useEffect(() => {
		const { pathname } = location;

		if (pathname === ROUTES.GET_STARTED_APPLICATION_MONITORING) {
			handleModuleSelect(useCases.APM);
			updateSelectedDataSource(defaultApplicationDataSource);
			handleNextStep();
		} else if (pathname === ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING) {
			handleModuleSelect(useCases.InfrastructureMonitoring);
			handleNextStep();
		} else if (pathname === ROUTES.GET_STARTED_LOGS_MANAGEMENT) {
			handleModuleSelect(useCases.LogsManagement);
			handleNextStep();
		} else if (pathname === ROUTES.GET_STARTED_AWS_MONITORING) {
			handleModuleSelect(useCases.AwsMonitoring);
			handleNextStep();
		} else if (pathname === ROUTES.GET_STARTED_AZURE_MONITORING) {
			handleModuleSelect(useCases.AzureMonitoring);
			handleNextStep();
		} else {
			handleBackNavigation();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname]);

	const [form] = Form.useForm<InviteMemberFormValues>();
	const [
		isInviteTeamMemberModalOpen,
		setIsInviteTeamMemberModalOpen,
	] = useState<boolean>(false);

	const toggleModal = useCallback(
		(value: boolean): void => {
			setIsInviteTeamMemberModalOpen(value);
			if (!value) {
				form.resetFields();
			}
		},
		[form],
	);

	return (
		<div className="container">
			{activeStep === 1 && (
				<div className="onboarding-page">
					<div
						onClick={(): void => {
							logEvent('Onboarding V2: Skip Button Clicked', {});
							history.push(ROUTES.APPLICATION);
						}}
						className="skip-to-console"
					>
						{t('skip')}
					</div>
					<FullScreenHeader />
					<div className="onboardingHeader">
						<h1>{t('select_use_case')}</h1>
					</div>
					<div className="modulesContainer">
						<div className="moduleContainerRowStyles">
							{Object.keys(ModulesMap).map((module) => {
								const selectedUseCase = (useCases as any)[module];

								return (
									<Card
										className={cx(
											'moduleStyles',
											selectedModule.id === selectedUseCase.id ? 'selected' : '',
										)}
										key={selectedUseCase.id}
										onClick={(): void => handleModuleSelect(selectedUseCase)}
									>
										<Typography.Title className="moduleTitleStyle" level={4}>
											{selectedUseCase.title}
										</Typography.Title>
										<Typography.Paragraph className="moduleDesc">
											{selectedUseCase.desc}
										</Typography.Paragraph>
									</Card>
								);
							})}
						</div>
					</div>
					<div className="continue-to-next-step">
						<Button type="primary" icon={<ArrowRightOutlined />} onClick={handleNext}>
							{t('get_started')}
						</Button>
					</div>
					<div className="invite-member-wrapper">
						<Typography.Text className="helper-text">
							{t('invite_user_helper_text')}
						</Typography.Text>
						<div className="invite-member">
							<Typography.Text>{t('invite_user')}</Typography.Text>
							<Button
								onClick={(): void => {
									logEvent('Onboarding V2: Invite Member', {
										module: selectedModule?.id,
										page: 'homepage',
									});
									setIsInviteTeamMemberModalOpen(true);
								}}
								icon={<UserPlus size={16} />}
								type="primary"
							>
								{t('invite')}
							</Button>
						</div>
					</div>
				</div>
			)}

			{activeStep > 1 && (
				<div className="stepsContainer">
					<ModuleStepsContainer
						onReselectModule={(): void => {
							setCurrent(current - 1);
							setActiveStep(activeStep - 1);
							setSelectedModule(useCases.APM);
							resetProgress();
							history.push(ROUTES.GET_STARTED);
						}}
						selectedModule={selectedModule}
						selectedModuleSteps={selectedModuleSteps}
						setIsInviteTeamMemberModalOpen={setIsInviteTeamMemberModalOpen}
					/>
				</div>
			)}
			<InviteUserModal
				form={form}
				isInviteTeamMemberModalOpen={isInviteTeamMemberModalOpen}
				toggleModal={toggleModal}
			/>
		</div>
	);
}
