import './ModuleStepsContainer.styles.scss';

import {
	ArrowLeftOutlined,
	ArrowRightOutlined,
	LeftCircleOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Space, Steps } from 'antd';
import { useState } from 'react';

import ConnectionStatus from '../APM/common/ConnectionStatus/ConnectionStatus';
import DataSource from '../common/DataSource/DataSource';
import EnvironmentDetails from '../common/EnvironmentDetails/EnvironmentDetails';
import InstallOpenTelemetry from '../common/InstallOpenTelemetry/InstallOpenTelemetry';
import RunApplication from '../common/RunApplication/RunApplication';
import SelectMethod from '../common/SelectMethod/SelectMethod';
import SetupOtelCollector from '../common/SetupOtelCollector/SetupOtelCollector';

const dataSourceStep = {
	title: 'Data Source',
	component: <DataSource />,
};

const envDetailsStep = {
	title: 'Environment Details',
	component: <EnvironmentDetails />,
};

const selectMethodStep = {
	title: 'Select Method',
	component: <SelectMethod />,
};

const setupOtelCollectorStep = {
	title: 'Setup Otel Collector',
	component: <SetupOtelCollector />,
};

const installOpenTelemetryStep = {
	title: 'Install OpenTelemetry',
	component: <InstallOpenTelemetry />,
};

const runApplicationStep = {
	title: 'Run Application',
	component: <RunApplication />,
};

const testConnectionStep = {
	title: 'Test Connection',
	component: (
		<ConnectionStatus framework="flask" language="python" serviceName="" />
	),
};

const APM_STEPS = [
	dataSourceStep,
	envDetailsStep,
	selectMethodStep,
	setupOtelCollectorStep,
	installOpenTelemetryStep,
	runApplicationStep,
	testConnectionStep,
];

export default function ModuleStepsContainer(): JSX.Element {
	const [current, setCurrent] = useState(0);

	console.log('APM_STEPS', APM_STEPS);

	return (
		<div className="onboarding-module-steps">
			<ConfigProvider
				theme={{
					token: {
						colorPrimary: '#00b96b',
					},
				}}
			>
				<div className="steps-container">
					<Space style={{ marginBottom: '24px' }}>
						<Button type="default" icon={<LeftCircleOutlined />}>
							Reselect Module
						</Button>
					</Space>

					<Steps
						direction="vertical"
						size="small"
						status="finish"
						current={current}
						onChange={(current: number): void => {
							setCurrent(current);
							console.log('current', current);
						}}
						items={APM_STEPS}
					/>
				</div>

				<div className="selected-step-content">
					<div className="step-data">
						<div className="selected-step-pills">
							<div className="entity">
								<div className="entity-name">Data Source</div>
								<div className="entity-value">Download</div>
							</div>
						</div>

						<div className="step-content">
							<div className="step-name">{APM_STEPS[current].title}</div>
							{APM_STEPS[current].component}
						</div>
					</div>

					<div className="step-actions actionButtonsContainer">
						<Button icon={<ArrowLeftOutlined />}>Back</Button>

						<Button type="primary" icon={<ArrowRightOutlined />}>
							Continue to next step
						</Button>
					</div>
				</div>
			</ConfigProvider>
		</div>
	);
}
