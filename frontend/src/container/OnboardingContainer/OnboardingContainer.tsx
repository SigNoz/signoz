/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Onboarding.styles.scss';

import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Card, Typography } from 'antd';
import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useEffect, useState } from 'react';
import { useEffectOnce } from 'react-use';
import { trackEvent } from 'utils/segmentAnalytics';

import ModuleStepsContainer from './common/ModuleStepsContainer/ModuleStepsContainer';
import { useOnboardingContext } from './context/OnboardingContext';
import ConnectionStatus from './Steps/ConnectionStatus/ConnectionStatus';
import DataSource from './Steps/DataSource/DataSource';
import EnvironmentDetails from './Steps/EnvironmentDetails/EnvironmentDetails';
import InstallOpenTelemetry from './Steps/InstallOpenTelemetry/InstallOpenTelemetry';
import RunApplication from './Steps/RunApplication/RunApplication';
import SelectMethod from './Steps/SelectMethod/SelectMethod';
import SetupOtelCollector from './Steps/SetupOtelCollector/SetupOtelCollector';

export enum ModulesMap {
	APM = 'APM',
	LogsManagement = 'LogsManagement',
	InfrastructureMonitoring = 'InfrastructureMonitoring',
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
};

const dataSourceStep: SelectedModuleStepProps = {
	id: 'data-source',
	title: 'Data Source',
	component: <DataSource />,
};

const envDetailsStep: SelectedModuleStepProps = {
	id: 'environment-details',
	title: 'Environment Details',
	component: <EnvironmentDetails />,
};

const selectMethodStep: SelectedModuleStepProps = {
	id: 'select-method',
	title: 'Select Method',
	component: <SelectMethod />,
};

const setupOtelCollectorStep: SelectedModuleStepProps = {
	id: 'setup-otel-collector',
	title: 'Setup Otel Collector',
	component: <SetupOtelCollector />,
};

const installOpenTelemetryStep: SelectedModuleStepProps = {
	id: 'install-openTelemetry',
	title: 'Install OpenTelemetry',
	component: <InstallOpenTelemetry />,
};

const runApplicationStep: SelectedModuleStepProps = {
	id: 'run-application',
	title: 'Run Application',
	component: <RunApplication />,
};

const testConnectionStep: SelectedModuleStepProps = {
	id: 'test-connection',
	title: 'Test Connection',
	component: <ConnectionStatus />,
};

const APM_STEPS: SelectedModuleStepProps[] = [
	dataSourceStep,
	envDetailsStep,
	selectMethodStep,
	setupOtelCollectorStep,
	installOpenTelemetryStep,
	runApplicationStep,
	testConnectionStep,
];

const LOGS_MANAGEMENT_STEPS: SelectedModuleStepProps[] = [
	dataSourceStep,
	envDetailsStep,
	setupOtelCollectorStep,
	installOpenTelemetryStep,
	runApplicationStep,
	testConnectionStep,
];

const INFRASTRUCTURE_MONITORING_STEPS: SelectedModuleStepProps[] = [
	dataSourceStep,
	envDetailsStep,
	setupOtelCollectorStep,
	installOpenTelemetryStep,
	runApplicationStep,
	testConnectionStep,
];

export default function Onboarding(): JSX.Element {
	const [selectedModule, setSelectedModule] = useState<ModuleProps>(
		useCases.APM,
	);

	const [selectedModuleSteps, setSelectedModuleSteps] = useState(APM_STEPS);
	const [activeStep, setActiveStep] = useState(1);
	const [current, setCurrent] = useState(0);
	const isDarkMode = useIsDarkMode();

	const { updateSelectedModule, resetProgress } = useOnboardingContext();

	useEffectOnce(() => {
		trackEvent('Onboarding Started');
	});

	useEffect(() => {
		if (selectedModule?.id === ModulesMap.InfrastructureMonitoring) {
			setSelectedModuleSteps(INFRASTRUCTURE_MONITORING_STEPS);
		} else if (selectedModule?.id === ModulesMap.LogsManagement) {
			setSelectedModuleSteps(LOGS_MANAGEMENT_STEPS);
		} else if (selectedModule?.id === ModulesMap.APM) {
			setSelectedModuleSteps(APM_STEPS);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedModule]);

	useEffect(() => {
		// on select
		trackEvent('Onboarding: Module Selected', {
			selectedModule: selectedModule.id,
		});
	}, [selectedModule]);

	const handleNext = (): void => {
		// Need to add logic to validate service name and then allow next step transition in APM module
		const isFormValid = true;

		if (isFormValid && activeStep <= 3) {
			const nextStep = activeStep + 1;

			// on next
			trackEvent('Onboarding: Next', {
				selectedModule: selectedModule.id,
				nextStepId: nextStep,
			});

			setActiveStep(nextStep);
			setCurrent(current + 1);
		}
	};

	const handleModuleSelect = (module: ModuleProps): void => {
		setSelectedModule(module);
		updateSelectedModule(module);
	};

	return (
		<div className={cx('container', isDarkMode ? 'darkMode' : 'lightMode')}>
			{activeStep === 1 && (
				<>
					<div className="onboardingHeader">
						<h1>Get Started with SigNoz</h1>
						<div> Select a use-case to get started </div>
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
										style={{
											backgroundColor: isDarkMode ? '#000' : '#FFF',
										}}
										key={selectedUseCase.id}
										onClick={(): void => handleModuleSelect(selectedUseCase)}
									>
										<Typography.Title
											className="moduleTitleStyle"
											level={4}
											style={{
												borderBottom: isDarkMode ? '1px solid #303030' : '1px solid #ddd',
												backgroundColor: isDarkMode ? '#141414' : '#FFF',
											}}
										>
											{selectedUseCase.title}
										</Typography.Title>
										<Typography.Paragraph
											className="moduleDesc"
											style={{ backgroundColor: isDarkMode ? '#000' : '#FFF' }}
										>
											{selectedUseCase.desc}
										</Typography.Paragraph>
									</Card>
								);
							})}
						</div>
					</div>

					<div className="continue-to-next-step">
						<Button type="primary" icon={<ArrowRightOutlined />} onClick={handleNext}>
							Get Started
						</Button>
					</div>
				</>
			)}

			{activeStep > 1 && (
				<div className="stepsContainer">
					<ModuleStepsContainer
						onReselectModule={(): void => {
							setCurrent(current - 1);
							setActiveStep(activeStep - 1);
							setSelectedModule(useCases.APM);
							resetProgress();
						}}
						selectedModule={selectedModule}
						selectedModuleSteps={selectedModuleSteps}
					/>
				</div>
			)}
		</div>
	);
}
