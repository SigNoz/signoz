import { Typography } from 'antd';
import cx from 'classnames';
import { Server } from 'lucide-react';

const supportedLanguages = [
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
		<div className="supported-languages-container">
			{supportedLanguages.map((supportedLanguage) => (
				<div
					className={cx(
						'supported-language',
						// selectedLanguage === supportedLanguage.name ? 'selected' : '',
					)}
					key={supportedLanguage.name}
					// onClick={(): void => setSelectedLanguage(supportedLanguage.name)}
				>
					{/* <img
						className={cx('supported-langauge-img')}
						src={`/Logos/software-window.svg`}
						alt=""
					/> */}

					<Server size={36} />

					<Typography.Text> {supportedLanguage.name} </Typography.Text>
				</div>
			))}
		</div>
	);
}
