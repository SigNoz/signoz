import { ModuleProps, ModulesMap } from '../OnboardingContainer';
import { DataSourceType } from '../Steps/DataSource/DataSource';

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
		imgURL: `Logos/java.png`,
	},
	{
		name: 'python',
		id: 'python',
		imgURL: `Logos/python.png`,
	},
	{
		name: 'go',
		id: 'go',
		imgURL: `Logos/go.png`,
	},
	{
		name: 'javascript',
		id: 'javascript',
		imgURL: `Logos/javascript.png`,
	},
	{
		name: 'rails',
		id: 'rails',
		imgURL: `Logos/rails.png`,
	},
];

export const defaultLogsType = {
	name: 'Kubernetes Pod Logs',
	id: 'kubernetes',
	imgURL: `Logos/kubernetes.svg`,
};

const supportedLogsTypes = [
	{
		name: 'Kubernetes Pod Logs',
		id: 'kubernetes',
		imgURL: `Logos/kubernetes.svg`,
	},
	{
		name: 'Docker Container Logs',
		id: 'docker',
		imgURL: `Logos/docker.svg`,
	},
	{
		name: 'SysLogs',
		id: 'syslogs',
		imgURL: `Logos/syslogs.svg`,
	},
	{
		name: 'Application Logs',
		id: 'application_logs',
		imgURL: `Logos/software-window.svg`,
	},
	{
		name: 'FluentBit',
		id: 'fluentBit',
		imgURL: `Logos/fluent-bit.png`,
	},
	{
		name: 'FluentD',
		id: 'fluentD',
		imgURL: `Logos/fluentd.png`,
	},
	{
		name: 'LogStash',
		id: 'logStash',
		imgURL: `Logos/logstash.svg`,
	},
];

export const defaultInfraMetricsType = {
	name: 'Kubernetes Infra Metrics',
	id: 'kubernetesInfraMetrics',
	imgURL: `Logos/kubernetes.svg`,
};

const supportedInfraMetrics = [
	{
		name: 'Kubernetes Infra Metrics',
		id: 'kubernetesInfraMetrics',
		imgURL: `Logos/kubernetes.svg`,
	},
	{
		name: 'HostMetrics',
		id: 'hostMetrics',
		imgURL: `Logos/software-window.svg`,
	},
	{
		name: 'Other Metrics',
		id: 'otherMetrics',
		imgURL: `Logos/cmd-terminal.svg`,
	},
];

export const getDataSources = (module: ModuleProps): DataSourceType[] => {
	if (module.id === ModulesMap.APM) {
		return supportedLanguages;
	}

	if (module.id === ModulesMap.InfrastructureMonitoring) {
		return supportedInfraMetrics;
	}

	return supportedLogsTypes;
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
		(moduleID === ModulesMap.APM && dataSourceName === 'rails')
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
		(moduleID === ModulesMap.APM && dataSourceName === 'rails')
	) {
		return false;
	}

	return true;
};
