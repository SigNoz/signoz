import { Card, Typography } from 'antd';
import cx from 'classnames';
import { Server } from 'lucide-react';

const supportedEnvironments = [
	{
		name: 'Local/Virtual Machine',
	},
	{
		name: 'Kubernetes',
	},
	{
		name: 'Docker',
	},
	{
		name: 'Windows',
	},
	{
		name: 'Linux AMD64',
	},
	{
		name: 'Linux ARM64',
	},
	{
		name: 'MacOS AMD64',
	},
	{
		name: 'MacOS ARM64',
	},
];

export default function EnvironmentDetails(): JSX.Element {
	return (
		<div className="supported-environments-container">
			{supportedEnvironments.map((environment) => (
				<Card
					className={cx(
						'environment',
						// selectedLanguage === supportedLanguage.name ? 'selected' : '',
					)}
					key={environment.name}
					// onClick={(): void => setSelectedLanguage(supportedLanguage.name)}
				>
					{/* <img
						className={cx('supported-langauge-img')}
						src={`/Logos/software-window.svg`}
						alt=""
					/> */}

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
