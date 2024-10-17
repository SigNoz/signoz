import ROUTES from 'constants/routes';

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
	imgURL: `Logos/java.png`,
};

const supportedLanguages = [
	{
		name: 'java',
		id: 'java',
		imgURL: `/Logos/java.png`,
	},
	{
		name: 'python',
		id: 'python',
		imgURL: `/Logos/python.png`,
	},
	{
		name: 'go',
		id: 'go',
		imgURL: `/Logos/go.png`,
	},
	{
		name: 'javascript',
		id: 'javascript',
		imgURL: `/Logos/javascript.png`,
	},
	{
		name: 'rails',
		id: 'rails',
		imgURL: `/Logos/rails.png`,
	},
	{
		name: '.NET',
		id: 'dotnet',
		imgURL: `/Logos/dotnet.png`,
	},
	{
		name: 'rust',
		id: 'rust',
		imgURL: `/Logos/rust.png`,
	},
	{
		name: 'elixir',
		id: 'elixir',
		imgURL: `/Logos/elixir.png`,
	},
	{
		name: 'swift',
		id: 'swift',
		imgURL: `/Logos/swift.png`,
	},
	{
		name: 'php',
		id: 'php',
		imgURL: `/Logos/php.png`,
	},
];

export const defaultLogsType = {
	name: 'Kubernetes Pod Logs',
	id: 'kubernetes',
	imgURL: `/Logos/kubernetes.svg`,
};

const supportedLogsTypes = [
	{
		name: 'Kubernetes Pod Logs',
		id: 'kubernetes',
		imgURL: `/Logos/kubernetes.svg`,
	},
	{
		name: 'Docker Container Logs',
		id: 'docker',
		imgURL: `/Logos/docker.svg`,
	},
	{
		name: 'SysLogs',
		id: 'syslogs',
		imgURL: `/Logos/syslogs.svg`,
	},
	{
		name: 'Application Logs',
		id: 'application_logs',
		imgURL: `/Logos/software-window.svg`,
	},
	{
		name: 'FluentBit',
		id: 'fluentBit',
		imgURL: `/Logos/fluent-bit.png`,
	},
	{
		name: 'FluentD',
		id: 'fluentD',
		imgURL: `/Logos/fluentd.png`,
	},
	{
		name: 'LogStash',
		id: 'logStash',
		imgURL: `/Logos/logstash.svg`,
	},
	{
		name: 'Heroku',
		id: 'heroku',
		imgURL: `/Logos/heroku.png`,
	},
	{
		name: 'Vercel',
		id: 'vercel',
		imgURL: `/Logos/vercel.png`,
	},
	{
		name: 'HTTP',
		id: 'http',
		imgURL: `/Logos/http.png`,
	},
	{
		name: 'Cloudwatch',
		id: 'cloudwatch',
		imgURL: `/Logos/cloudwatch.png`,
	},
];

export const defaultInfraMetricsType = {
	name: 'Kubernetes Infra Metrics',
	id: 'kubernetesInfraMetrics',
	imgURL: `/Logos/kubernetes.svg`,
};

const supportedInfraMetrics = [
	{
		name: 'Kubernetes Infra Metrics',
		id: 'kubernetesInfraMetrics',
		imgURL: `/Logos/kubernetes.svg`,
	},
	{
		name: 'HostMetrics',
		id: 'hostMetrics',
		imgURL: `/Logos/software-window.svg`,
	},
	{
		name: 'Other Metrics',
		id: 'otherMetrics',
		imgURL: `/Logos/cmd-terminal.svg`,
	},
];

export const defaultAwsServices = {
	name: 'EC2 - App/Server Logs',
	id: 'awsEc2ApplicationLogs',
	imgURL: `/Logos/ec2.svg`,
};

const supportedAwsServices = [
	{
		name: 'EC2 - App/Server Logs',
		id: 'awsEc2ApplicationLogs',
		imgURL: `/Logos/ec2.svg`,
	},
	{
		name: 'EC2 - Infra Metrics',
		id: 'awsEc2InfrastructureMetrics',
		imgURL: `/Logos/ec2.svg`,
	},
	{
		name: 'ECS - EC2',
		id: 'awsEcsEc2',
		imgURL: `/Logos/ecs.svg`,
	},
	{
		name: 'ECS - Fargate',
		id: 'awsEcsFargate',
		imgURL: `/Logos/ecs.svg`,
	},
	{
		name: 'ECS - External',
		id: 'awsEcsExternal',
		imgURL: `/Logos/ecs.svg`,
	},
	{
		name: 'EKS',
		id: 'awsEks',
		imgURL: `/Logos/eks.svg`,
	},
];

export const defaultAzureServices = {
	name: 'VM',
	id: 'azureVm',
	imgURL: `/Logos/azure-vm.svg`,
};

const supportedAzureServices = [
	{
		name: 'VM',
		id: 'azureVm',
		imgURL: `/Logos/azure-vm.svg`,
	},
	{
		name: 'App Service',
		id: 'azureAppService',
		imgURL: `/Logos/azure-app-service.svg`,
	},
	{
		name: 'AKS',
		id: 'azureAks',
		imgURL: `/Logos/azure-aks.svg`,
	},
	{
		name: 'Azure Functions',
		id: 'azureFunctions',
		imgURL: `/Logos/azure-functions.svg`,
	},
	{
		name: 'Azure Container Apps',
		id: 'azureContainerApps',
		imgURL: `/Logos/azure-container-apps.svg`,
	},
	{
		name: 'SQL Database Metrics',
		id: 'azureSQLDatabaseMetrics',
		imgURL: `/Logos/azure-sql-database-metrics.svg`,
	},
	{
		name: 'Azure Blob Storage',
		id: 'azureBlobStorage',
		imgURL: `/Logos/azure-blob-storage.svg`,
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

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
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

	// eslint-disable-next-line sonarjs/prefer-single-boolean-return
	if (
		moduleID === ModulesMap.LogsManagement ||
		moduleID === ModulesMap.InfrastructureMonitoring ||
		(moduleID === ModulesMap.APM && dataSourceName === 'go') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'rails') ||
		(moduleID === ModulesMap.APM && dataSourceName === '.NET') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'rust') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'elixir') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'swift') ||
		(moduleID === ModulesMap.APM && dataSourceName === 'php')
	) {
		return false;
	}

	return true;
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
