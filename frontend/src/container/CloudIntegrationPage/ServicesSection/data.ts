import { CloudAccountsData, Service, ServiceData } from './types';

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

const cloudAccountsData: CloudAccountsData = {
	accounts: [
		{
			id: '3e585f2d-fd1e-43bf-8a3b-ee9d449cc626',
			cloud_account_id: '443370682259',
			config: {
				regions: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'],
			},
			status: {
				integration: {
					last_heartbeat_ts_ms: 1709825467000,
				},
			},
		},
		{
			id: '7a9b2c3d-4e5f-6g7h-8i9j-0k1l2m3n4o5p',
			cloud_account_id: '123456789012',
			config: {
				regions: ['all'],
			},
			status: {
				integration: {
					last_heartbeat_ts_ms: 1709825467000,
				},
			},
		},
		{
			id: '9p8o7n6m-5l4k-3j2i-1h0g-f4e3d2c1b0a',
			cloud_account_id: '098765432109',
			config: {
				regions: ['eu-west-1', 'eu-central-1', 'ap-southeast-1'],
			},
			status: {
				integration: {
					last_heartbeat_ts_ms: 1709825467000,
				},
			},
		},
	],
};

export { cloudAccountsData, serviceDetails, services };
