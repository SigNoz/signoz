import { Card, Typography } from 'antd';
import cx from 'classnames';
import { useOnboardingContext } from 'container/OnboardingContainer/context/OnboardingContext';
import { useCases } from 'container/OnboardingContainer/OnboardingContainer';
import useAnalytics from 'hooks/analytics/useAnalytics';
import { Server } from 'lucide-react';
import { useEffect } from 'react';

interface SupportedEnvironmentsProps {
	name: string;
	id: string;
}

const supportedEnvironments: SupportedEnvironmentsProps[] = [
	{
		name: 'Kubernetes',
		id: 'kubernetes',
	},
	{
		name: 'Linux AMD64',
		id: 'linuxAMD64',
	},
	{
		name: 'Linux ARM64',
		id: 'linuxARM64',
	},
	{
		name: 'MacOS AMD64',
		id: 'macOsAMD64',
	},
	{
		name: 'MacOS ARM64',
		id: 'macOsARM64',
	},
];

export default function EnvironmentDetails(): JSX.Element {
	const {
		activeStep,
		selectedDataSource,
		selectedFramework,
		selectedEnvironment,
		updateSelectedEnvironment,
		selectedModule,
		errorDetails,
		updateErrorDetails,
	} = useOnboardingContext();

	const { trackEvent } = useAnalytics();

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: Environment Selected', {
			dataSource: selectedDataSource,
			framework: selectedFramework,
			environment: selectedEnvironment,
			module: {
				name: activeStep?.module?.title,
				id: activeStep?.module?.id,
			},
			step: {
				name: activeStep?.step?.title,
				id: activeStep?.step?.id,
			},
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedEnvironment]);

	return (
		<>
			<Typography.Text className="environment-title">
				<span className="required-symbol">*</span> Select Environment
			</Typography.Text>

			<div className="supported-environments-container">
				{supportedEnvironments.map((environment) => {
					if (
						selectedModule?.id !== useCases.APM.id &&
						environment.id === 'kubernetes'
					) {
						return null;
					}

					return (
						<Card
							className={cx(
								'environment',
								selectedEnvironment === environment.id ? 'selected' : '',
							)}
							key={environment.id}
							onClick={(): void => {
								updateSelectedEnvironment(environment.id);
								updateErrorDetails(null);
							}}
						>
							<div>
								<Server size={36} />
							</div>

							<div className="environment-name">
								<Typography.Text> {environment.name} </Typography.Text>
							</div>
						</Card>
					);
				})}
			</div>

			{errorDetails && (
				<div className="error-container">
					<Typography.Text type="danger"> {errorDetails} </Typography.Text>
				</div>
			)}
		</>
	);
}
