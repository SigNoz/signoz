import ROUTES from 'constants/routes';

import azureAksSvgUrl from '@/assets/Logos/azure-aks.svg';
import azureAppServiceSvgUrl from '@/assets/Logos/azure-app-service.svg';
import azureBlobStorageSvgUrl from '@/assets/Logos/azure-blob-storage.svg';
import azureContainerAppsSvgUrl from '@/assets/Logos/azure-container-apps.svg';
import azureFunctionsSvgUrl from '@/assets/Logos/azure-functions.svg';
import azureSqlDatabaseMetricsSvgUrl from '@/assets/Logos/azure-sql-database-metrics.svg';
import azureVmSvgUrl from '@/assets/Logos/azure-vm.svg';
import cloudwatchPngUrl from '@/assets/Logos/cloudwatch.png';
import cmdTerminalSvgUrl from '@/assets/Logos/cmd-terminal.svg';
import dockerSvgUrl from '@/assets/Logos/docker.svg';
import dotnetPngUrl from '@/assets/Logos/dotnet.png';
import ec2SvgUrl from '@/assets/Logos/ec2.svg';
import ecsSvgUrl from '@/assets/Logos/ecs.svg';
import eksSvgUrl from '@/assets/Logos/eks.svg';
import elixirPngUrl from '@/assets/Logos/elixir.png';
import fluentBitPngUrl from '@/assets/Logos/fluent-bit.png';
import fluentdPngUrl from '@/assets/Logos/fluentd.png';
import goPngUrl from '@/assets/Logos/go.png';
import herokuPngUrl from '@/assets/Logos/heroku.png';
import httpPngUrl from '@/assets/Logos/http.png';
import javaPngUrl from '@/assets/Logos/java.png';
import javascriptPngUrl from '@/assets/Logos/javascript.png';
import kubernetesSvgUrl from '@/assets/Logos/kubernetes.svg';
import logstashSvgUrl from '@/assets/Logos/logstash.svg';
import phpPngUrl from '@/assets/Logos/php.png';
import pythonPngUrl from '@/assets/Logos/python.png';
import railsPngUrl from '@/assets/Logos/rails.png';
import rustPngUrl from '@/assets/Logos/rust.png';
import softwareWindowSvgUrl from '@/assets/Logos/software-window.svg';
import swiftPngUrl from '@/assets/Logos/swift.png';
import syslogsSvgUrl from '@/assets/Logos/syslogs.svg';
import vercelPngUrl from '@/assets/Logos/vercel.png';

import { ModuleProps } from '../OnboardingContainer';
import { DataSourceType } from '../Steps/DataSource/DataSource';

export enum ModulesMap {
	APM = 'APM',
	LogsManagement = 'LogsManagement',
	InfrastructureMonitoring = 'InfrastructureMonitoring',
	AwsMonitoring = 'AwsMonitoring',
	AzureMonitoring = 'AzureMonitoring',
}

export const frameworksMap = {
	APM: {
		java: [
			{
				value: 'springBoot',
				label: 'Spring Boot',
			},
			{
				value: 'tomcat',
				label: 'Tomcat',
			},
			{
				value: 'jboss',
				label: 'JBoss',
			},
			{
				value: 'other',
				label: 'Others',
			},
		],
		javascript: [
			{
				value: 'express',
				label: 'Express',
			},
			{
				value: 'nestjs',
				label: 'Nest JS',
			},
			{
				value: 'nodejs',
				label: 'Nodejs',
			},
			{
				value: 'reactjs',
				label: 'React JS',
			},
			{
				value: 'angular',
				label: 'Angular',
			},
			{
				value: 'others',
				label: 'Other Web Instrumentation',
			},
		],
		python: [
			{
				value: 'django',
				label: 'Django',
			},
			{
				value: 'fastAPI',
				label: 'Fast API',
			},
			{
				value: 'flask',
				label: 'Flask',
			},
			{
				value: 'falcon',
				label: 'Falcon',
			},
			{
				value: 'other',
				label: 'Others',
			},
		],
	},
	LogsManagement: {},
	InfrastructureMonitoring: {},
	AwsMonitoring: {},
	AzureMonitoring: {},
};

