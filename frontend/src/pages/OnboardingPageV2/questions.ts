import { Question } from './OnboardingPageV2'; // Adjust the import path as necessary

export const questions: Question[] = [
	{
		id: 'question-block-1',
		title: 'Select your data source',
		description:
			'Select from a host of services to start sending data to SigNoz.',
		options: [
			{
				id: 'category-1',
				category: 'Application Monitoring',
				items: ['Java', 'Python', 'Go', 'Node.js', 'Ruby', 'PHP'],
			},
			{
				id: 'category-2',
				category: 'Logs Monitoring',
				items: [
					'Kubernetes pods logs',
					'Docker container logs',
					'AWS CloudWatch',
					'ElasticSearch',
				],
			},
			{
				id: 'category-3',
				category: 'OpenTelemetry Collector',
				items: ['OTLP HTTP', 'OTLP GRPC'],
			},
			{
				id: 'category-4',
				category: 'Other Metrics',
				items: ['Host Metrics', 'Smart Agent Metrics'],
			},
			{
				id: 'category-5',
				category: 'AWS Metrics',
				items: [
					'AWS Application Logs',
					'AWS EC2 Metrics',
					'AWS ECS-Fargate',
					'AWS Lambda',
					'AWS Kinesis',
				],
			},
			{
				id: 'category-6',
				category: 'Azure Metrics',
				items: [
					'Azure Function',
					'Azure Container Logs',
					'Azure App Service',
					'AKS',
					'Azure Database Metrics',
					'Azure Blob Storage',
				],
			},
			{
				id: 'category-7',
				category: 'Datadog',
				items: ['Datadog Agent'],
			},
		],
		uiConfig: {
			showSearch: true,
		},
	},
	{
		id: 'question-block-2',
		title: 'Which Java Framework Do You Use?',
		description: 'Description', // Description is inferred, might need adjustment
		options: [
			{
				id: 'qb-2-category-1',
				category: 'Java frameworks',
				items: ['Spring Boot', 'Tomcat', 'JBoss', 'Others'],
			},
		],
	},
	{
		id: 'question-block-3',
		title: 'Select your data source',
		description:
			'Select from a host of services to start sending data to SigNoz.',
		options: [
			{
				id: 'category-1',
				category: 'Application Monitoring',
				items: ['Java', 'Python', 'Go', 'Node.js', 'Ruby', 'PHP'],
			},
			{
				id: 'category-2',
				category: 'Logs Monitoring',
				items: [
					'Kubernetes pods logs',
					'Docker container logs',
					'AWS CloudWatch',
					'ElasticSearch',
				],
			},
			{
				id: 'category-3',
				category: 'OpenTelemetry Collector',
				items: ['OTLP HTTP', 'OTLP GRPC'],
			},
			{
				id: 'category-4',
				category: 'Other Metrics',
				items: ['Host Metrics', 'Smart Agent Metrics'],
			},
			{
				id: 'category-5',
				category: 'AWS Metrics',
				items: [
					'AWS Application Logs',
					'AWS EC2 Metrics',
					'AWS ECS-Fargate',
					'AWS Lambda',
					'AWS Kinesis',
				],
			},
			{
				id: 'category-6',
				category: 'Azure Metrics',
				items: [
					'Azure Function',
					'Azure Container Logs',
					'Azure App Service',
					'AKS',
					'Azure Database Metrics',
					'Azure Blob Storage',
				],
			},
			{
				id: 'category-7',
				category: 'Datadog',
				items: ['Datadog Agent'],
			},
		],
		uiConfig: {
			showSearch: false,
		},
	},
];
