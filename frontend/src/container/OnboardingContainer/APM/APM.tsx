/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import './APM.styles.scss';

import getIngestionData from 'api/settings/getIngestionData';
import cx from 'classnames';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { trackEvent } from 'utils/segmentAnalytics';

import GoLang from './GoLang/GoLang';
import Java from './Java/Java';
import Javascript from './Javascript/Javascript';
import Python from './Python/Python';

interface IngestionInfoProps {
	SIGNOZ_INGESTION_KEY?: string;
	REGION?: string;
}
export interface LangProps {
	ingestionInfo: IngestionInfoProps;
	activeStep: number;
}

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

	const [ingestionInfo, setIngestionInfo] = useState<IngestionInfoProps>({});

	const { status, data: ingestionData } = useQuery({
		queryFn: () => getIngestionData(),
	});

	useEffect(() => {
		if (
			status === 'success' &&
			ingestionData.payload &&
			Array.isArray(ingestionData.payload)
		) {
			const payload = ingestionData.payload[0] || {
				ingestionKey: '',
				dataRegion: '',
			};

			setIngestionInfo({
				SIGNOZ_INGESTION_KEY: payload?.ingestionKey,
				REGION: payload?.dataRegion,
			});
		}
	}, [status, ingestionData?.payload]);

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: APM', {
			selectedLanguage,
			activeStep,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedLanguage]);

	const renderSelectedLanguageSetupInstructions = (): JSX.Element => {
		switch (selectedLanguage) {
			case 'java':
				return <Java ingestionInfo={ingestionInfo} activeStep={activeStep} />;
			case 'python':
				return <Python ingestionInfo={ingestionInfo} activeStep={activeStep} />;
			case 'javascript':
				return <Javascript ingestionInfo={ingestionInfo} activeStep={activeStep} />;
			case 'go':
				return <GoLang ingestionInfo={ingestionInfo} activeStep={activeStep} />;
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
