/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './Onboarding.styles.scss';

import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Button, Steps } from 'antd';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import { useIsDarkMode } from 'hooks/useDarkMode';
import history from 'lib/history';
import { useEffect, useState } from 'react';

import APM from './APM/APM';
import DistributedTracing from './DistributedTracing/DistributedTracing';
import InfrastructureMonitoring from './InfrastructureMonitoring/InfrastructureMonitoring';
import LogsManagement from './LogsManagement/LogsManagement';

const modulesMap = {
	APM: 'APM',
	DistributedTracing: 'Distributed_Tracing',
	LogsManagement: 'Logs_Management',
	InfrastructureMonitoring: 'Infrastructure Monitoring',
};

const defaultStepDesc = 'Configure data source';
const getStarted = 'Get Started';
const selectUseCase = 'Select the use-case';
const instrumentApp = 'Instrument Application';
const testConnection = 'Test Connection';

const useCases = {
	APM: {
		id: modulesMap.APM,
		title: 'Application Monitoring',
		desc:
			'Monitor performance of your applications & troubleshoot problems by installing within your infra.',
		stepDesc: defaultStepDesc,
	},
	DistributedTracing: {
		id: modulesMap.DistributedTracing,
		title: 'Distributed Tracing',
		desc:
			'Get end-to-end visibility of the services with contextual tags and attributes, run insights faster and get relevant metrics.',
		stepDesc: defaultStepDesc,
	},
	LogsManagement: {
		id: modulesMap.LogsManagement,
		title: 'Logs Management',
		desc:
			'Easily search and filter logs with query builder and automatically detect logs from K8s cluster.',
		stepDesc: 'Choose the logs that you want to receive on SigNoz',
	},
	InfrastructureMonitoring: {
		id: modulesMap.InfrastructureMonitoring,
		title: 'Infrastructure Monitoring',
		desc:
			'Easily search and filter logs with query builder and automatically detect logs from K8s cluster.',
		stepDesc: defaultStepDesc,
	},
};

const defaultSteps = [
	{
		title: getStarted,
		description: selectUseCase,
		step: 1,
	},
	{
		title: instrumentApp,
		description: defaultStepDesc,
		step: 2,
	},
	{
		title: testConnection,
		description: 'Verify that you’ve instrumented your application ',
		step: 3,
	},
];

export default function Onboarding(): JSX.Element {
	const [selectedModule, setSelectedModule] = useState(useCases.APM);
	const [steps, setsteps] = useState(defaultSteps);
	const [activeStep, setActiveStep] = useState(1);
	const [current, setCurrent] = useState(0);
	const isDarkMode = useIsDarkMode();

	useEffect(() => {
		if (selectedModule?.id === modulesMap.InfrastructureMonitoring) {
			setsteps([
				{
					title: getStarted,
					description: selectUseCase,
					step: 1,
				},
				{
					title: instrumentApp,
					description: selectedModule.stepDesc,
					step: 2,
				},
			]);
		} else {
			setsteps([
				{
					title: getStarted,
					description: selectUseCase,
					step: 1,
				},
				{
					title: instrumentApp,
					description: selectedModule.stepDesc,
					step: 2,
				},
				{
					title: testConnection,
					description: 'Verify that you’ve instrumented your application ',
					step: 3,
				},
			]);
		}
	}, [selectedModule]);

	const handleNext = (): void => {
		// Need to add logic to validate service name and then allow next step transition in APM module
		const isFormValid = true;

		if (isFormValid && activeStep <= 3) {
			setActiveStep(activeStep + 1);
			setCurrent(current + 1);
		}
	};

	const handlePrev = (): void => {
		if (activeStep >= 1) {
			setCurrent(current - 1);
			setActiveStep(activeStep - 1);
		}
	};

	const handleOnboardingComplete = (): void => {
		switch (selectedModule.id) {
			case modulesMap.APM:
				history.push(ROUTES.APPLICATION);
				break;
			case modulesMap.DistributedTracing:
				history.push(ROUTES.TRACE);
				break;
			case modulesMap.LogsManagement:
				history.push(ROUTES.LOGS);
				break;
			case modulesMap.InfrastructureMonitoring:
				history.push(ROUTES.APPLICATION);
				break;
			default:
				break;
		}
	};

	const handleStepChange = (value: number): void => {
		setCurrent(value);
		setActiveStep(value + 1);
	};

	const handleModuleSelect = (moduleName): void => {
		setSelectedModule(moduleName);
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
							<div
								className={cx(
									'moduleStyles',
									selectedModule.id === useCases.APM.id ? 'selected' : '',
								)}
								key={useCases.APM.id}
								onClick={(): void => handleModuleSelect(useCases.APM)}
							>
								<div className="moduleTitleStyle">{useCases.APM.title}</div>
								<div className="moduleDesc"> {useCases.APM.desc} </div>
							</div>

							<div
								className={cx(
									'moduleStyles',
									selectedModule.id === useCases.LogsManagement.id ? 'selected' : '',
								)}
								key={useCases.LogsManagement.id}
								onClick={(): void => handleModuleSelect(useCases.LogsManagement)}
							>
								<div className="moduleTitleStyle">{useCases.LogsManagement.title}</div>
								<div className="moduleDesc"> {useCases.LogsManagement.desc} </div>
							</div>

							<div
								className={cx(
									'moduleStyles',
									selectedModule.id === useCases.InfrastructureMonitoring.id
										? 'selected'
										: '',
								)}
								key={useCases.InfrastructureMonitoring.id}
								onClick={(): void =>
									handleModuleSelect(useCases.InfrastructureMonitoring)
								}
							>
								<div className="moduleTitleStyle">
									{useCases.InfrastructureMonitoring.title}
								</div>
								<div className="moduleDesc">
									{useCases.InfrastructureMonitoring.desc}
								</div>
							</div>
						</div>
					</div>

					<div className="continue-to-next-step">
						<Button type="primary" icon={<ArrowRightOutlined />} onClick={handleNext}>
							Continue to next step
						</Button>
					</div>
				</>
			)}

			{activeStep > 1 && (
				<div className="stepsContainer">
					<Steps
						current={current}
						onChange={handleStepChange}
						items={steps}
						size="small"
					/>
					<div className="step-content">
						{selectedModule.id === modulesMap.APM && <APM activeStep={activeStep} />}
						{selectedModule.id === modulesMap.DistributedTracing && (
							<DistributedTracing activeStep={activeStep} />
						)}
						{selectedModule.id === modulesMap.LogsManagement && (
							<LogsManagement activeStep={activeStep} />
						)}
						{selectedModule.id === modulesMap.InfrastructureMonitoring && (
							<InfrastructureMonitoring activeStep={activeStep} />
						)}
					</div>

					<div className="actionButtonsContainer">
						{activeStep > 0 && (
							<Button icon={<ArrowLeftOutlined />} onClick={handlePrev}>
								Back
							</Button>
						)}

						{activeStep < steps.length && (
							<Button
								type="primary"
								icon={<ArrowRightOutlined />}
								onClick={handleNext}
							>
								Continue to next step
							</Button>
						)}

						{activeStep === steps.length && (
							<Button type="primary" onClick={handleOnboardingComplete}>
								Done
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
