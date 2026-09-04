/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	CloudintegrationtypesAccountConfigDTO,
	CloudintegrationtypesAccountDTO,
	CloudintegrationtypesServiceConfigDTO,
	CloudintegrationtypesServiceDTO,
	CreateAccount201,
	GetAccount200,
	GetConnectionCredentials200,
	ListAccounts200,
	ListAccountServicesMetadata200,
} from 'api/generated/services/sigNoz.schemas';

import { monogramIcon } from '@/pages/IntegrationsModulePage/__story_mockdata__/integrations';

export const CLOUD_PROVIDERS = ['aws', 'azure', 'gcp'] as const;
export type CloudProvider = (typeof CLOUD_PROVIDERS)[number];

interface CloudServiceSeed {
	id: string;
	title: string;
	logs: boolean;
	metrics: boolean;
	dashboards: number;
}

/**
 * The services each provider ships, with the signals and dashboard counts from
 * `pkg/modules/cloudintegration/implcloudintegration/fs/definitions`, ordered by
 * id the way the backend lists them.
 */
const CLOUD_SERVICES: Record<CloudProvider, readonly CloudServiceSeed[]> = {
	aws: [
		{ id: 'alb', title: 'ALB', logs: false, metrics: true, dashboards: 1 },
		{
			id: 'api-gateway',
			title: 'API Gateway',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'dynamodb',
			title: 'DynamoDB',
			logs: false,
			metrics: true,
			dashboards: 1,
		},
		{ id: 'ec2', title: 'EC2', logs: false, metrics: true, dashboards: 1 },
		{ id: 'ecs', title: 'ECS', logs: true, metrics: true, dashboards: 3 },
		{ id: 'eks', title: 'EKS', logs: true, metrics: true, dashboards: 2 },
		{
			id: 'elasticache',
			title: 'ElastiCache',
			logs: false,
			metrics: true,
			dashboards: 1,
		},
		{ id: 'lambda', title: 'Lambda', logs: true, metrics: true, dashboards: 1 },
		{ id: 'msk', title: 'MSK', logs: false, metrics: true, dashboards: 1 },
		{ id: 'rds', title: 'RDS', logs: true, metrics: true, dashboards: 1 },
		{
			id: 's3sync',
			title: 'S3 Sync',
			logs: true,
			metrics: false,
			dashboards: 0,
		},
		{ id: 'sns', title: 'SNS', logs: false, metrics: true, dashboards: 1 },
		{ id: 'sqs', title: 'SQS', logs: false, metrics: true, dashboards: 1 },
	],
	azure: [
		{
			id: 'aks',
			title: 'Azure Kubernetes Service (AKS)',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'appservice',
			title: 'App Services',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'cassandradb',
			title: 'Cassandra DB',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'cdnprofile',
			title: 'CDN Profile',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'containerapp',
			title: 'Container App',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'cosmosdb',
			title: 'Cosmos DB',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'mongodb',
			title: 'MongoDB (DocumentDB)',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'mysqlflexibleserver',
			title: 'MySQL - Flexible Server',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'postgresqlflexibleserver',
			title: 'PostgreSQL - Flexible Server',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{ id: 'redis', title: 'Redis', logs: true, metrics: true, dashboards: 1 },
		{
			id: 'sqldatabase',
			title: 'SQL Database',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'sqldatabasemi',
			title: 'SQL Database Managed Instance',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'storageaccountsblob',
			title: 'Storage Accounts Blob Storage',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'virtualmachine',
			title: 'Virtual Machines',
			logs: false,
			metrics: true,
			dashboards: 1,
		},
	],
	gcp: [
		{
			id: 'cloudsql_mysql',
			title: 'GCP Cloud SQL for MySQL',
			logs: true,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'cloudsql_postgres',
			title: 'GCP Cloud SQL for PostgreSQL',
			logs: false,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'cloudstorage',
			title: 'GCP Cloud Storage',
			logs: false,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'computeengine',
			title: 'GCP Compute Engine',
			logs: false,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'gke',
			title: 'GCP Kubernetes Engine',
			logs: false,
			metrics: true,
			dashboards: 1,
		},
		{
			id: 'memorystore_redis',
			title: 'GCP Memorystore Redis',
			logs: false,
			metrics: true,
			dashboards: 1,
		},
	],
};

/** AWS is the longest catalogue, so one control covers all three providers. */
export const CLOUD_SERVICE_CAP = Math.max(
	...CLOUD_PROVIDERS.map((provider) => CLOUD_SERVICES[provider].length),
);

export const ACCOUNT_CAP = 3;

const PROVIDER_COLOUR: Record<CloudProvider, string> = {
	aws: '#FF9900',
	azure: '#0078D4',
	gcp: '#4285F4',
};

const serviceIcon = (provider: CloudProvider, id: string): string =>
	monogramIcon(
		id
			.replace(/[^a-z0-9]/gi, '')
			.slice(0, 3)
			.toUpperCase(),
		PROVIDER_COLOUR[provider],
	);

const cloudServices = (
	provider: CloudProvider,
	count: number,
): readonly CloudServiceSeed[] => CLOUD_SERVICES[provider].slice(0, count);

const findService = (
	provider: CloudProvider,
	serviceId: string,
): CloudServiceSeed | undefined =>
	CLOUD_SERVICES[provider].find((service) => service.id === serviceId);

/**
 * The account ids the story hands out. They are what `cloudAccountId` in the
 * URL holds and what the account selector lists, so they stay stable across
 * renders rather than being generated per request.
 */
const ACCOUNTS: Record<CloudProvider, readonly string[]> = {
	aws: ['482913150238', '755401882910', '119003467721'],
	azure: [
		'0f4b21ca-58d3-4d17-9d0e-1c8b3a67f4e2',
		'7d19c8ba-2e64-4f31-8a55-9b0c2d4e6f81',
		'b2c58e17-4a90-4c26-bd73-6f81e0a35c94',
	],
	gcp: ['signoz-prod-4471', 'signoz-analytics-8820', 'signoz-sandbox-1023'],
};

const accountConfig = (
	provider: CloudProvider,
): CloudintegrationtypesAccountConfigDTO => {
	if (provider === 'aws') {
		return { aws: { regions: ['us-east-1', 'eu-west-1', 'ap-south-1'] } };
	}

	if (provider === 'azure') {
		return {
			azure: {
				deploymentRegion: 'eastus',
				resourceGroups: ['signoz-prod-rg', 'signoz-staging-rg'],
			},
		};
	}

	return {
		gcp: {
			deploymentRegion: 'us-central1',
			deploymentProjectId: 'signoz-prod-4471',
			projectIds: ['signoz-prod-4471', 'signoz-analytics-8820'],
		},
	};
};

const account = (
	provider: CloudProvider,
	index: number,
): CloudintegrationtypesAccountDTO => ({
	id: `${provider}-account-${index + 1}`,
	orgId: 'story-org',
	provider,
	providerAccountId: ACCOUNTS[provider][index],
	config: accountConfig(provider),
	agentReport: { timestampMillis: Date.now() - 45 * 1000, data: null },
	createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
	updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
	removedAt: null,
});

export const accountsResponse = (
	provider: CloudProvider,
	count: number,
): ListAccounts200 => ({
	status: 'success',
	data: {
		accounts: Array.from({ length: count }, (_, index) =>
			account(provider, index),
		),
	},
});

export const accountResponse = (
	provider: CloudProvider,
	id: string,
): GetAccount200 => {
	const index = Math.max(
		0,
		Number.parseInt(id.replace(`${provider}-account-`, ''), 10) - 1,
	);

	return { status: 'success', data: account(provider, index) };
};

/**
 * Which signals each service has switched on. The controls own it: the mocks'
 * `effect` reseeds it from the Services and Enabled controls on every story
 * render, and the update handler writes what the form submitted, so Save moves
 * the service between the Enabled and Not Enabled lists.
 */
type ServiceSignals = { logs: boolean; metrics: boolean };

let serviceSignals = new Map<string, ServiceSignals>();

export const seedServiceSignals = (
	provider: CloudProvider,
	count: number,
	enabled: number,
): void => {
	serviceSignals = new Map(
		cloudServices(provider, count).map((service, index) => [
			service.id,
			{
				logs: index < enabled && service.logs,
				metrics: index < enabled && service.metrics,
			},
		]),
	);
};

export const setServiceSignals = (
	serviceId: string,
	config: CloudintegrationtypesServiceConfigDTO,
): void => {
	const signals = config.aws ?? config.azure ?? config.gcp;

	serviceSignals.set(serviceId, {
		logs: Boolean(signals?.logs?.enabled),
		metrics: Boolean(signals?.metrics?.enabled),
	});
};

const signalsOf = (serviceId: string): ServiceSignals =>
	serviceSignals.get(serviceId) ?? { logs: false, metrics: false };

/**
 * `withAccount` is false for the provider catalogue the page falls back to when
 * no account is connected: with no account there is no stored configuration, so
 * nothing can be enabled.
 */
export const servicesMetadataResponse = (
	provider: CloudProvider,
	count: number,
	withAccount: boolean,
): ListAccountServicesMetadata200 => ({
	status: 'success',
	data: {
		services: cloudServices(provider, count).map((service) => {
			const signals = signalsOf(service.id);

			return {
				id: service.id,
				title: service.title,
				icon: serviceIcon(provider, service.id),
				enabled: withAccount && (signals.logs || signals.metrics),
			};
		}),
	},
});

const LOG_ATTRIBUTES = [
	{ name: 'Timestamp', path: 'timestamp', type: 'timestamp' },
	{ name: 'Account Id', path: 'resources.cloud.account.id', type: 'string' },
	{ name: 'Region', path: 'resources.cloud.region', type: 'string' },
	{ name: 'Resource Id', path: 'resources.cloud.resource_id', type: 'string' },
	{ name: 'Body', path: 'body', type: 'string' },
];

const METRICS = [
	{ suffix: 'RequestCount_sum', type: 'Sum', unit: 'Count' },
	{ suffix: 'Latency_avg', type: 'Gauge', unit: 'Milliseconds' },
	{ suffix: 'ErrorCount_sum', type: 'Sum', unit: 'Count' },
	{ suffix: 'CPUUtilization_avg', type: 'Gauge', unit: 'Percent' },
	{ suffix: 'MemoryUtilization_avg', type: 'Gauge', unit: 'Percent' },
	{ suffix: 'ThrottledRequests_sum', type: 'Sum', unit: 'Count' },
];

const serviceConfig = (
	provider: CloudProvider,
	service: CloudServiceSeed,
): CloudintegrationtypesServiceConfigDTO => {
	const signals = signalsOf(service.id);
	const logs = {
		enabled: signals.logs,
		// The Save button stays disabled while s3sync has logs on and no bucket
		// picked, so an enabled s3sync comes back with the bucket it was set up on.
		...(service.id === 's3sync' && signals.logs
			? { s3Buckets: { 'us-east-1': ['acme-cloudtrail-use1'] } }
			: {}),
	};
	const metrics = { enabled: signals.metrics };

	if (provider === 'aws') {
		return { aws: { logs, metrics } };
	}

	if (provider === 'gcp') {
		return { gcp: { logs, metrics } };
	}

	return { azure: { logs, metrics } };
};

const serviceDetail = (
	provider: CloudProvider,
	service: CloudServiceSeed,
	/** Read-only, which is the page with no account connected. */
	withAccount: boolean,
): CloudintegrationtypesServiceDTO => ({
	id: service.id,
	title: service.title,
	icon: serviceIcon(provider, service.id),
	supportedSignals: { logs: service.logs, metrics: service.metrics },
	overview: [
		`### ${service.title}`,
		'',
		`SigNoz reads ${service.title} telemetry through the ${provider.toUpperCase()} integration agent: no collector to run, no credentials to rotate. Switch a signal on and the agent starts forwarding within a few minutes.`,
	].join('\n'),
	assets: {
		dashboards: Array.from({ length: service.dashboards }, (_, index) => ({
			title:
				index === 0
					? `${service.title} overview`
					: `${service.title} #${index + 1}`,
			description: `Prebuilt ${service.title} dashboard, installed with the service.`,
			// The dashboards are installed with the service, so one nobody enabled
			// has none and the card is the disabled one with the tooltip.
			...(withAccount && signalsOf(service.id).metrics
				? {
						integrationDashboard: {
							id: `${service.id}-dashboard-${index + 1}`,
							dashboardId: `${service.id}-dashboard-${index + 1}`,
							provider,
							slug: `${service.id}-overview`,
							createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
							updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
						},
					}
				: {}),
		})),
	},
	dataCollected: {
		logs: service.logs ? LOG_ATTRIBUTES : [],
		metrics: service.metrics
			? METRICS.map((metric) => ({
					name: `${provider}_${service.id}_${metric.suffix}`,
					type: metric.type,
					unit: metric.unit,
					description: '',
				}))
			: [],
	},
	cloudIntegrationService: withAccount
		? {
				id: `${provider}-${service.id}`,
				cloudIntegrationId: `${provider}-integration`,
				config: serviceConfig(provider, service),
				createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
				updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
			}
		: null,
});

export const serviceResponse = (
	provider: CloudProvider,
	serviceId: string,
	withAccount: boolean,
): { status: string; data: CloudintegrationtypesServiceDTO } | null => {
	const service = findService(provider, serviceId);

	if (!service) {
		return null;
	}

	return {
		status: 'success',
		data: serviceDetail(provider, service, withAccount),
	};
};

/**
 * `IntegrationDetailPage` calls `useGetIntegration` before it decides to render
 * the cloud page, so every visit to `/integrations/{aws,azure,gcp}` asks for a
 * built-in integration under that id and throws the answer away. There is no
 * such built-in, so the backend answers 404 and the mock does too. See BUGS.md.
 */
export const BUILT_IN_INTEGRATION_NOT_FOUND = {
	status: 'error',
	errorType: 'not_found',
	error: 'integration not found',
	data: null,
};

export const credentialsResponse = (): GetConnectionCredentials200 => ({
	status: 'success',
	data: {
		ingestionKey: 'story-ingestion-key-2f9c41',
		ingestionUrl: 'https://ingest.us.signoz.cloud:443',
		sigNozApiKey: 'story-api-key-8b7d02',
		sigNozApiUrl: 'https://story.us.signoz.cloud',
	},
});

/**
 * The connection URL is what the setup flow opens in a new tab, which the story
 * reports through the navigation overlay rather than following.
 */
export const createdAccountResponse = (
	provider: CloudProvider,
): CreateAccount201 => ({
	status: 'success',
	data: {
		id: `${provider}-account-new`,
		connectionArtifact: {
			aws: {
				connectionUrl: `https://console.aws.amazon.com/cloudformation/home#/stacks/create?templateURL=https://signoz.io/${provider}.yaml`,
			},
		},
	},
});
