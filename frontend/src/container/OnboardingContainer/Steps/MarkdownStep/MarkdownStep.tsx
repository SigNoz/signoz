import getIngestionData from 'api/settings/getIngestionData';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import { docFilePaths } from 'container/OnboardingContainer/constants/docFilePaths';
import { useOnboardingContext } from 'container/OnboardingContainer/context/OnboardingContext';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

export interface IngestionInfoProps {
	SIGNOZ_INGESTION_KEY?: string;
	REGION?: string;
}

export default function MarkdownStep(): JSX.Element {
	const {
		activeStep,
		serviceName,
		selectedDataSource,
		selectedModule,
		selectedEnvironment,
		selectedFramework,
		selectedMethod,
	} = useOnboardingContext();

	console.log({
		activeStep,
		serviceName,
		selectedModule,
		selectedDataSource,
		selectedEnvironment,
		selectedFramework,
	});

	const [ingestionInfo, setIngestionInfo] = useState<IngestionInfoProps>({});

	const [markdownContent, setMarkdownContent] = useState('');

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

	const { step } = activeStep;

	const getFilePath = (): any => {
		let path = `${selectedModule?.id}_${selectedDataSource?.id}`;

		if (selectedFramework) {
			path += `_${selectedFramework}`;
		}

		if (selectedEnvironment) {
			path += `_${selectedEnvironment}`;
		}

		if (selectedMethod) {
			path += `_${selectedMethod}`;
		}

		path += `_${step?.id}`;

		console.log(path);

		return path;
	};

	useEffect(() => {
		const path = getFilePath();

		if (docFilePaths[path]) {
			setMarkdownContent(docFilePaths[path]);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step]);

	const variables = {
		MYAPP: serviceName || '<service-name>',
		SIGNOZ_INGESTION_KEY:
			ingestionInfo.SIGNOZ_INGESTION_KEY || '<SIGNOZ_INGESTION_KEY>',
		REGION: ingestionInfo.REGION || 'region',
	};

	return (
		<div className="markdown-container">
			<MarkdownRenderer markdownContent={markdownContent} variables={variables} />
		</div>
	);
}
