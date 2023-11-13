/* eslint-disable sonarjs/prefer-single-boolean-return */
import './ModuleStepsContainer.styles.scss';

import {
	ArrowLeftOutlined,
	ArrowRightOutlined,
	LeftCircleOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Space, Steps, Typography } from 'antd';
import { hasFrameworks } from 'container/OnboardingContainer/utils/dataSourceUtils';
import { isEmpty } from 'lodash-es';
import { useState } from 'react';

import {
	OnboardingMethods,
	useOnboardingContext,
} from '../../context/OnboardingContext';
import {
	ModuleProps,
	SelectedModuleStepProps,
} from '../../OnboardingContainer';

interface ModuleStepsContainerProps {
	onReselectModule: any;
	selectedModule: ModuleProps;
	selectedModuleSteps: SelectedModuleStepProps[];
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
}: ModuleStepsContainerProps): JSX.Element {
	const {
		serviceName,
		selectedDataSource,
		selectedMethod,
		selectedEnvironment,
		selectedFramework,
	} = useOnboardingContext();

	const [current, setCurrent] = useState(0);

	const [metaData, setMetaData] = useState<MetaDataProps[]>(defaultMetaData);

	const isValidForm = (): boolean => {
		if (selectedModuleSteps[current].id === 'data-source') {
			if (serviceName !== '' && selectedDataSource?.name) {
				const doesHaveFrameworks = hasFrameworks({
					module: selectedModule,
					dataSource: selectedDataSource,
				});

				console.log('doesHaveFrameworks', doesHaveFrameworks);
				if (doesHaveFrameworks && selectedFramework !== '') {
					return false;
				}

				return true;
			}

			return false;
		}

		return true;
	};

	const handleNext = (): void => {
		const isValid = isValidForm();

		if (isValid) {
			if (current >= 0) {
				if (
					selectedModuleSteps[current].id === 'select-method' &&
					selectedMethod === OnboardingMethods.QUICK_START
				) {
					setCurrent(current + 2);
				} else {
					setCurrent(current + 1);
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
						value: selectedFramework,
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
			if (
				selectedModuleSteps[current].id === 'install-openTelemetry' &&
				selectedMethod === OnboardingMethods.QUICK_START
			) {
				setCurrent(current - 2);
			} else {
				setCurrent(current - 1);
			}
		}
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
						items={selectedModuleSteps}
					/>
				</div>

				<div className="selected-step-content">
					<div className="step-data">
						{current > 0 && (
							<div className="selected-step-pills">
								{metaData.map((data) => {
									if (isEmpty(data?.value)) {
										return <> </>;
									}

									return (
										<div key={data.name} className="entity">
											<Typography.Text className="entity-name">
												{data.name}
											</Typography.Text>
											<Typography.Text className="entity-value">
												{data.value}
											</Typography.Text>
										</div>
									);
								})}
							</div>
						)}

						<div className="step-content">
							{/* <div className="step-name">{selectedModuleSteps[current].title}</div> */}
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
							Continue to next step
						</Button>
					</div>
				</div>
			</ConfigProvider>
		</div>
	);
}
