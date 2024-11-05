/* eslint-disable @typescript-eslint/ban-ts-comment */
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import { QueryParams } from 'constants/query';
import { ApmDocFilePaths } from 'container/OnboardingContainer/constants/apmDocFilePaths';
import { AwsMonitoringDocFilePaths } from 'container/OnboardingContainer/constants/awsMonitoringDocFilePaths';
import { AzureMonitoringDocFilePaths } from 'container/OnboardingContainer/constants/azureMonitoringDocFilePaths';
import { InfraMonitoringDocFilePaths } from 'container/OnboardingContainer/constants/infraMonitoringDocFilePaths';
import { LogsManagementDocFilePaths } from 'container/OnboardingContainer/constants/logsManagementDocFilePaths';
import {
	OnboardingMethods,
	useOnboardingContext,
} from 'container/OnboardingContainer/context/OnboardingContext';
import { ModulesMap } from 'container/OnboardingContainer/OnboardingContainer';
import useUrlQuery from 'hooks/useUrlQuery';
import { useEffect, useState } from 'react';

export interface IngestionInfoProps {
	SIGNOZ_INGESTION_KEY?: string;
	REGION?: string;
}

export default function MarkdownStep(): JSX.Element {
	const {
		activeStep,
		ingestionData,
		serviceName,
		selectedDataSource,
		selectedModule,
		selectedEnvironment,
		selectedFramework,
		selectedMethod,
	} = useOnboardingContext();

	const [markdownContent, setMarkdownContent] = useState('');

	const urlQuery = useUrlQuery();
	const getStartedSource = urlQuery.get(QueryParams.getStartedSource);
	const getStartedSourceService = urlQuery.get(
		QueryParams.getStartedSourceService,
	);

	const { step } = activeStep;

	const getFilePath = (): any => {
		let path = `${selectedModule?.id}_${selectedDataSource?.id}`;

		if (selectedFramework) {
			path += `_${selectedFramework}`;
		}

		if (selectedEnvironment) {
			path += `_${selectedEnvironment}`;
		}

		if (selectedModule?.id === ModulesMap.APM) {
			if (selectedEnvironment === 'kubernetes') {
				path += `_${OnboardingMethods.RECOMMENDED_STEPS}`;
			} else if (selectedEnvironment !== 'kubernetes' && selectedMethod) {
				path += `_${selectedMethod}`;
			}
		}

		path += `_${step?.id}`;

		if (
			getStartedSource === 'kafka' &&
			path === 'APM_java_springBoot_kubernetes_recommendedSteps_runApplication' // todo: Sagar - Make this generic logic in followup PRs
		) {
			path += `_${getStartedSourceService}`;
		}
		return path;
	};

	useEffect(() => {
		const path = getFilePath();

		let docFilePaths;

		if (selectedModule?.id === ModulesMap.APM) {
			docFilePaths = ApmDocFilePaths;
		} else if (selectedModule?.id === ModulesMap.LogsManagement) {
			docFilePaths = LogsManagementDocFilePaths;
		} else if (selectedModule?.id === ModulesMap.InfrastructureMonitoring) {
			docFilePaths = InfraMonitoringDocFilePaths;
		} else if (selectedModule?.id === ModulesMap.AwsMonitoring) {
			docFilePaths = AwsMonitoringDocFilePaths;
		} else if (selectedModule?.id === ModulesMap.AzureMonitoring) {
			docFilePaths = AzureMonitoringDocFilePaths;
		}
		// @ts-ignore
		if (docFilePaths && docFilePaths[path]) {
			// @ts-ignore
			setMarkdownContent(docFilePaths[path]);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [step]);

	const variables = {
		MYAPP: serviceName || '<service-name>',
		SIGNOZ_INGESTION_KEY:
			ingestionData?.SIGNOZ_INGESTION_KEY || '<SIGNOZ_INGESTION_KEY>',
		REGION: ingestionData?.REGION || 'region',
		OTEL_VERSION: '0.88.0',
	};

	return (
		<div className="markdown-container">
			<MarkdownRenderer markdownContent={markdownContent} variables={variables} />
		</div>
	);
}
