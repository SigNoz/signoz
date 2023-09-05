import './Onboarding.styles.scss';

import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Button, message, Steps } from 'antd';
import cx from 'classnames';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useState } from 'react';

import APM from './APM/APM';

const modulesMap = {
	APM: 'APM',
	DistributedTracing: 'Distributed_Tracing',
	LogsManagement: 'Logs_Management',
	InfrastructureMonitoring: 'Infrastructure Monitoring',
};

const useCases = [
	{
		id: modulesMap.APM,
		title: 'Application Monitoring',
		desc:
			'Monitor performance of your applications & troubleshoot problems by installing within your infra.',
	},
	{
		id: modulesMap.DistributedTracing,
		title: 'Distributed Tracing',
		desc:
			'Get end-to-end visibility of the services with contextual tags and attributes, run insights faster and get relevant metrics.',
	},
	{
		id: modulesMap.LogsManagement,
		title: 'Logs Management',
		desc:
			'Easily search and filter logs with query builder and automatically detect logs from K8s cluster.',
	},
	{
		id: modulesMap.InfrastructureMonitoring,
		title: 'Infrastructure Monitoring',
		desc:
			'Easily search and filter logs with query builder and automatically detect logs from K8s cluster.',
	},
];

// const description = 'This is a description.';

const steps = [
	{
		title: 'Get Started',
		description: 'Select the use-case',
		step: 1,
	},
	{
		title: 'Instrument Application',
		description: 'Configure data source',
		step: 2,
	},
	{
		title: 'Test Connection',
		description: 'Verify that you’ve instrumented your application ',
		step: 3,
	},
];

export default function Onboarding(): JSX.Element {
	const [selectedModule, setSelectedModule] = useState(modulesMap.APM);
	const [activeStep, setActiveStep] = useState(1);

	const handleNextStep = (): void => {
		setActiveStep(activeStep + 1);
	};

	const [current, setCurrent] = useState(1);

	const next = () => {
		setCurrent(current + 1);
		setActiveStep(activeStep + 1);
	};

	const prev = () => {
		setCurrent(current - 1);
		setActiveStep(activeStep - 1);
	};

	return (
		<div className={cx('container')}>
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
									selectedModule === useCases[0].id ? 'selected' : '',
								)}
								key={useCases[0].id}
								onClick={() => setSelectedModule(useCases[0].id)}
							>
								<div className="moduleTitleStyle">{useCases[0].title}</div>
								<div className="moduleDesc"> {useCases[0].desc} </div>
							</div>

							<div
								className={cx(
									'moduleStyles',
									selectedModule === useCases[1].id ? 'selected' : '',
								)}
								key={useCases[1].id}
								onClick={() => setSelectedModule(useCases[1].id)}
							>
								<div className="moduleTitleStyle">{useCases[1].title}</div>
								<div className="moduleDesc"> {useCases[1].desc} </div>
							</div>
						</div>

						<div className="moduleContainerRowStyles">
							<div
								className={cx(
									'moduleStyles',
									selectedModule === useCases[2].id ? 'selected' : '',
								)}
								key={useCases[2].id}
								onClick={() => setSelectedModule(useCases[2].id)}
							>
								<div className="moduleTitleStyle">{useCases[2].title}</div>
								<div className="moduleDesc"> {useCases[2].desc} </div>
							</div>

							<div
								className={cx(
									'moduleStyles',
									selectedModule === useCases[3].id ? 'selected' : '',
								)}
								key={useCases[3].id}
								onClick={() => setSelectedModule(useCases[3].id)}
							>
								<div className="moduleTitleStyle">{useCases[3].title}</div>
								<div className="moduleDesc"> {useCases[3].desc} </div>
							</div>
						</div>
					</div>

					<div className="continue-to-next-step">
						<Button
							type="primary"
							icon={<ArrowRightOutlined />}
							onClick={handleNextStep}
						>
							Continue to next step
						</Button>
					</div>
				</>
			)}

			{activeStep > 1 && (
				<div className="stepsContainer">
					<Steps current={current} items={steps} />
					<div className="step-content">
						{activeStep > 1 && <APM activeStep={activeStep} />}
					</div>

					<div className="actionButtonsContainer">
						{activeStep > 0 && (
							<Button
								style={{ margin: '0 8px' }}
								icon={<ArrowLeftOutlined />}
								onClick={() => prev()}
							>
								Back
							</Button>
						)}

						{activeStep < steps.length && (
							<Button
								type="primary"
								icon={<ArrowRightOutlined />}
								onClick={() => next()}
							>
								Continue to next step
							</Button>
						)}

						{activeStep === steps.length && (
							<Button
								type="primary"
								onClick={(): void => {
									// message.success('Processing complete!');
									history.push(ROUTES.APPLICATION);
								}}
							>
								Done
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