export const defaultApplicationDataSource = {
	name: 'java',
	id: 'java',
	imgURL: javaPngUrl,
};

const supportedLanguages = [
	{
		name: 'java',
		id: 'java',
		imgURL: javaPngUrl,
	},
	{
		name: 'python',
		id: 'python',
		imgURL: pythonPngUrl,
	},
	{
		name: 'go',
		id: 'go',
		imgURL: goPngUrl,
	},
	{
		name: 'javascript',
		id: 'javascript',
		imgURL: javascriptPngUrl,
	},
	{
		name: 'rails',
		id: 'rails',
		imgURL: railsPngUrl,
	},
	{
		name: '.NET',
		id: 'dotnet',
		imgURL: dotnetPngUrl,
	},
	{
		name: 'rust',
		id: 'rust',
		imgURL: rustPngUrl,
	},
	{
		name: 'elixir',
		id: 'elixir',
		imgURL: elixirPngUrl,
	},
	{
		name: 'swift',
		id: 'swift',
		imgURL: swiftPngUrl,
	},
	{
		name: 'php',
		id: 'php',
		imgURL: phpPngUrl,
	},
];

export const defaultLogsType = {
	name: 'Kubernetes Pod Logs',
	id: 'kubernetes',
	imgURL: kubernetesSvgUrl,
};

const supportedLogsTypes = [
	{
		name: 'Kubernetes Pod Logs',
		id: 'kubernetes',
		imgURL: kubernetesSvgUrl,
	},
	{
		name: 'Docker Container Logs',
		id: 'docker',
		imgURL: dockerSvgUrl,
	},
	{
		name: 'SysLogs',
		id: 'syslogs',
		imgURL: syslogsSvgUrl,
	},
	{
		name: 'Application Logs',
		id: 'application_logs',
		imgURL: softwareWindowSvgUrl,
	},
	{
		name: 'FluentBit',
		id: 'fluentBit',
		imgURL: fluentBitPngUrl,
	},
	{
		name: 'FluentD',
		id: 'fluentD',
		imgURL: fluentdPngUrl,
	},
	{
		name: 'LogStash',
		id: 'logStash',
		imgURL: logstashSvgUrl,
	},
	{
		name: 'Heroku',
		id: 'heroku',
		imgURL: herokuPngUrl,
	},
	{
		name: 'Vercel',
		id: 'vercel',
		imgURL: vercelPngUrl,
	},
	{
		name: 'HTTP',
		id: 'http',
		imgURL: httpPngUrl,
	},
	{
		name: 'Cloudwatch',
		id: 'cloudwatch',
		imgURL: cloudwatchPngUrl,
	},
];

export const defaultInfraMetricsType = {
	name: 'Kubernetes Infra Metrics',
	id: 'kubernetesInfraMetrics',
	imgURL: kubernetesSvgUrl,
};

const supportedInfraMetrics = [
	{
		name: 'Kubernetes Infra Metrics',
		id: 'kubernetesInfraMetrics',
		imgURL: kubernetesSvgUrl,
	},
	{
		name: 'HostMetrics',
		id: 'hostMetrics',
		imgURL: softwareWindowSvgUrl,
	},
	{
		name: 'Other Metrics',
		id: 'otherMetrics',
		imgURL: cmdTerminalSvgUrl,
	},
];

export const defaultAwsServices = {
	name: 'EC2 - App/Server Logs',
	id: 'awsEc2ApplicationLogs',
	imgURL: ec2SvgUrl,
};

