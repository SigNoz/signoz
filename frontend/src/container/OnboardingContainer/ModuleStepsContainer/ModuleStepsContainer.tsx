import './ModuleStepsContainer.styles.scss';

import {
	ArrowLeftOutlined,
	ArrowRightOutlined,
	LeftCircleOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Space, Steps } from 'antd';
import { useState } from 'react';

import { ModuleProps, SelectedModuleStepProps } from '../OnboardingContainer';
import { useOnboardingContext } from '../OnboardingContext';

interface ModuleStepsContainerProps {
	onReselectModule: any;
	selectedModule: ModuleProps;
	selectedModuleSteps: SelectedModuleStepProps[];
}

export default function ModuleStepsContainer({
	onReselectModule,
	selectedModule,
	selectedModuleSteps,
}: ModuleStepsContainerProps): JSX.Element {
	const { serviceName } = useOnboardingContext();

	const [current, setCurrent] = useState(0);

	const handleNext = (): void => {
		if (current > 0) {
			setCurrent(current + 1);
		}
	};

	const handlePrev = (): void => {
		setCurrent(current - 1);
	};

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
						onChange={(current: number): void => {
							setCurrent(current);
							console.log('current', current);
						}}
						items={selectedModuleSteps}
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
							<div className="step-name">{selectedModuleSteps[current].title}</div>
							{selectedModuleSteps[current].component}
						</div>
					</div>

					<div className="step-actions actionButtonsContainer">
						<Button onClick={handlePrev} icon={<ArrowLeftOutlined />}>
							Back
						</Button>

						<Button onClick={handleNext} type="primary" icon={<ArrowRightOutlined />}>
							Continue to next step
						</Button>
					</div>
				</div>
			</ConfigProvider>
		</div>
	);
}
