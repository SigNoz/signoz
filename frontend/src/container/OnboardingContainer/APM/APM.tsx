/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './APM.styles.scss';

import cx from 'classnames';
import { useState } from 'react';

import GoLang from './GoLang/GoLang';
import Java from './Java/Java';
import Javascript from './Javascript/Javascript';
import Python from './Python/Python';

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

export default function APM({
	activeStep,
}: {
	activeStep: number;
}): JSX.Element {
	const [selectedLanguage, setSelectedLanguage] = useState('java');

	const renderSelectedLanguageSetupInstructions = (): JSX.Element => {
		switch (selectedLanguage) {
			case 'java':
				return <Java activeStep={activeStep} />;
			case 'python':
				return <Python activeStep={activeStep} />;
			case 'javascript':
				return <Javascript activeStep={activeStep} />;
			case 'go':
				return <GoLang activeStep={activeStep} />;
			default:
				return <> </>;
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
								onClick={(): void => setSelectedLanguage(supportedLanguage.name)}
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
