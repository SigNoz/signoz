/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/jsx-no-comment-textnodes */
/* eslint-disable sonarjs/prefer-single-boolean-return */
import './ModuleStepsContainer.styles.scss';

import {
	ArrowLeftOutlined,
	ArrowRightOutlined,
	LeftCircleOutlined,
} from '@ant-design/icons';
import { Button, Space, Steps, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import LaunchChatSupport from 'components/LaunchChatSupport/LaunchChatSupport';
import { onboardingHelpMessage } from 'components/LaunchChatSupport/util';
import ROUTES from 'constants/routes';
import { stepsMap } from 'container/OnboardingContainer/constants/stepsConfig';
import { DataSourceType } from 'container/OnboardingContainer/Steps/DataSource/DataSource';
import { hasFrameworks } from 'container/OnboardingContainer/utils/dataSourceUtils';
import history from 'lib/history';
import { isEmpty, isNull } from 'lodash-es';
import { UserPlus } from 'lucide-react';
import { SetStateAction, useState } from 'react';

import { useOnboardingContext } from '../../context/OnboardingContext';
import {
	ModuleProps,
	ModulesMap,
	SelectedModuleStepProps,
	useCases,
} from '../../OnboardingContainer';

interface ModuleStepsContainerProps {
	onReselectModule: any;
	selectedModule: ModuleProps;
	selectedModuleSteps: SelectedModuleStepProps[];
	setIsInviteTeamMemberModalOpen: (value: SetStateAction<boolean>) => void;
}

interface MetaDataProps {
	name: string;
	value: string;
}

const defaultMetaData = [
	{
		name: 'Service Name',
		value: '',
	},
	{
		name: 'Data Source',
		value: '',
	},
	{
		name: 'Framework',
		value: '',
	},
	{
		name: 'Environment',
		value: '',
	},
];

export default function ModuleStepsContainer({
	onReselectModule,
	selectedModule,
	selectedModuleSteps,
	setIsInviteTeamMemberModalOpen,
}: ModuleStepsContainerProps): JSX.Element {
	const {
		activeStep,
		serviceName,
		selectedDataSource,
		selectedEnvironment,
		selectedFramework,
		selectedMethod,
		updateActiveStep,
		updateErrorDetails,
		resetProgress,
	} = useOnboardingContext();

	const [current, setCurrent] = useState(0);
	const [metaData, setMetaData] = useState<MetaDataProps[]>(defaultMetaData);
	const lastStepIndex = selectedModuleSteps.length - 1;

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const isValidForm = (): boolean => {
		const { id: selectedModuleID } = selectedModule;
		const dataSourceStep = stepsMap.dataSource;
		const environmentDetailsStep = stepsMap.environmentDetails;

		const { step } = activeStep;

		const {
			name: selectedDataSourceName = '',
		} = selectedDataSource as DataSourceType;

		if (
			step.id === environmentDetailsStep &&
			(selectedEnvironment === '' || isNull(selectedEnvironment))
		) {
			updateErrorDetails('Please select environment');
			return false;
		}

		updateErrorDetails(null);

		if (
			selectedModuleID === useCases.APM.id &&
			selectedModuleSteps[current].id === dataSourceStep
		) {
			if (serviceName !== '' && selectedDataSourceName) {
				const doesHaveFrameworks = hasFrameworks({
					module: selectedModule,
					dataSource: selectedDataSource,
				});

				if (
					doesHaveFrameworks &&
					(selectedFramework === null || selectedFramework === '')
				) {
					return false;
				}

				return true;
			}

			return false;
		}

		if (
			(selectedModuleID === useCases.InfrastructureMonitoring.id &&
				selectedModuleSteps[current].id === dataSourceStep &&
				!selectedDataSourceName) ||
			(selectedModuleID === useCases.LogsManagement.id &&
				selectedModuleSteps[current].id === dataSourceStep &&
				!selectedDataSourceName)
		) {
			return false;
		}

		return true;
	};

	const redirectToModules = (): void => {
		logEvent('Onboarding V2 Complete', {
			module: selectedModule.id,
			dataSource: selectedDataSource?.id,
			framework: selectedFramework,
			environment: selectedEnvironment,
			selectedMethod,
			serviceName,
		});

		if (selectedModule.id === ModulesMap.APM) {
			history.push(ROUTES.APPLICATION);
		} else if (selectedModule.id === ModulesMap.LogsManagement) {
			history.push(ROUTES.LOGS_EXPLORER);
		} else if (selectedModule.id === ModulesMap.InfrastructureMonitoring) {
			history.push(ROUTES.APPLICATION);
		} else if (selectedModule.id === ModulesMap.AwsMonitoring) {
			history.push(ROUTES.APPLICATION);
		} else {
			history.push(ROUTES.APPLICATION);
		}
	};

	const handleNext = (): void => {
		const isValid = isValidForm();

		if (isValid) {
			if (current === lastStepIndex) {
				resetProgress();
				redirectToModules();
				return;
			}

			if (current >= 0) {
				setCurrent(current + 1);

				// set the active step info
				updateActiveStep({
					module: selectedModule,
					step: selectedModuleSteps[current + 1],
				});
				// on next step click track events
				switch (selectedModuleSteps[current].id) {
					case stepsMap.dataSource:
						logEvent('Onboarding V2: Data Source Selected', {
							dataSource: selectedDataSource?.id,
							framework: selectedFramework,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.environmentDetails:
						logEvent('Onboarding V2: Environment Selected', {
							dataSource: selectedDataSource?.id,
							framework: selectedFramework,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.selectMethod:
						logEvent('Onboarding V2: Method Selected', {
							dataSource: selectedDataSource?.id,
							framework: selectedFramework,
							environment: selectedEnvironment,
							selectedMethod,
							module: activeStep?.module?.id,
						});
						break;

					case stepsMap.setupOtelCollector:
						logEvent('Onboarding V2: Setup Otel Collector', {
							dataSource: selectedDataSource?.id,
							framework: selectedFramework,
							environment: selectedEnvironment,
							selectedMethod,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.instrumentApplication:
						logEvent('Onboarding V2: Instrument Application', {
							dataSource: selectedDataSource?.id,
							framework: selectedFramework,
							environment: selectedEnvironment,
							selectedMethod,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.cloneRepository:
						logEvent('Onboarding V2: Clone Repository', {
							dataSource: selectedDataSource?.id,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.runApplication:
						logEvent('Onboarding V2: Run Application', {
							dataSource: selectedDataSource?.id,
							framework: selectedFramework,
							environment: selectedEnvironment,
							selectedMethod,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.addHttpDrain:
						logEvent('Onboarding V2: Add HTTP Drain', {
							dataSource: selectedDataSource?.id,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.startContainer:
						logEvent('Onboarding V2: Start Container', {
							dataSource: selectedDataSource?.id,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.setupLogDrains:
						logEvent('Onboarding V2: Setup Log Drains', {
							dataSource: selectedDataSource?.id,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.configureReceiver:
						logEvent('Onboarding V2: Configure Receiver', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.configureAws:
						logEvent('Onboarding V2: Configure AWS', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.sendLogsCloudwatch:
						logEvent('Onboarding V2: Send Logs Cloudwatch', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.setupDaemonService:
						logEvent('Onboarding V2: Setup ECS Daemon Service', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.createOtelConfig:
						logEvent('Onboarding V2: Create ECS OTel Config', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.createDaemonService:
						logEvent('Onboarding V2: Create ECS Daemon Service', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.ecsSendData:
						logEvent('Onboarding V2: ECS send traces data', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.createSidecarCollectorContainer:
						logEvent('Onboarding V2: ECS create Sidecar Container', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.deployTaskDefinition:
						logEvent('Onboarding V2: ECS deploy task definition', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.ecsSendLogsData:
						logEvent('Onboarding V2: ECS Fargate send logs data', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					case stepsMap.monitorDashboard:
						logEvent('Onboarding V2: EKS monitor dashboard', {
							dataSource: selectedDataSource?.id,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
						});
						break;
					default:
						break;
				}
			}

			// set meta data
			if (current === 0 || current === 1) {
				setMetaData([
					{
						name: 'Service Name',
						value: serviceName,
					},
					{
						name: 'Data Source',
						value: selectedDataSource?.name || '',
					},
					{
						name: 'Framework',
						value: selectedFramework || '',
					},
					{
						name: 'Environment',
						value: selectedEnvironment,
					},
				]);
			}
		}
	};

	const handlePrev = (): void => {
		if (current > 0) {
			setCurrent(current - 1);

			// set the active step info
			updateActiveStep({
				module: selectedModule,
				step: selectedModuleSteps[current - 1],
			});
		}
	};

	const handleLogoClick = (): void => {
		history.push('/');
	};

	return (
		<div className="onboarding-module-steps">
			<div className="steps-container">
				<div>
					<div className="steps-container-header">
						<div className="brand-logo" onClick={handleLogoClick}>
							<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />

							<div className="brand-logo-name">SigNoz</div>
						</div>
					</div>

					<Space style={{ marginBottom: '24px' }}>
						<Button
							style={{ display: 'flex', alignItems: 'center' }}
							type="default"
							icon={<LeftCircleOutlined />}
							onClick={onReselectModule}
						>
							{selectedModule.title}
						</Button>
					</Space>

					<Steps
						direction="vertical"
						size="small"
						status="finish"
						current={current}
						items={selectedModuleSteps}
					/>
				</div>
				<Button
					onClick={(): void => {
						logEvent('Onboarding V2: Invite Member', {
							module: selectedModule?.id,
							page: 'sidebar',
						});
						setIsInviteTeamMemberModalOpen(true);
					}}
					icon={<UserPlus size={16} />}
					className="invite-user-btn"
				>
					Invite teammates
				</Button>
			</div>

			<div className="selected-step-content">
				<div className="step-data">
					{current > 0 && (
						<div className="selected-step-pills">
							{metaData.map((data) => {
								if (isEmpty(data?.value)) {
									return null;
								}

								if (
									selectedModuleSteps[current]?.id === 'environment-details' &&
									data?.name === 'Environment'
								) {
									return null;
								}

								return (
									<div key={data.name} className="entity">
										<Typography.Text className="entity-name">{data.name}</Typography.Text>
										<Typography.Text className="entity-value">
											{data.value}
										</Typography.Text>
									</div>
								);
							})}
						</div>
					)}

					<div className="step-content">
						{selectedModuleSteps[current].component}
					</div>
				</div>

				<div className="step-actions actionButtonsContainer">
					<Button
						onClick={handlePrev}
						disabled={current === 0}
						icon={<ArrowLeftOutlined />}
					>
						Back
					</Button>
					<Button onClick={handleNext} type="primary" icon={<ArrowRightOutlined />}>
						{current < lastStepIndex ? 'Continue to next step' : 'Done'}
					</Button>
					<LaunchChatSupport
						attributes={{
							dataSource: selectedDataSource?.id,
							framework: selectedFramework,
							environment: selectedEnvironment,
							module: activeStep?.module?.id,
							step: activeStep?.step?.id,
							screen: 'Onboarding',
						}}
						eventName="Onboarding V2: Facing Issues Sending Data to SigNoz"
						message={onboardingHelpMessage(
							selectedDataSource?.name || '',
							activeStep?.module?.id,
						)}
						buttonText="Facing issues sending data to SigNoz?"
						onHoverText="Click here to get help with sending data to SigNoz"
					/>
				</div>
			</div>
		</div>
	);
}
