/* eslint-disable sonarjs/prefer-single-boolean-return */
import './ModuleStepsContainer.styles.scss';

import {
	ArrowLeftOutlined,
	ArrowRightOutlined,
	LeftCircleOutlined,
} from '@ant-design/icons';
import { Button, Space, Steps, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { stepsMap } from 'container/OnboardingContainer/constants/stepsConfig';
import { DataSourceType } from 'container/OnboardingContainer/Steps/DataSource/DataSource';
import { hasFrameworks } from 'container/OnboardingContainer/utils/dataSourceUtils';
import useAnalytics from 'hooks/analytics/useAnalytics';
import history from 'lib/history';
import { isEmpty } from 'lodash-es';
import { useState } from 'react';

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
		activeStep,
		serviceName,
		selectedDataSource,
		selectedEnvironment,
		selectedFramework,
		updateActiveStep,
		updateErrorDetails,
		resetProgress,
	} = useOnboardingContext();

	const [current, setCurrent] = useState(0);
	const { trackEvent } = useAnalytics();
	const [metaData, setMetaData] = useState<MetaDataProps[]>(defaultMetaData);
	const lastStepIndex = selectedModuleSteps.length - 1;

	const isValidForm = (): boolean => {
		const { id: selectedModuleID } = selectedModule;
		const dataSourceStep = stepsMap.dataSource;
		const environmentDetailsStep = stepsMap.environmentDetails;

		const { step } = activeStep;

		const {
			name: selectedDataSourceName = '',
		} = selectedDataSource as DataSourceType;

		if (step.id === environmentDetailsStep && selectedEnvironment === '') {
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

				if (doesHaveFrameworks && selectedFramework === '') {
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
		trackEvent('Onboarding Complete', {
			module: selectedModule.id,
		});

		if (selectedModule.id === ModulesMap.APM) {
			history.push(ROUTES.APPLICATION);
		} else if (selectedModule.id === ModulesMap.LogsManagement) {
			history.push(ROUTES.LOGS);
		} else if (selectedModule.id === ModulesMap.InfrastructureMonitoring) {
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
			setCurrent(current - 1);

			// set the active step info
			updateActiveStep({
				module: selectedModule,
				step: selectedModuleSteps[current - 1],
			});
		}
	};

	return (
		<div className="onboarding-module-steps">
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
				</div>
			</div>
		</div>
	);
}
