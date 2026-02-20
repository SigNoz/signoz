export enum ModulesMap {
	APM = 'APM',
	LogsManagement = 'LogsManagement',
	InfrastructureMonitoring = 'InfrastructureMonitoring',
	AwsMonitoring = 'AwsMonitoring',
	AzureMonitoring = 'AzureMonitoring',
}

export interface DataSourceType {
	id?: string;
	name: string;
	imgURL?: string;
	label?: string;
}

export interface ModuleProps {
	id: string;
	title: string;
	desc: string;
}

export interface SelectedModuleStepProps {
	id: string;
	title: string;
	component: any;
}

export const useCases = {
	APM: {
		id: ModulesMap.APM,
		title: 'Application Monitoring',
		desc:
			'Monitor application metrics like p99 latency, error rates, external API calls, and db calls.',
	},
	LogsManagement: {
		id: ModulesMap.LogsManagement,
		title: 'Logs Management',
		desc:
			'Easily filter and query logs, build dashboards and alerts based on attributes in logs',
	},
	InfrastructureMonitoring: {
		id: ModulesMap.InfrastructureMonitoring,
		title: 'Infrastructure Monitoring',
		desc:
			'Monitor Kubernetes infrastructure metrics, hostmetrics, or metrics of any third-party integration',
	},
	AwsMonitoring: {
		id: ModulesMap.AwsMonitoring,
		title: 'AWS Monitoring',
		desc:
			'Monitor your traces, logs and metrics for AWS services like EC2, ECS, EKS etc.',
	},
	AzureMonitoring: {
		id: ModulesMap.AzureMonitoring,
		title: 'Azure Monitoring',
		desc:
			'Monitor your traces, logs and metrics for Azure services like AKS, Container Apps, App Service etc.',
	},
};
