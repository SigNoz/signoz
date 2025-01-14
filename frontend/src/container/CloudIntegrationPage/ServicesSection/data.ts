import { Service, ServiceData } from './types';

const services: Service[] = [
	{
		id: 'aws-elasticache',
		title: 'AWS ElastiCache',
		icon: '/Logos/aws-dark.svg?a=11',
	},
	{
		id: 'amazon-eks',
		title: 'AWS EKS',
		icon: '/Logos/aws-dark.svg?a=21',
	},
	{
		id: 'amazon-dynamo-db',
		title: 'Amazon DynamoDB',
		icon: '/Logos/aws-dark.svg?a=31',
	},
];

const serviceDetails: ServiceData[] = [
	// For aws-elasticache
	{
		id: 'aws-elasticache',
		title: 'AWS ElastiCache',
		icon: '/Logos/aws-dark.svg?a=1',
		overview:
			'**AWS ElastiCache** is a fully managed, Redis and Memcached-compatible service',
		assets: {
			dashboards: [
				{
					id: 'elasticache-overview',
					url: '/dashboard/elasticache',
					title: 'ElastiCache Overview',
					description: 'Monitor your ElastiCache clusters performance and health',
					image:
						'https://cdn1.dronahq.com/wp-content/uploads/2024/08/Dashboard-Image-Final.webp',
				},
			],
		},
		data_collected: {
			metrics: [
				{
					name: 'cache_hits',
					type: 'counter',
					unit: 'ops',
				},
				{
					name: 'memory_usage',
					type: 'gauge',
					unit: 'bytes',
				},
			],
		},
	},

	// For amazon-eks
	{
		id: 'amazon-eks',
		title: 'AWS EKS',
		icon: '/Logos/aws-dark.svg?a=2',
		overview:
			'Amazon Elastic Kubernetes Service (EKS) is a managed Kubernetes service that automates certain aspects of deployment and maintenance for any standard Kubernetes environment. Whether you are migrating an existing Kubernetes application to Amazon EKS, or are deploying a new cluster on Amazon EKS on AWS Outposts',
		assets: {
			dashboards: [
				{
					id: 'eks-cluster-overview',
					url: '/dashboard/eks',
					title: 'EKS Cluster Overview',
					description: 'Monitor your EKS cluster performance and health',
					image:
						'https://webdashboard.com/wp-content/uploads/2024/08/Power-BI-report-dashboard-sharing-Webdashboard-Screenshot-1536x864.png',
				},
			],
		},
		data_collected: {
			metrics: [
				{
					name: 'pod_count',
					type: 'gauge',
					unit: 'count',
				},
				{
					name: 'node_cpu_usage',
					type: 'gauge',
					unit: 'percent',
				},
			],
			logs: [
				{
					name: 'pod_count',
					type: 'gauge',
					path: 'count',
				},
				{
					name: 'node_cpu_usage',
					type: 'gauge',
					path: 'percent',
				},
			],
		},
	},

	// For amazon-dynamo-db
	{
		id: 'amazon-dynamo-db',
		title: 'Amazon DynamoDB',
		icon: '/Logos/aws-dark.svg?a=3',
		overview: '**Amazon DynamoDB** is a fully managed NoSQL database service',
		assets: {
			dashboards: [
				{
					id: 'dynamodb-overview',
					url: '/dashboard/dynamodb',
					title: 'DynamoDB Overview',
					description: 'Monitor your DynamoDB tables performance and consumption',
					image: '/Logos/aws-dark.svg?a=3',
				},
			],
		},
		data_collected: {
			metrics: [
				{
					name: 'read_throughput',
					type: 'gauge',
					unit: 'ops',
				},
				{
					name: 'write_throughput',
					type: 'gauge',
					unit: 'ops',
				},
			],
		},
	},
];

export { serviceDetails, services };
