import { useState } from 'react';
import cx from 'classnames';
import './APM.styles.scss';
import Java from './Java/Java';
import Python from './Python/Python';
import Javascript from './Javascript/Javascript';
import GoLang from './GoLang/GoLang';

const supportedLanguages = [
	{
		name: 'java',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'python',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'javascript',
		imgURL: `Logos/java.png`,
	},
	{
		name: 'go',
		imgURL: `Logos/java.png`,
	},
];

export default function APM({ activeStep }): JSX.Element {
	const [selectedLanguage, setSelectedLanguage] = useState('java');

	const renderSelectedLanguageSetupInstructions = ():
		| JSX.Element
		| undefined => {
		switch (selectedLanguage) {
			case 'java':
				return <Java activeStep={activeStep} />;
				break;
			case 'python':
				return <Python activeStep={activeStep} />;
				break;
			case 'javascript':
				return <Javascript activeStep={activeStep} />;
				break;
			case 'go':
				return <GoLang activeStep={activeStep} />;
				break;
			default:
				break;
		}
	};

	return (
		<div className="apm-module-container">
			{activeStep === 2 && (
				<>
					<div className="header">
						<h1>
							Get Started to instrument your applications and sending data to SigNoz
						</h1>
						<h4> Select the data source </h4>
					</div>

					<div className="supported-languages-container">
						{supportedLanguages.map((supportedLanguage) => (
							<div
								className={cx(
									'supported-language',
									selectedLanguage === supportedLanguage.name ? 'selected' : '',
								)}
								key={supportedLanguage.name}
								onClick={() => setSelectedLanguage(supportedLanguage.name)}
							>
								<img
									className={cx('supported-langauge-img')}
									src={`/Logos/${supportedLanguage.name}.png`}
									alt=""
								/>
							</div>
						))}
					</div>
				</>
			)}

			{selectedLanguage && (
				<div
					className={cx('selected-langauage-setup-instructions', selectedLanguage)}
				>
					{renderSelectedLanguageSetupInstructions()}
				</div>
			)}
		</div>
	);
}
