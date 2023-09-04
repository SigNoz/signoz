/* eslint-disable react/jsx-no-duplicate-props */
import './Onboarding.scss';

import { ArrowRightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import cx from 'classnames';
import { useState } from 'react';

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

export default function Onboarding(): JSX.Element {
	const [selectedModule, setSelectedModule] = useState(modulesMap.APM);

	return (
		<div className={cx('onboardingContainerStyles')}>
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
				<Button type="primary" icon={<ArrowRightOutlined />}>
					Continue to next step
				</Button>
			</div>
		</div>
	);
}
