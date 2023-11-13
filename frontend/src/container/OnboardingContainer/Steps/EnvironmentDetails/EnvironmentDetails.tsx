import { Card, Typography } from 'antd';
import cx from 'classnames';
import { useOnboardingContext } from 'container/OnboardingContainer/context/OnboardingContext';
import { Server } from 'lucide-react';

interface SupportedEnvironmentsProps {
	name: string;
	id: string;
}

const supportedEnvironments: SupportedEnvironmentsProps[] = [
	{
		name: 'Local/Virtual Machine',
		id: 'local-virtual-machine',
	},
	{
		name: 'Kubernetes',
		id: 'kubernetes',
	},
	{
		name: 'Docker',
		id: 'docker',
	},
	{
		name: 'Windows',
		id: 'windows',
	},
	{
		name: 'Linux AMD64',
		id: 'linuxAMD64',
	},
	{
		name: 'Linux ARM64',
		id: 'linuxARD64',
	},
	{
		name: 'MacOS AMD64',
		id: 'macOsAMD64',
	},
	{
		name: 'MacOS ARM64',
		id: 'macOsARD64',
	},
];

export default function EnvironmentDetails(): JSX.Element {
	const {
		selectedEnvironment,
		updateSelectedEnvironment,
	} = useOnboardingContext();
	return (
		<div className="supported-environments-container">
			{supportedEnvironments.map((environment) => (
				<Card
					className={cx(
						'environment',
						selectedEnvironment === environment.name ? 'selected' : '',
					)}
					key={environment.name}
					onClick={(): void => updateSelectedEnvironment(environment.name)}
				>
					<div>
						<Server size={36} />
					</div>

					<div className="environment-name">
						<Typography.Text> {environment.name} </Typography.Text>
					</div>
				</Card>
			))}
		</div>
	);
}