const supportedAwsServices = [
	{
		name: 'EC2 - App/Server Logs',
		id: 'awsEc2ApplicationLogs',
		imgURL: ec2SvgUrl,
	},
	{
		name: 'EC2 - Infra Metrics',
		id: 'awsEc2InfrastructureMetrics',
		imgURL: ec2SvgUrl,
	},
	{
		name: 'ECS - EC2',
		id: 'awsEcsEc2',
		imgURL: ecsSvgUrl,
	},
	{
		name: 'ECS - Fargate',
		id: 'awsEcsFargate',
		imgURL: ecsSvgUrl,
	},
	{
		name: 'ECS - External',
		id: 'awsEcsExternal',
		imgURL: ecsSvgUrl,
	},
	{
		name: 'EKS',
		id: 'awsEks',
		imgURL: eksSvgUrl,
	},
];

export const defaultAzureServices = {
	name: 'VM',
	id: 'azureVm',
	imgURL: azureVmSvgUrl,
};

const supportedAzureServices = [
	{
		name: 'VM',
		id: 'azureVm',
		imgURL: azureVmSvgUrl,
	},
	{
		name: 'App Service',
		id: 'azureAppService',
		imgURL: azureAppServiceSvgUrl,
	},
	{
		name: 'AKS',
		id: 'azureAks',
		imgURL: azureAksSvgUrl,
	},
	{
		name: 'Azure Functions',
		id: 'azureFunctions',
		imgURL: azureFunctionsSvgUrl,
	},
	{
		name: 'Azure Container Apps',
		id: 'azureContainerApps',
		imgURL: azureContainerAppsSvgUrl,
	},
	{
		name: 'SQL Database Metrics',
		id: 'azureSQLDatabaseMetrics',
		imgURL: azureSqlDatabaseMetricsSvgUrl,
	},
	{
		name: 'Azure Blob Storage',
		id: 'azureBlobStorage',
		imgURL: azureBlobStorageSvgUrl,
	},
];

export const getDataSources = (module: ModuleProps): DataSourceType[] => {
	if (module.id === ModulesMap.APM) {
		return supportedLanguages;
	}

	if (module.id === ModulesMap.InfrastructureMonitoring) {
		return supportedInfraMetrics;
	}

	if (module.id === ModulesMap.LogsManagement) {
		return supportedLogsTypes;
	}

	if (module.id === ModulesMap.AwsMonitoring) {
		return supportedAwsServices;
	}

	return supportedAzureServices;
};

export const getSupportedFrameworks = ({
	module,
	dataSource,
}: {
	module: ModuleProps;
	dataSource: DataSourceType;
}): [] => {
	const { id: moduleID } = module;
	const { name: dataSourceName } = dataSource;

	if (
		(moduleID === ModulesMap.APM && dataSourceName === 'go') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'rails') ||
		(moduleID === ModulesMap.APM && dataSourceName === '.NET') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'rust') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'elixir') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'swift') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'php')
	) {
		return [];
	}

	// @ts-expect-error
	return frameworksMap[moduleID][dataSourceName];
};

export const hasFrameworks = ({
	module,
	dataSource,
}: {
	module: ModuleProps;
	dataSource: any;
}): boolean => {
	const { id: moduleID } = module;
	const { name: dataSourceName } = dataSource;

	return !(
		moduleID === ModulesMap.LogsManagement ||
		moduleID === ModulesMap.InfrastructureMonitoring ||
		(moduleID === ModulesMap.APM && dataSourceName === 'go') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'rails') ||
		(moduleID === ModulesMap.APM && dataSourceName === '.NET') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'rust') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'elixir') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'swift') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'php')
	);
};

export const moduleRouteMap = {
	[ModulesMap.APM]: ROUTES.GET_STARTED_APPLICATION_MONITORING,
	[ModulesMap.LogsManagement]: ROUTES.GET_STARTED_LOGS_MANAGEMENT,
	[ModulesMap.InfrastructureMonitoring]:
		ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING,
	[ModulesMap.AwsMonitoring]: ROUTES.GET_STARTED_AWS_MONITORING,
	[ModulesMap.AzureMonitoring]: ROUTES.GET_STARTED_AZURE_MONITORING,
};

export const messagingQueueKakfaSupportedDataSources = ['java'];
