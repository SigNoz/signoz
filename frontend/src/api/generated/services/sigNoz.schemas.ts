/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
export interface AlertmanagertypesChannelDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	data: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type string
	 */
	type: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface AlertmanagertypesDeprecatedGettableAlertDTO {
	annotations?: ModelLabelSetDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	endsAt?: Date;
	/**
	 * @type string
	 */
	fingerprint?: string;
	/**
	 * @type string
	 */
	generatorURL?: string;
	labels?: ModelLabelSetDTO;
	/**
	 * @type array
	 * @nullable true
	 */
	receivers?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	startsAt?: Date;
	status?: TypesAlertStatusDTO;
}

export enum AlertmanagertypesExpressionKindDTO {
	rule = 'rule',
	policy = 'policy',
}
export interface AlertmanagertypesGettableRoutePolicyDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	channels: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: Date;
	/**
	 * @type string
	 * @nullable true
	 */
	createdBy?: string | null;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	expression: string;
	/**
	 * @type string
	 */
	id: string;
	kind?: AlertmanagertypesExpressionKindDTO;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type array
	 * @nullable true
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: Date;
	/**
	 * @type string
	 * @nullable true
	 */
	updatedBy?: string | null;
}

export interface AlertmanagertypesPostableRoutePolicyDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	channels: string[] | null;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	expression: string;
	kind?: AlertmanagertypesExpressionKindDTO;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type array
	 * @nullable true
	 */
	tags?: string[] | null;
}

export interface AuthtypesAttributeMappingDTO {
	/**
	 * @type string
	 */
	email?: string;
	/**
	 * @type string
	 */
	groups?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	role?: string;
}

export interface AuthtypesAuthDomainConfigDTO {
	googleAuthConfig?: AuthtypesGoogleConfigDTO;
	oidcConfig?: AuthtypesOIDCConfigDTO;
	roleMapping?: AuthtypesRoleMappingDTO;
	samlConfig?: AuthtypesSamlConfigDTO;
	/**
	 * @type boolean
	 */
	ssoEnabled?: boolean;
	/**
	 * @type string
	 */
	ssoType?: string;
}

export interface AuthtypesAuthNProviderInfoDTO {
	/**
	 * @type string
	 * @nullable true
	 */
	relayStatePath?: string | null;
}

export interface AuthtypesAuthNSupportDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	callback?: AuthtypesCallbackAuthNSupportDTO[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	password?: AuthtypesPasswordAuthNSupportDTO[] | null;
}

export interface AuthtypesCallbackAuthNSupportDTO {
	/**
	 * @type string
	 */
	provider?: string;
	/**
	 * @type string
	 */
	url?: string;
}

export interface AuthtypesGettableAuthDomainDTO {
	authNProviderInfo?: AuthtypesAuthNProviderInfoDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	googleAuthConfig?: AuthtypesGoogleConfigDTO;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name?: string;
	oidcConfig?: AuthtypesOIDCConfigDTO;
	/**
	 * @type string
	 */
	orgId?: string;
	roleMapping?: AuthtypesRoleMappingDTO;
	samlConfig?: AuthtypesSamlConfigDTO;
	/**
	 * @type boolean
	 */
	ssoEnabled?: boolean;
	/**
	 * @type string
	 */
	ssoType?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface AuthtypesGettableObjectsDTO {
	resource: AuthtypesResourceDTO;
	/**
	 * @type array
	 */
	selectors: string[];
}

/**
 * @nullable
 */
export type AuthtypesGettableResourcesDTORelations = {
	[key: string]: string[];
} | null;

export interface AuthtypesGettableResourcesDTO {
	/**
	 * @type object
	 * @nullable true
	 */
	relations: AuthtypesGettableResourcesDTORelations;
	/**
	 * @type array
	 */
	resources: AuthtypesResourceDTO[];
}

export interface AuthtypesGettableTokenDTO {
	/**
	 * @type string
	 */
	accessToken?: string;
	/**
	 * @type integer
	 */
	expiresIn?: number;
	/**
	 * @type string
	 */
	refreshToken?: string;
	/**
	 * @type string
	 */
	tokenType?: string;
}

export interface AuthtypesGettableTransactionDTO {
	/**
	 * @type boolean
	 */
	authorized: boolean;
	object: AuthtypesObjectDTO;
	/**
	 * @type string
	 */
	relation: string;
}

export type AuthtypesGoogleConfigDTODomainToAdminEmail = {
	[key: string]: string;
};

export interface AuthtypesGoogleConfigDTO {
	/**
	 * @type array
	 */
	allowedGroups?: string[];
	/**
	 * @type string
	 */
	clientId?: string;
	/**
	 * @type string
	 */
	clientSecret?: string;
	/**
	 * @type object
	 */
	domainToAdminEmail?: AuthtypesGoogleConfigDTODomainToAdminEmail;
	/**
	 * @type boolean
	 */
	fetchGroups?: boolean;
	/**
	 * @type boolean
	 */
	fetchTransitiveGroupMembership?: boolean;
	/**
	 * @type boolean
	 */
	insecureSkipEmailVerified?: boolean;
	/**
	 * @type string
	 */
	redirectURI?: string;
	/**
	 * @type string
	 */
	serviceAccountJson?: string;
}

export interface AuthtypesOIDCConfigDTO {
	claimMapping?: AuthtypesAttributeMappingDTO;
	/**
	 * @type string
	 */
	clientId?: string;
	/**
	 * @type string
	 */
	clientSecret?: string;
	/**
	 * @type boolean
	 */
	getUserInfo?: boolean;
	/**
	 * @type boolean
	 */
	insecureSkipEmailVerified?: boolean;
	/**
	 * @type string
	 */
	issuer?: string;
	/**
	 * @type string
	 */
	issuerAlias?: string;
}

export interface AuthtypesObjectDTO {
	resource: AuthtypesResourceDTO;
	/**
	 * @type string
	 */
	selector: string;
}

export interface AuthtypesOrgSessionContextDTO {
	authNSupport?: AuthtypesAuthNSupportDTO;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type string
	 */
	name?: string;
	warning?: ErrorsJSONDTO;
}

export interface AuthtypesPasswordAuthNSupportDTO {
	/**
	 * @type string
	 */
	provider?: string;
}

export interface AuthtypesPatchableObjectsDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	additions: AuthtypesGettableObjectsDTO[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	deletions: AuthtypesGettableObjectsDTO[] | null;
}

export interface AuthtypesPatchableRoleDTO {
	/**
	 * @type string
	 */
	description: string;
}

export interface AuthtypesPostableAuthDomainDTO {
	config?: AuthtypesAuthDomainConfigDTO;
	/**
	 * @type string
	 */
	name?: string;
}

export interface AuthtypesPostableEmailPasswordSessionDTO {
	/**
	 * @type string
	 */
	email?: string;
	/**
	 * @type string
	 */
	orgId?: string;
	/**
	 * @type string
	 */
	password?: string;
}

export interface AuthtypesPostableRoleDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name: string;
}

export interface AuthtypesPostableRotateTokenDTO {
	/**
	 * @type string
	 */
	refreshToken?: string;
}

export interface AuthtypesResourceDTO {
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	type: string;
}

export interface AuthtypesRoleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	description: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type string
	 */
	type: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

/**
 * @nullable
 */
export type AuthtypesRoleMappingDTOGroupMappings = {
	[key: string]: string;
} | null;

export interface AuthtypesRoleMappingDTO {
	/**
	 * @type string
	 */
	defaultRole?: string;
	/**
	 * @type object
	 * @nullable true
	 */
	groupMappings?: AuthtypesRoleMappingDTOGroupMappings;
	/**
	 * @type boolean
	 */
	useRoleAttribute?: boolean;
}

export interface AuthtypesSamlConfigDTO {
	attributeMapping?: AuthtypesAttributeMappingDTO;
	/**
	 * @type boolean
	 */
	insecureSkipAuthNRequestsSigned?: boolean;
	/**
	 * @type string
	 */
	samlCert?: string;
	/**
	 * @type string
	 */
	samlEntity?: string;
	/**
	 * @type string
	 */
	samlIdp?: string;
}

export interface AuthtypesSessionContextDTO {
	/**
	 * @type boolean
	 */
	exists?: boolean;
	/**
	 * @type array
	 * @nullable true
	 */
	orgs?: AuthtypesOrgSessionContextDTO[] | null;
}

export interface AuthtypesTransactionDTO {
	object: AuthtypesObjectDTO;
	/**
	 * @type string
	 */
	relation: string;
}

export interface AuthtypesUpdateableAuthDomainDTO {
	config?: AuthtypesAuthDomainConfigDTO;
}

export interface AuthtypesUserRoleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: Date;
	/**
	 * @type string
	 */
	id: string;
	role: AuthtypesRoleDTO;
	/**
	 * @type string
	 */
	roleId: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: Date;
	/**
	 * @type string
	 */
	userId: string;
}

export interface AuthtypesUserWithRolesDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	displayName?: string;
	/**
	 * @type string
	 */
	email?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type boolean
	 */
	isRoot?: boolean;
	/**
	 * @type string
	 */
	orgId?: string;
	/**
	 * @type string
	 */
	status?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
	/**
	 * @type array
	 * @nullable true
	 */
	userRoles?: AuthtypesUserRoleDTO[] | null;
}

export interface CloudintegrationtypesAWSAccountConfigDTO {
	/**
	 * @type array
	 */
	regions: string[];
}

export interface CloudintegrationtypesAWSCloudWatchLogsSubscriptionDTO {
	/**
	 * @type string
	 */
	filterPattern: string;
	/**
	 * @type string
	 */
	logGroupNamePrefix: string;
}

export interface CloudintegrationtypesAWSCloudWatchMetricStreamFilterDTO {
	/**
	 * @type array
	 */
	metricNames?: string[];
	/**
	 * @type string
	 */
	namespace: string;
}

export interface CloudintegrationtypesAWSConnectionArtifactDTO {
	/**
	 * @type string
	 */
	connectionUrl: string;
}

export interface CloudintegrationtypesAWSIntegrationConfigDTO {
	/**
	 * @type array
	 */
	enabledRegions: string[];
	telemetryCollectionStrategy: CloudintegrationtypesAWSTelemetryCollectionStrategyDTO;
}

export interface CloudintegrationtypesAWSLogsCollectionStrategyDTO {
	/**
	 * @type array
	 */
	subscriptions: CloudintegrationtypesAWSCloudWatchLogsSubscriptionDTO[];
}

export interface CloudintegrationtypesAWSMetricsCollectionStrategyDTO {
	/**
	 * @type array
	 */
	streamFilters: CloudintegrationtypesAWSCloudWatchMetricStreamFilterDTO[];
}

export interface CloudintegrationtypesAWSPostableAccountConfigDTO {
	/**
	 * @type string
	 */
	deploymentRegion: string;
	/**
	 * @type array
	 */
	regions: string[];
}

export interface CloudintegrationtypesAWSServiceConfigDTO {
	logs?: CloudintegrationtypesAWSServiceLogsConfigDTO;
	metrics?: CloudintegrationtypesAWSServiceMetricsConfigDTO;
}

export type CloudintegrationtypesAWSServiceLogsConfigDTOS3Buckets = {
	[key: string]: string[];
};

export interface CloudintegrationtypesAWSServiceLogsConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type object
	 */
	s3Buckets?: CloudintegrationtypesAWSServiceLogsConfigDTOS3Buckets;
}

export interface CloudintegrationtypesAWSServiceMetricsConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
}

export type CloudintegrationtypesAWSTelemetryCollectionStrategyDTOS3Buckets = {
	[key: string]: string[];
};

export interface CloudintegrationtypesAWSTelemetryCollectionStrategyDTO {
	logs?: CloudintegrationtypesAWSLogsCollectionStrategyDTO;
	metrics?: CloudintegrationtypesAWSMetricsCollectionStrategyDTO;
	/**
	 * @type object
	 */
	s3Buckets?: CloudintegrationtypesAWSTelemetryCollectionStrategyDTOS3Buckets;
}

export interface CloudintegrationtypesAccountDTO {
	agentReport: CloudintegrationtypesAgentReportDTO;
	config: CloudintegrationtypesAccountConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type string
	 */
	provider: string;
	/**
	 * @type string
	 * @nullable true
	 */
	providerAccountId: string | null;
	/**
	 * @type string
	 * @format date-time
	 * @nullable true
	 */
	removedAt: Date | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface CloudintegrationtypesAccountConfigDTO {
	aws?: CloudintegrationtypesAWSAccountConfigDTO;
	azure?: CloudintegrationtypesAzureAccountConfigDTO;
}

/**
 * @nullable
 */
export type CloudintegrationtypesAgentReportDTOData = {
	[key: string]: unknown;
} | null;

/**
 * @nullable
 */
export type CloudintegrationtypesAgentReportDTO = {
	/**
	 * @type object
	 * @nullable true
	 */
	data: CloudintegrationtypesAgentReportDTOData;
	/**
	 * @type integer
	 * @format int64
	 */
	timestampMillis: number;
} | null;

export interface CloudintegrationtypesAssetsDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	dashboards?: CloudintegrationtypesDashboardDTO[] | null;
}

export interface CloudintegrationtypesAzureAccountConfigDTO {
	/**
	 * @type string
	 */
	deploymentRegion: string;
	/**
	 * @type array
	 */
	resourceGroups: string[];
}

export interface CloudintegrationtypesAzureConnectionArtifactDTO {
	/**
	 * @type string
	 */
	cliCommand: string;
	/**
	 * @type string
	 */
	cloudPowerShellCommand: string;
}

export interface CloudintegrationtypesAzureIntegrationConfigDTO {
	/**
	 * @type string
	 */
	deploymentRegion: string;
	/**
	 * @type array
	 */
	resourceGroups: string[];
	/**
	 * @type array
	 */
	telemetryCollectionStrategy: CloudintegrationtypesAzureTelemetryCollectionStrategyDTO[];
}

export interface CloudintegrationtypesAzureLogsCollectionStrategyDTO {
	/**
	 * @type array
	 */
	categoryGroups: string[];
}

export interface CloudintegrationtypesAzureMetricsCollectionStrategyDTO {
	[key: string]: unknown;
}

export interface CloudintegrationtypesAzureServiceConfigDTO {
	logs: CloudintegrationtypesAzureServiceLogsConfigDTO;
	metrics: CloudintegrationtypesAzureServiceMetricsConfigDTO;
}

export interface CloudintegrationtypesAzureServiceLogsConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
}

export interface CloudintegrationtypesAzureServiceMetricsConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
}

export interface CloudintegrationtypesAzureTelemetryCollectionStrategyDTO {
	logs?: CloudintegrationtypesAzureLogsCollectionStrategyDTO;
	metrics?: CloudintegrationtypesAzureMetricsCollectionStrategyDTO;
	/**
	 * @type string
	 */
	resourceType: string;
}

/**
 * @nullable
 */
export type CloudintegrationtypesCloudIntegrationServiceDTO = {
	/**
	 * @type string
	 */
	cloudIntegrationId?: string;
	config?: CloudintegrationtypesServiceConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	id: string;
	type?: CloudintegrationtypesServiceIDDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
} | null;

export interface CloudintegrationtypesCollectedLogAttributeDTO {
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	path?: string;
	/**
	 * @type string
	 */
	type?: string;
}

export interface CloudintegrationtypesCollectedMetricDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	unit?: string;
}

export interface CloudintegrationtypesConnectionArtifactDTO {
	aws?: CloudintegrationtypesAWSConnectionArtifactDTO;
	azure?: CloudintegrationtypesAzureConnectionArtifactDTO;
}

export interface CloudintegrationtypesCredentialsDTO {
	/**
	 * @type string
	 */
	ingestionKey: string;
	/**
	 * @type string
	 */
	ingestionUrl: string;
	/**
	 * @type string
	 */
	sigNozApiKey: string;
	/**
	 * @type string
	 */
	sigNozApiUrl: string;
}

export interface CloudintegrationtypesDashboardDTO {
	definition?: DashboardtypesStorableDashboardDataDTO;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type string
	 */
	title?: string;
}

export interface CloudintegrationtypesDataCollectedDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	logs?: CloudintegrationtypesCollectedLogAttributeDTO[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	metrics?: CloudintegrationtypesCollectedMetricDTO[] | null;
}

export interface CloudintegrationtypesGettableAccountWithConnectionArtifactDTO {
	connectionArtifact: CloudintegrationtypesConnectionArtifactDTO;
	/**
	 * @type string
	 */
	id: string;
}

export interface CloudintegrationtypesGettableAccountsDTO {
	/**
	 * @type array
	 */
	accounts: CloudintegrationtypesAccountDTO[];
}

export interface CloudintegrationtypesGettableAgentCheckInDTO {
	/**
	 * @type string
	 */
	account_id: string;
	/**
	 * @type string
	 */
	cloud_account_id: string;
	/**
	 * @type string
	 */
	cloudIntegrationId: string;
	integration_config: CloudintegrationtypesIntegrationConfigDTO;
	integrationConfig: CloudintegrationtypesProviderIntegrationConfigDTO;
	/**
	 * @type string
	 */
	providerAccountId: string;
	/**
	 * @type string
	 * @format date-time
	 * @nullable true
	 */
	removed_at: Date | null;
	/**
	 * @type string
	 * @format date-time
	 * @nullable true
	 */
	removedAt: Date | null;
}

export interface CloudintegrationtypesGettableServicesMetadataDTO {
	/**
	 * @type array
	 */
	services: CloudintegrationtypesServiceMetadataDTO[];
}

/**
 * @nullable
 */
export type CloudintegrationtypesIntegrationConfigDTO = {
	/**
	 * @type array
	 */
	enabled_regions: string[];
	telemetry: CloudintegrationtypesOldAWSCollectionStrategyDTO;
} | null;

export type CloudintegrationtypesOldAWSCollectionStrategyDTOS3Buckets = {
	[key: string]: string[];
};

export interface CloudintegrationtypesOldAWSCollectionStrategyDTO {
	aws_logs?: CloudintegrationtypesOldAWSLogsStrategyDTO;
	aws_metrics?: CloudintegrationtypesOldAWSMetricsStrategyDTO;
	/**
	 * @type string
	 */
	provider?: string;
	/**
	 * @type object
	 */
	s3_buckets?: CloudintegrationtypesOldAWSCollectionStrategyDTOS3Buckets;
}

export type CloudintegrationtypesOldAWSLogsStrategyDTOCloudwatchLogsSubscriptionsItem = {
	/**
	 * @type string
	 */
	filter_pattern?: string;
	/**
	 * @type string
	 */
	log_group_name_prefix?: string;
};

export interface CloudintegrationtypesOldAWSLogsStrategyDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	cloudwatch_logs_subscriptions?:
		| CloudintegrationtypesOldAWSLogsStrategyDTOCloudwatchLogsSubscriptionsItem[]
		| null;
}

export type CloudintegrationtypesOldAWSMetricsStrategyDTOCloudwatchMetricStreamFiltersItem = {
	/**
	 * @type array
	 */
	MetricNames?: string[];
	/**
	 * @type string
	 */
	Namespace?: string;
};

export interface CloudintegrationtypesOldAWSMetricsStrategyDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	cloudwatch_metric_stream_filters?:
		| CloudintegrationtypesOldAWSMetricsStrategyDTOCloudwatchMetricStreamFiltersItem[]
		| null;
}

export interface CloudintegrationtypesPostableAccountDTO {
	config: CloudintegrationtypesPostableAccountConfigDTO;
	credentials: CloudintegrationtypesCredentialsDTO;
}

export interface CloudintegrationtypesPostableAccountConfigDTO {
	aws?: CloudintegrationtypesAWSPostableAccountConfigDTO;
	azure?: CloudintegrationtypesAzureAccountConfigDTO;
}

/**
 * @nullable
 */
export type CloudintegrationtypesPostableAgentCheckInDTOData = {
	[key: string]: unknown;
} | null;

export interface CloudintegrationtypesPostableAgentCheckInDTO {
	/**
	 * @type string
	 */
	account_id?: string;
	/**
	 * @type string
	 */
	cloud_account_id?: string;
	/**
	 * @type string
	 */
	cloudIntegrationId?: string;
	/**
	 * @type object
	 * @nullable true
	 */
	data: CloudintegrationtypesPostableAgentCheckInDTOData;
	/**
	 * @type string
	 */
	providerAccountId?: string;
}

export interface CloudintegrationtypesProviderIntegrationConfigDTO {
	aws?: CloudintegrationtypesAWSIntegrationConfigDTO;
	azure?: CloudintegrationtypesAzureIntegrationConfigDTO;
}

export interface CloudintegrationtypesServiceDTO {
	assets: CloudintegrationtypesAssetsDTO;
	cloudIntegrationService: CloudintegrationtypesCloudIntegrationServiceDTO;
	dataCollected: CloudintegrationtypesDataCollectedDTO;
	/**
	 * @type string
	 */
	icon: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	overview: string;
	supportedSignals: CloudintegrationtypesSupportedSignalsDTO;
	telemetryCollectionStrategy: CloudintegrationtypesTelemetryCollectionStrategyDTO;
	/**
	 * @type string
	 */
	title: string;
}

export interface CloudintegrationtypesServiceConfigDTO {
	aws?: CloudintegrationtypesAWSServiceConfigDTO;
	azure?: CloudintegrationtypesAzureServiceConfigDTO;
}

export enum CloudintegrationtypesServiceIDDTO {
	alb = 'alb',
	'api-gateway' = 'api-gateway',
	dynamodb = 'dynamodb',
	ec2 = 'ec2',
	ecs = 'ecs',
	eks = 'eks',
	elasticache = 'elasticache',
	lambda = 'lambda',
	msk = 'msk',
	rds = 'rds',
	s3sync = 's3sync',
	sns = 'sns',
	sqs = 'sqs',
	blobstorage = 'blobstorage',
	frontdoor = 'frontdoor',
}
export interface CloudintegrationtypesServiceMetadataDTO {
	/**
	 * @type boolean
	 */
	enabled: boolean;
	/**
	 * @type string
	 */
	icon: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	title: string;
}

export interface CloudintegrationtypesSupportedSignalsDTO {
	/**
	 * @type boolean
	 */
	logs?: boolean;
	/**
	 * @type boolean
	 */
	metrics?: boolean;
}

export interface CloudintegrationtypesTelemetryCollectionStrategyDTO {
	aws?: CloudintegrationtypesAWSTelemetryCollectionStrategyDTO;
	azure?: CloudintegrationtypesAzureTelemetryCollectionStrategyDTO;
}

export interface CloudintegrationtypesUpdatableAccountDTO {
	config: CloudintegrationtypesUpdatableAccountConfigDTO;
}

export interface CloudintegrationtypesUpdatableAccountConfigDTO {
	aws?: CloudintegrationtypesAWSAccountConfigDTO;
	azure?: CloudintegrationtypesUpdatableAzureAccountConfigDTO;
}

export interface CloudintegrationtypesUpdatableAzureAccountConfigDTO {
	/**
	 * @type array
	 */
	resourceGroups: string[];
}

export interface CloudintegrationtypesUpdatableServiceDTO {
	config: CloudintegrationtypesServiceConfigDTO;
}

export interface ConfigAuthorizationDTO {
	/**
	 * @type string
	 */
	credentials?: string;
	/**
	 * @type string
	 */
	credentials_file?: string;
	/**
	 * @type string
	 */
	credentials_ref?: string;
	/**
	 * @type string
	 */
	type?: string;
}

export interface ConfigBasicAuthDTO {
	/**
	 * @type string
	 */
	password?: string;
	/**
	 * @type string
	 */
	password_file?: string;
	/**
	 * @type string
	 */
	password_ref?: string;
	/**
	 * @type string
	 */
	username?: string;
	/**
	 * @type string
	 */
	username_file?: string;
	/**
	 * @type string
	 */
	username_ref?: string;
}

export interface ConfigDiscordConfigDTO {
	/**
	 * @type string
	 */
	avatar_url?: string;
	/**
	 * @type string
	 */
	content?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	username?: string;
	webhook_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	webhook_url_file?: string;
}

export type ConfigDurationDTO = string;

export type ConfigEmailConfigDTOHeaders = { [key: string]: string };

export interface ConfigEmailConfigDTO {
	/**
	 * @type string
	 */
	auth_identity?: string;
	/**
	 * @type string
	 */
	auth_password?: string;
	/**
	 * @type string
	 */
	auth_password_file?: string;
	/**
	 * @type string
	 */
	auth_secret?: string;
	/**
	 * @type string
	 */
	auth_secret_file?: string;
	/**
	 * @type string
	 */
	auth_username?: string;
	/**
	 * @type boolean
	 * @nullable true
	 */
	force_implicit_tls?: boolean | null;
	/**
	 * @type string
	 */
	from?: string;
	/**
	 * @type object
	 */
	headers?: ConfigEmailConfigDTOHeaders;
	/**
	 * @type string
	 */
	hello?: string;
	/**
	 * @type string
	 */
	html?: string;
	/**
	 * @type boolean
	 * @nullable true
	 */
	require_tls?: boolean | null;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	smarthost?: ConfigHostPortDTO;
	/**
	 * @type string
	 */
	text?: string;
	threading?: ConfigThreadingConfigDTO;
	tls_config?: ConfigTLSConfigDTO;
	/**
	 * @type string
	 */
	to?: string;
}

export interface ConfigHTTPClientConfigDTO {
	authorization?: ConfigAuthorizationDTO;
	basic_auth?: ConfigBasicAuthDTO;
	/**
	 * @type string
	 */
	bearer_token?: string;
	/**
	 * @type string
	 */
	bearer_token_file?: string;
	/**
	 * @type boolean
	 */
	enable_http2?: boolean;
	/**
	 * @type boolean
	 */
	follow_redirects?: boolean;
	http_headers?: ConfigHeadersDTO;
	/**
	 * @type string
	 */
	no_proxy?: string;
	oauth2?: ConfigOAuth2DTO;
	proxy_connect_header?: ConfigProxyHeaderDTO;
	/**
	 * @type boolean
	 */
	proxy_from_environment?: boolean;
	proxy_url?: ConfigURLDTO;
	tls_config?: ConfigTLSConfigDTO;
}

export interface ConfigHeadersDTO {
	[key: string]: unknown;
}

export interface ConfigHostPortDTO {
	[key: string]: unknown;
}

export interface ConfigIncidentioConfigDTO {
	/**
	 * @type string
	 */
	alert_source_token?: string;
	/**
	 * @type string
	 */
	alert_source_token_file?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type integer
	 * @minimum 0
	 */
	max_alerts?: number;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	timeout?: TimeDurationDTO;
	url?: ConfigURLType2DTO;
	/**
	 * @type string
	 */
	url_file?: string;
}

export type ConfigJiraConfigDTOCustomFields = { [key: string]: unknown };

export interface ConfigJiraConfigDTO {
	/**
	 * @type string
	 */
	api_type?: string;
	api_url?: ConfigURLType2DTO;
	/**
	 * @type object
	 */
	custom_fields?: ConfigJiraConfigDTOCustomFields;
	description?: ConfigJiraFieldConfigDTO;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	issue_type?: string;
	/**
	 * @type array
	 */
	labels?: string[];
	/**
	 * @type string
	 */
	priority?: string;
	/**
	 * @type string
	 */
	project?: string;
	reopen_duration?: ModelDurationDTO;
	/**
	 * @type string
	 */
	reopen_transition?: string;
	/**
	 * @type string
	 */
	resolve_transition?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	summary?: ConfigJiraFieldConfigDTO;
	/**
	 * @type string
	 */
	wont_fix_resolution?: string;
}

export interface ConfigJiraFieldConfigDTO {
	/**
	 * @type boolean
	 * @nullable true
	 */
	enable_update?: boolean | null;
	/**
	 * @type string
	 */
	template?: string;
}

export interface ConfigMSTeamsConfigDTO {
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	summary?: string;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	title?: string;
	webhook_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	webhook_url_file?: string;
}

export interface ConfigMSTeamsV2ConfigDTO {
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	title?: string;
	webhook_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	webhook_url_file?: string;
}

export interface ConfigMattermostAttachmentDTO {
	/**
	 * @type string
	 */
	author_icon?: string;
	/**
	 * @type string
	 */
	author_link?: string;
	/**
	 * @type string
	 */
	author_name?: string;
	/**
	 * @type string
	 */
	color?: string;
	/**
	 * @type string
	 */
	fallback?: string;
	/**
	 * @type array
	 */
	fields?: ConfigMattermostFieldDTO[];
	/**
	 * @type string
	 */
	footer?: string;
	/**
	 * @type string
	 */
	footer_icon?: string;
	/**
	 * @type string
	 */
	image_url?: string;
	/**
	 * @type string
	 */
	pretext?: string;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	thumb_url?: string;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	title_link?: string;
}

export interface ConfigMattermostConfigDTO {
	/**
	 * @type array
	 */
	attachments?: ConfigMattermostAttachmentDTO[];
	/**
	 * @type string
	 */
	channel?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	icon_emoji?: string;
	/**
	 * @type string
	 */
	icon_url?: string;
	priority?: ConfigMattermostPriorityDTO;
	props?: ConfigMattermostPropsDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	username?: string;
	webhook_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	webhook_url_file?: string;
}

export interface ConfigMattermostFieldDTO {
	/**
	 * @type boolean
	 * @nullable true
	 */
	short?: boolean | null;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	value?: string;
}

export interface ConfigMattermostPriorityDTO {
	/**
	 * @type boolean
	 */
	persistent_notifications?: boolean;
	/**
	 * @type string
	 */
	priority?: string;
	/**
	 * @type boolean
	 */
	requested_ack?: boolean;
}

export interface ConfigMattermostPropsDTO {
	/**
	 * @type string
	 */
	card?: string;
}

export type ConfigOAuth2DTOClaims = { [key: string]: unknown };

export type ConfigOAuth2DTOEndpointParams = { [key: string]: string };

export interface ConfigOAuth2DTO {
	/**
	 * @type string
	 */
	audience?: string;
	/**
	 * @type object
	 */
	claims?: ConfigOAuth2DTOClaims;
	/**
	 * @type string
	 */
	client_certificate_key?: string;
	/**
	 * @type string
	 */
	client_certificate_key_file?: string;
	/**
	 * @type string
	 */
	client_certificate_key_id?: string;
	/**
	 * @type string
	 */
	client_certificate_key_ref?: string;
	/**
	 * @type string
	 */
	client_id?: string;
	/**
	 * @type string
	 */
	client_secret?: string;
	/**
	 * @type string
	 */
	client_secret_file?: string;
	/**
	 * @type string
	 */
	client_secret_ref?: string;
	/**
	 * @type object
	 */
	endpoint_params?: ConfigOAuth2DTOEndpointParams;
	/**
	 * @type string
	 */
	grant_type?: string;
	/**
	 * @type string
	 */
	iss?: string;
	/**
	 * @type string
	 */
	no_proxy?: string;
	proxy_connect_header?: ConfigProxyHeaderDTO;
	/**
	 * @type boolean
	 */
	proxy_from_environment?: boolean;
	proxy_url?: ConfigURLDTO;
	/**
	 * @type array
	 */
	scopes?: string[];
	/**
	 * @type string
	 */
	signature_algorithm?: string;
	/**
	 * @type string
	 */
	token_url?: string;
}

export type ConfigOpsGenieConfigDTODetails = { [key: string]: string };

export interface ConfigOpsGenieConfigDTO {
	/**
	 * @type string
	 */
	actions?: string;
	/**
	 * @type string
	 */
	api_key?: string;
	/**
	 * @type string
	 */
	api_key_file?: string;
	api_url?: ConfigURLType2DTO;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type object
	 */
	details?: ConfigOpsGenieConfigDTODetails;
	/**
	 * @type string
	 */
	entity?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	note?: string;
	/**
	 * @type string
	 */
	priority?: string;
	/**
	 * @type array
	 */
	responders?: ConfigOpsGenieConfigResponderDTO[];
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	source?: string;
	/**
	 * @type string
	 */
	tags?: string;
	/**
	 * @type boolean
	 */
	update_alerts?: boolean;
}

export interface ConfigOpsGenieConfigResponderDTO {
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	username?: string;
}

export type ConfigPagerdutyConfigDTODetails = { [key: string]: unknown };

export interface ConfigPagerdutyConfigDTO {
	/**
	 * @type string
	 */
	class?: string;
	/**
	 * @type string
	 */
	client?: string;
	/**
	 * @type string
	 */
	client_url?: string;
	/**
	 * @type string
	 */
	component?: string;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type object
	 */
	details?: ConfigPagerdutyConfigDTODetails;
	/**
	 * @type string
	 */
	group?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type array
	 */
	images?: ConfigPagerdutyImageDTO[];
	/**
	 * @type array
	 */
	links?: ConfigPagerdutyLinkDTO[];
	/**
	 * @type string
	 */
	routing_key?: string;
	/**
	 * @type string
	 */
	routing_key_file?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	service_key?: string;
	/**
	 * @type string
	 */
	service_key_file?: string;
	/**
	 * @type string
	 */
	severity?: string;
	/**
	 * @type string
	 */
	source?: string;
	timeout?: TimeDurationDTO;
	url?: ConfigURLType2DTO;
}

export interface ConfigPagerdutyImageDTO {
	/**
	 * @type string
	 */
	alt?: string;
	/**
	 * @type string
	 */
	href?: string;
	/**
	 * @type string
	 */
	src?: string;
}

export interface ConfigPagerdutyLinkDTO {
	/**
	 * @type string
	 */
	href?: string;
	/**
	 * @type string
	 */
	text?: string;
}

export interface ConfigProxyHeaderDTO {
	[key: string]: string[];
}

export interface ConfigPushoverConfigDTO {
	/**
	 * @type string
	 */
	device?: string;
	expire?: ConfigDurationDTO;
	/**
	 * @type boolean
	 */
	html?: boolean;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type boolean
	 */
	monospace?: boolean;
	/**
	 * @type string
	 */
	priority?: string;
	retry?: ConfigDurationDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	sound?: string;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	token?: string;
	/**
	 * @type string
	 */
	token_file?: string;
	ttl?: ConfigDurationDTO;
	/**
	 * @type string
	 */
	url?: string;
	/**
	 * @type string
	 */
	url_title?: string;
	/**
	 * @type string
	 */
	user_key?: string;
	/**
	 * @type string
	 */
	user_key_file?: string;
}

export interface ConfigReceiverDTO {
	/**
	 * @type array
	 */
	discord_configs?: ConfigDiscordConfigDTO[];
	/**
	 * @type array
	 */
	email_configs?: ConfigEmailConfigDTO[];
	/**
	 * @type array
	 */
	incidentio_configs?: ConfigIncidentioConfigDTO[];
	/**
	 * @type array
	 */
	jira_configs?: ConfigJiraConfigDTO[];
	/**
	 * @type array
	 */
	mattermost_configs?: ConfigMattermostConfigDTO[];
	/**
	 * @type array
	 */
	msteams_configs?: ConfigMSTeamsConfigDTO[];
	/**
	 * @type array
	 */
	msteamsv2_configs?: ConfigMSTeamsV2ConfigDTO[];
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type array
	 */
	opsgenie_configs?: ConfigOpsGenieConfigDTO[];
	/**
	 * @type array
	 */
	pagerduty_configs?: ConfigPagerdutyConfigDTO[];
	/**
	 * @type array
	 */
	pushover_configs?: ConfigPushoverConfigDTO[];
	/**
	 * @type array
	 */
	rocketchat_configs?: ConfigRocketchatConfigDTO[];
	/**
	 * @type array
	 */
	slack_configs?: ConfigSlackConfigDTO[];
	/**
	 * @type array
	 */
	sns_configs?: ConfigSNSConfigDTO[];
	/**
	 * @type array
	 */
	telegram_configs?: ConfigTelegramConfigDTO[];
	/**
	 * @type array
	 */
	victorops_configs?: ConfigVictorOpsConfigDTO[];
	/**
	 * @type array
	 */
	webex_configs?: ConfigWebexConfigDTO[];
	/**
	 * @type array
	 */
	webhook_configs?: ConfigWebhookConfigDTO[];
	/**
	 * @type array
	 */
	wechat_configs?: ConfigWechatConfigDTO[];
}

export interface ConfigRocketchatAttachmentActionDTO {
	/**
	 * @type string
	 */
	image_url?: string;
	/**
	 * @type boolean
	 */
	is_webview?: boolean;
	/**
	 * @type string
	 */
	msg?: string;
	/**
	 * @type boolean
	 */
	msg_in_chat_window?: boolean;
	/**
	 * @type string
	 */
	msg_processing_type?: string;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	url?: string;
	/**
	 * @type string
	 */
	webview_height_ratio?: string;
}

export interface ConfigRocketchatAttachmentFieldDTO {
	/**
	 * @type boolean
	 * @nullable true
	 */
	short?: boolean | null;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	value?: string;
}

export interface ConfigRocketchatConfigDTO {
	/**
	 * @type array
	 */
	actions?: ConfigRocketchatAttachmentActionDTO[];
	api_url?: ConfigURLType2DTO;
	/**
	 * @type string
	 */
	channel?: string;
	/**
	 * @type string
	 */
	color?: string;
	/**
	 * @type string
	 */
	emoji?: string;
	/**
	 * @type array
	 */
	fields?: ConfigRocketchatAttachmentFieldDTO[];
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	icon_url?: string;
	/**
	 * @type string
	 */
	image_url?: string;
	/**
	 * @type boolean
	 */
	link_names?: boolean;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type boolean
	 */
	short_fields?: boolean;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	thumb_url?: string;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	title_link?: string;
	/**
	 * @type string
	 */
	token?: string;
	/**
	 * @type string
	 */
	token_file?: string;
	/**
	 * @type string
	 */
	token_id?: string;
	/**
	 * @type string
	 */
	token_id_file?: string;
}

export type ConfigSNSConfigDTOAttributes = { [key: string]: string };

export interface ConfigSNSConfigDTO {
	/**
	 * @type string
	 */
	api_url?: string;
	/**
	 * @type object
	 */
	attributes?: ConfigSNSConfigDTOAttributes;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	phone_number?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	sigv4?: Sigv4SigV4ConfigDTO;
	/**
	 * @type string
	 */
	subject?: string;
	/**
	 * @type string
	 */
	target_arn?: string;
	/**
	 * @type string
	 */
	topic_arn?: string;
}

export interface ConfigSecretURLDTO {
	[key: string]: unknown;
}

export interface ConfigSlackActionDTO {
	confirm?: ConfigSlackConfirmationFieldDTO;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	style?: string;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	url?: string;
	/**
	 * @type string
	 */
	value?: string;
}

export interface ConfigSlackConfigDTO {
	/**
	 * @type array
	 */
	actions?: ConfigSlackActionDTO[];
	api_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	api_url_file?: string;
	/**
	 * @type string
	 */
	app_token?: string;
	/**
	 * @type string
	 */
	app_token_file?: string;
	app_url?: ConfigURLType2DTO;
	/**
	 * @type string
	 */
	callback_id?: string;
	/**
	 * @type string
	 */
	channel?: string;
	/**
	 * @type string
	 */
	color?: string;
	/**
	 * @type string
	 */
	fallback?: string;
	/**
	 * @type array
	 */
	fields?: ConfigSlackFieldDTO[];
	/**
	 * @type string
	 */
	footer?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	icon_emoji?: string;
	/**
	 * @type string
	 */
	icon_url?: string;
	/**
	 * @type string
	 */
	image_url?: string;
	/**
	 * @type boolean
	 */
	link_names?: boolean;
	/**
	 * @type string
	 */
	message_text?: string;
	/**
	 * @type array
	 */
	mrkdwn_in?: string[];
	/**
	 * @type string
	 */
	pretext?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type boolean
	 */
	short_fields?: boolean;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	thumb_url?: string;
	timeout?: TimeDurationDTO;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	title_link?: string;
	/**
	 * @type string
	 */
	username?: string;
}

export interface ConfigSlackConfirmationFieldDTO {
	/**
	 * @type string
	 */
	dismiss_text?: string;
	/**
	 * @type string
	 */
	ok_text?: string;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	title?: string;
}

export interface ConfigSlackFieldDTO {
	/**
	 * @type boolean
	 * @nullable true
	 */
	short?: boolean | null;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	value?: string;
}

export interface ConfigTLSConfigDTO {
	/**
	 * @type string
	 */
	ca?: string;
	/**
	 * @type string
	 */
	ca_file?: string;
	/**
	 * @type string
	 */
	ca_ref?: string;
	/**
	 * @type string
	 */
	cert?: string;
	/**
	 * @type string
	 */
	cert_file?: string;
	/**
	 * @type string
	 */
	cert_ref?: string;
	/**
	 * @type boolean
	 */
	insecure_skip_verify?: boolean;
	/**
	 * @type string
	 */
	key?: string;
	/**
	 * @type string
	 */
	key_file?: string;
	/**
	 * @type string
	 */
	key_ref?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	max_version?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	min_version?: number;
	/**
	 * @type string
	 */
	server_name?: string;
}

export interface ConfigTelegramConfigDTO {
	api_url?: ConfigURLType2DTO;
	/**
	 * @type integer
	 * @format int64
	 */
	chat?: number;
	/**
	 * @type string
	 */
	chat_file?: string;
	/**
	 * @type boolean
	 */
	disable_notifications?: boolean;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type integer
	 */
	message_thread_id?: number;
	/**
	 * @type string
	 */
	parse_mode?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	token?: string;
	/**
	 * @type string
	 */
	token_file?: string;
}

export interface ConfigThreadingConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type string
	 */
	thread_by_date?: string;
}

export interface ConfigURLDTO {
	[key: string]: unknown;
}

export interface ConfigURLType2DTO {
	[key: string]: unknown;
}

export type ConfigVictorOpsConfigDTOCustomFields = { [key: string]: string };

export interface ConfigVictorOpsConfigDTO {
	/**
	 * @type string
	 */
	api_key?: string;
	/**
	 * @type string
	 */
	api_key_file?: string;
	api_url?: ConfigURLType2DTO;
	/**
	 * @type object
	 */
	custom_fields?: ConfigVictorOpsConfigDTOCustomFields;
	/**
	 * @type string
	 */
	entity_display_name?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message_type?: string;
	/**
	 * @type string
	 */
	monitoring_tool?: string;
	/**
	 * @type string
	 */
	routing_key?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	state_message?: string;
}

export interface ConfigWebexConfigDTO {
	api_url?: ConfigURLType2DTO;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	room_id?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
}

export interface ConfigWebhookConfigDTO {
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type integer
	 * @minimum 0
	 */
	max_alerts?: number;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	timeout?: TimeDurationDTO;
	/**
	 * @type string
	 */
	url?: string;
	/**
	 * @type string
	 */
	url_file?: string;
}

export interface ConfigWechatConfigDTO {
	/**
	 * @type string
	 */
	agent_id?: string;
	/**
	 * @type string
	 */
	api_secret?: string;
	/**
	 * @type string
	 */
	api_secret_file?: string;
	api_url?: ConfigURLType2DTO;
	/**
	 * @type string
	 */
	corp_id?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	message_type?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	to_party?: string;
	/**
	 * @type string
	 */
	to_tag?: string;
	/**
	 * @type string
	 */
	to_user?: string;
}

export interface DashboardtypesDashboardDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	createdBy?: string;
	data?: DashboardtypesStorableDashboardDataDTO;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type boolean
	 */
	locked?: boolean;
	/**
	 * @type string
	 */
	org_id?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface DashboardtypesGettablePublicDasbhboardDTO {
	/**
	 * @type string
	 */
	defaultTimeRange?: string;
	/**
	 * @type string
	 */
	publicPath?: string;
	/**
	 * @type boolean
	 */
	timeRangeEnabled?: boolean;
}

export interface DashboardtypesGettablePublicDashboardDataDTO {
	dashboard?: DashboardtypesDashboardDTO;
	publicDashboard?: DashboardtypesGettablePublicDasbhboardDTO;
}

export interface DashboardtypesPostablePublicDashboardDTO {
	/**
	 * @type string
	 */
	defaultTimeRange?: string;
	/**
	 * @type boolean
	 */
	timeRangeEnabled?: boolean;
}

export interface DashboardtypesStorableDashboardDataDTO {
	[key: string]: unknown;
}

export interface DashboardtypesUpdatablePublicDashboardDTO {
	/**
	 * @type string
	 */
	defaultTimeRange?: string;
	/**
	 * @type boolean
	 */
	timeRangeEnabled?: boolean;
}

export interface ErrorsJSONDTO {
	/**
	 * @type string
	 */
	code: string;
	/**
	 * @type array
	 */
	errors?: ErrorsResponseerroradditionalDTO[];
	/**
	 * @type string
	 */
	message: string;
	/**
	 * @type string
	 */
	url?: string;
}

export interface ErrorsResponseerroradditionalDTO {
	/**
	 * @type string
	 */
	message?: string;
}

/**
 * @nullable
 */
export type FactoryResponseDTOServices = { [key: string]: string[] } | null;

export interface FactoryResponseDTO {
	/**
	 * @type boolean
	 */
	healthy?: boolean;
	/**
	 * @type object
	 * @nullable true
	 */
	services?: FactoryResponseDTOServices;
}

/**
 * @nullable
 */
export type FeaturetypesGettableFeatureDTOVariants = {
	[key: string]: unknown;
} | null;

export interface FeaturetypesGettableFeatureDTO {
	/**
	 * @type string
	 */
	defaultVariant?: string;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	kind?: string;
	/**
	 * @type string
	 */
	name?: string;
	resolvedValue?: unknown;
	/**
	 * @type string
	 */
	stage?: string;
	/**
	 * @type object
	 * @nullable true
	 */
	variants?: FeaturetypesGettableFeatureDTOVariants;
}

export interface GatewaytypesGettableCreatedIngestionKeyDTO {
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	value: string;
}

export interface GatewaytypesGettableCreatedIngestionKeyLimitDTO {
	/**
	 * @type string
	 */
	id: string;
}

export interface GatewaytypesGettableIngestionKeysDTO {
	_pagination?: GatewaytypesPaginationDTO;
	/**
	 * @type array
	 * @nullable true
	 */
	keys?: GatewaytypesIngestionKeyDTO[] | null;
}

export interface GatewaytypesIngestionKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	created_at?: Date;
	/**
	 * @type string
	 * @format date-time
	 */
	expires_at?: Date;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type array
	 * @nullable true
	 */
	limits?: GatewaytypesLimitDTO[] | null;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type array
	 * @nullable true
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updated_at?: Date;
	/**
	 * @type string
	 */
	value?: string;
	/**
	 * @type string
	 */
	workspace_id?: string;
}

export interface GatewaytypesLimitDTO {
	config?: GatewaytypesLimitConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	created_at?: Date;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type string
	 */
	key_id?: string;
	metric?: GatewaytypesLimitMetricDTO;
	/**
	 * @type string
	 */
	signal?: string;
	/**
	 * @type array
	 * @nullable true
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updated_at?: Date;
}

export interface GatewaytypesLimitConfigDTO {
	day?: GatewaytypesLimitValueDTO;
	second?: GatewaytypesLimitValueDTO;
}

export interface GatewaytypesLimitMetricDTO {
	day?: GatewaytypesLimitMetricValueDTO;
	second?: GatewaytypesLimitMetricValueDTO;
}

export interface GatewaytypesLimitMetricValueDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	count?: number;
	/**
	 * @type integer
	 * @format int64
	 */
	size?: number;
}

export interface GatewaytypesLimitValueDTO {
	/**
	 * @type integer
	 * @nullable true
	 */
	count?: number | null;
	/**
	 * @type integer
	 * @nullable true
	 */
	size?: number | null;
}

export interface GatewaytypesPaginationDTO {
	/**
	 * @type integer
	 */
	page?: number;
	/**
	 * @type integer
	 */
	pages?: number;
	/**
	 * @type integer
	 */
	per_page?: number;
	/**
	 * @type integer
	 */
	total?: number;
}

export interface GatewaytypesPostableIngestionKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	expires_at?: Date;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type array
	 * @nullable true
	 */
	tags?: string[] | null;
}

export interface GatewaytypesPostableIngestionKeyLimitDTO {
	config?: GatewaytypesLimitConfigDTO;
	/**
	 * @type string
	 */
	signal?: string;
	/**
	 * @type array
	 * @nullable true
	 */
	tags?: string[] | null;
}

export interface GatewaytypesUpdatableIngestionKeyLimitDTO {
	config: GatewaytypesLimitConfigDTO;
	/**
	 * @type array
	 * @nullable true
	 */
	tags?: string[] | null;
}

export interface GlobaltypesAPIKeyConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
}

export interface GlobaltypesConfigDTO {
	/**
	 * @type string
	 */
	external_url?: string;
	identN?: GlobaltypesIdentNConfigDTO;
	/**
	 * @type string
	 */
	ingestion_url?: string;
}

export interface GlobaltypesIdentNConfigDTO {
	apikey?: GlobaltypesAPIKeyConfigDTO;
	impersonation?: GlobaltypesImpersonationConfigDTO;
	tokenizer?: GlobaltypesTokenizerConfigDTO;
}

export interface GlobaltypesImpersonationConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
}

export interface GlobaltypesTokenizerConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
}

export interface MetricsexplorertypesInspectMetricsRequestDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type string
	 */
	metricName: string;
	/**
	 * @type integer
	 * @format int64
	 */
	start: number;
}

export interface MetricsexplorertypesInspectMetricsResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	series: Querybuildertypesv5TimeSeriesDTO[] | null;
}

export interface MetricsexplorertypesListMetricDTO {
	/**
	 * @type string
	 */
	description: string;
	/**
	 * @type boolean
	 */
	isMonotonic: boolean;
	/**
	 * @type string
	 */
	metricName: string;
	temporality: MetrictypesTemporalityDTO;
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 */
	unit: string;
}

export interface MetricsexplorertypesListMetricsResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	metrics: MetricsexplorertypesListMetricDTO[] | null;
}

export interface MetricsexplorertypesMetricAlertDTO {
	/**
	 * @type string
	 */
	alertId: string;
	/**
	 * @type string
	 */
	alertName: string;
}

export interface MetricsexplorertypesMetricAlertsResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	alerts: MetricsexplorertypesMetricAlertDTO[] | null;
}

export interface MetricsexplorertypesMetricAttributeDTO {
	/**
	 * @type string
	 */
	key: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	valueCount: number;
	/**
	 * @type array
	 * @nullable true
	 */
	values: string[] | null;
}

export interface MetricsexplorertypesMetricAttributesResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	attributes: MetricsexplorertypesMetricAttributeDTO[] | null;
	/**
	 * @type integer
	 * @format int64
	 */
	totalKeys: number;
}

export interface MetricsexplorertypesMetricDashboardDTO {
	/**
	 * @type string
	 */
	dashboardId: string;
	/**
	 * @type string
	 */
	dashboardName: string;
	/**
	 * @type string
	 */
	widgetId: string;
	/**
	 * @type string
	 */
	widgetName: string;
}

export interface MetricsexplorertypesMetricDashboardsResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	dashboards: MetricsexplorertypesMetricDashboardDTO[] | null;
}

export interface MetricsexplorertypesMetricHighlightsResponseDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	activeTimeSeries: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	dataPoints: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	lastReceived: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalTimeSeries: number;
}

export interface MetricsexplorertypesMetricMetadataDTO {
	/**
	 * @type string
	 */
	description: string;
	/**
	 * @type boolean
	 */
	isMonotonic: boolean;
	temporality: MetrictypesTemporalityDTO;
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 */
	unit: string;
}

export interface MetricsexplorertypesMetricsOnboardingResponseDTO {
	/**
	 * @type boolean
	 */
	hasMetrics: boolean;
}

export interface MetricsexplorertypesStatDTO {
	/**
	 * @type string
	 */
	description: string;
	/**
	 * @type string
	 */
	metricName: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	samples: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	timeseries: number;
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 */
	unit: string;
}

export interface MetricsexplorertypesStatsRequestDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type integer
	 */
	limit: number;
	/**
	 * @type integer
	 */
	offset?: number;
	orderBy?: Querybuildertypesv5OrderByDTO;
	/**
	 * @type integer
	 * @format int64
	 */
	start: number;
}

export interface MetricsexplorertypesStatsResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	metrics: MetricsexplorertypesStatDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 */
	total: number;
}

export interface MetricsexplorertypesTreemapEntryDTO {
	/**
	 * @type string
	 */
	metricName: string;
	/**
	 * @type number
	 * @format double
	 */
	percentage: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalValue: number;
}

export enum MetricsexplorertypesTreemapModeDTO {
	timeseries = 'timeseries',
	samples = 'samples',
}
export interface MetricsexplorertypesTreemapRequestDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type integer
	 */
	limit: number;
	mode: MetricsexplorertypesTreemapModeDTO;
	/**
	 * @type integer
	 * @format int64
	 */
	start: number;
}

export interface MetricsexplorertypesTreemapResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	samples: MetricsexplorertypesTreemapEntryDTO[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	timeseries: MetricsexplorertypesTreemapEntryDTO[] | null;
}

export interface MetricsexplorertypesUpdateMetricMetadataRequestDTO {
	/**
	 * @type string
	 */
	description: string;
	/**
	 * @type boolean
	 */
	isMonotonic: boolean;
	/**
	 * @type string
	 */
	metricName: string;
	temporality: MetrictypesTemporalityDTO;
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 */
	unit: string;
}

export interface MetrictypesComparisonSpaceAggregationParamDTO {
	/**
	 * @type string
	 */
	operator: string;
	/**
	 * @type number
	 * @format double
	 */
	threshold: number;
}

export enum MetrictypesSpaceAggregationDTO {
	sum = 'sum',
	avg = 'avg',
	min = 'min',
	max = 'max',
	count = 'count',
	p50 = 'p50',
	p75 = 'p75',
	p90 = 'p90',
	p95 = 'p95',
	p99 = 'p99',
}
export enum MetrictypesTemporalityDTO {
	delta = 'delta',
	cumulative = 'cumulative',
	unspecified = 'unspecified',
}
export enum MetrictypesTimeAggregationDTO {
	latest = 'latest',
	sum = 'sum',
	avg = 'avg',
	min = 'min',
	max = 'max',
	count = 'count',
	count_distinct = 'count_distinct',
	rate = 'rate',
	increase = 'increase',
}
export enum MetrictypesTypeDTO {
	gauge = 'gauge',
	sum = 'sum',
	histogram = 'histogram',
	summary = 'summary',
	exponentialhistogram = 'exponentialhistogram',
}
export type ModelDurationDTO = number;

export interface ModelLabelSetDTO {
	[key: string]: string;
}

export interface PreferencetypesPreferenceDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	allowedScopes?: string[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	allowedValues?: string[] | null;
	defaultValue?: PreferencetypesValueDTO;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name?: string;
	value?: PreferencetypesValueDTO;
	/**
	 * @type string
	 */
	valueType?: string;
}

export interface PreferencetypesUpdatablePreferenceDTO {
	value?: unknown;
}

export interface PreferencetypesValueDTO {
	[key: string]: unknown;
}

export interface PromotetypesPromotePathDTO {
	/**
	 * @type array
	 */
	indexes?: PromotetypesWrappedIndexDTO[];
	/**
	 * @type string
	 */
	path?: string;
	/**
	 * @type boolean
	 */
	promote?: boolean;
}

export interface PromotetypesWrappedIndexDTO {
	/**
	 * @type string
	 */
	column_type?: string;
	/**
	 * @type integer
	 */
	granularity?: number;
	/**
	 * @type string
	 */
	type?: string;
}

export type Querybuildertypesv5AggregationBucketDTOMeta = {
	/**
	 * @type string
	 */
	unit?: string;
};

export interface Querybuildertypesv5AggregationBucketDTO {
	/**
	 * @type string
	 */
	alias?: string;
	/**
	 * @type array
	 */
	anomalyScores?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @type integer
	 */
	index?: number;
	/**
	 * @type array
	 */
	lowerBoundSeries?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @type object
	 */
	meta?: Querybuildertypesv5AggregationBucketDTOMeta;
	/**
	 * @type array
	 */
	predictedSeries?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @type array
	 * @nullable true
	 */
	series?: Querybuildertypesv5TimeSeriesDTO[] | null;
	/**
	 * @type array
	 */
	upperBoundSeries?: Querybuildertypesv5TimeSeriesDTO[];
}

export interface Querybuildertypesv5BucketDTO {
	/**
	 * @type number
	 * @format double
	 */
	step?: number;
}

export interface Querybuildertypesv5ClickHouseQueryDTO {
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	/**
	 * @type string
	 */
	legend?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	query?: string;
}

export type Querybuildertypesv5ColumnDescriptorDTOMeta = {
	/**
	 * @type string
	 */
	unit?: string;
};

export interface Querybuildertypesv5ColumnDescriptorDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	aggregationIndex?: number;
	columnType?: Querybuildertypesv5ColumnTypeDTO;
	/**
	 * @type string
	 */
	description?: string;
	fieldContext?: TelemetrytypesFieldContextDTO;
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type object
	 */
	meta?: Querybuildertypesv5ColumnDescriptorDTOMeta;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	queryName?: string;
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 */
	unit?: string;
}

export enum Querybuildertypesv5ColumnTypeDTO {
	group = 'group',
	aggregation = 'aggregation',
}
/**
 * Composite query containing one or more query envelopes. Each query envelope specifies its type and corresponding spec.
 */
export interface Querybuildertypesv5CompositeQueryDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	queries?: Querybuildertypesv5QueryEnvelopeDTO[] | null;
}

export type Querybuildertypesv5ExecStatsDTOStepIntervals = {
	[key: string]: number;
};

/**
 * Execution statistics for the query, including rows scanned, bytes scanned, and duration.
 */
export interface Querybuildertypesv5ExecStatsDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	bytesScanned?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	durationMs?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	rowsScanned?: number;
	/**
	 * @type object
	 */
	stepIntervals?: Querybuildertypesv5ExecStatsDTOStepIntervals;
}

export interface Querybuildertypesv5FilterDTO {
	/**
	 * @type string
	 */
	expression?: string;
}

export interface Querybuildertypesv5FormatOptionsDTO {
	/**
	 * @type boolean
	 */
	fillGaps?: boolean;
	/**
	 * @type boolean
	 */
	formatTableResultForUI?: boolean;
}

export interface Querybuildertypesv5FunctionDTO {
	/**
	 * @type array
	 */
	args?: Querybuildertypesv5FunctionArgDTO[];
	name?: Querybuildertypesv5FunctionNameDTO;
}

export interface Querybuildertypesv5FunctionArgDTO {
	/**
	 * @type string
	 */
	name?: string;
	value?: unknown;
}

export enum Querybuildertypesv5FunctionNameDTO {
	cutoffmin = 'cutoffmin',
	cutoffmax = 'cutoffmax',
	clampmin = 'clampmin',
	clampmax = 'clampmax',
	absolute = 'absolute',
	runningdiff = 'runningdiff',
	log2 = 'log2',
	log10 = 'log10',
	cumulativesum = 'cumulativesum',
	ewma3 = 'ewma3',
	ewma5 = 'ewma5',
	ewma7 = 'ewma7',
	median3 = 'median3',
	median5 = 'median5',
	median7 = 'median7',
	timeshift = 'timeshift',
	anomaly = 'anomaly',
	fillzero = 'fillzero',
}
export interface Querybuildertypesv5GroupByKeyDTO {
	/**
	 * @type string
	 */
	description?: string;
	fieldContext?: TelemetrytypesFieldContextDTO;
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 */
	name: string;
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 */
	unit?: string;
}

export interface Querybuildertypesv5HavingDTO {
	/**
	 * @type string
	 */
	expression?: string;
}

export interface Querybuildertypesv5LabelDTO {
	key?: TelemetrytypesTelemetryFieldKeyDTO;
	value?: unknown;
}

export interface Querybuildertypesv5LimitByDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	keys?: string[] | null;
	/**
	 * @type string
	 */
	value?: string;
}

export interface Querybuildertypesv5LogAggregationDTO {
	/**
	 * @type string
	 */
	alias?: string;
	/**
	 * @type string
	 */
	expression?: string;
}

export interface Querybuildertypesv5MetricAggregationDTO {
	comparisonSpaceAggregationParam?: MetrictypesComparisonSpaceAggregationParamDTO;
	/**
	 * @type string
	 */
	metricName?: string;
	reduceTo?: Querybuildertypesv5ReduceToDTO;
	spaceAggregation?: MetrictypesSpaceAggregationDTO;
	temporality?: MetrictypesTemporalityDTO;
	timeAggregation?: MetrictypesTimeAggregationDTO;
}

export interface Querybuildertypesv5OrderByDTO {
	direction?: Querybuildertypesv5OrderDirectionDTO;
	key?: Querybuildertypesv5OrderByKeyDTO;
}

export interface Querybuildertypesv5OrderByKeyDTO {
	/**
	 * @type string
	 */
	description?: string;
	fieldContext?: TelemetrytypesFieldContextDTO;
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 */
	name: string;
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 */
	unit?: string;
}

export enum Querybuildertypesv5OrderDirectionDTO {
	asc = 'asc',
	desc = 'desc',
}
export interface Querybuildertypesv5PromQueryDTO {
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	/**
	 * @type string
	 */
	legend?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	query?: string;
	/**
	 * @type boolean
	 */
	stats?: boolean;
	step?: Querybuildertypesv5StepDTO;
}

export interface Querybuildertypesv5QueryBuilderFormulaDTO {
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	/**
	 * @type string
	 */
	expression?: string;
	/**
	 * @type array
	 */
	functions?: Querybuildertypesv5FunctionDTO[];
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 */
	legend?: string;
	/**
	 * @type integer
	 */
	limit?: number;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type array
	 */
	order?: Querybuildertypesv5OrderByDTO[];
}

export interface Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO {
	/**
	 * @type array
	 */
	aggregations?: Querybuildertypesv5LogAggregationDTO[];
	/**
	 * @type string
	 */
	cursor?: string;
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array
	 */
	functions?: Querybuildertypesv5FunctionDTO[];
	/**
	 * @type array
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[];
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 */
	legend?: string;
	/**
	 * @type integer
	 */
	limit?: number;
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type integer
	 */
	offset?: number;
	/**
	 * @type array
	 */
	order?: Querybuildertypesv5OrderByDTO[];
	/**
	 * @type array
	 */
	secondaryAggregations?: Querybuildertypesv5SecondaryAggregationDTO[];
	/**
	 * @type array
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[];
	signal?: TelemetrytypesSignalDTO;
	source?: TelemetrytypesSourceDTO;
	stepInterval?: Querybuildertypesv5StepDTO;
}

export interface Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO {
	/**
	 * @type array
	 */
	aggregations?: Querybuildertypesv5MetricAggregationDTO[];
	/**
	 * @type string
	 */
	cursor?: string;
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array
	 */
	functions?: Querybuildertypesv5FunctionDTO[];
	/**
	 * @type array
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[];
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 */
	legend?: string;
	/**
	 * @type integer
	 */
	limit?: number;
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type integer
	 */
	offset?: number;
	/**
	 * @type array
	 */
	order?: Querybuildertypesv5OrderByDTO[];
	/**
	 * @type array
	 */
	secondaryAggregations?: Querybuildertypesv5SecondaryAggregationDTO[];
	/**
	 * @type array
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[];
	signal?: TelemetrytypesSignalDTO;
	source?: TelemetrytypesSourceDTO;
	stepInterval?: Querybuildertypesv5StepDTO;
}

export interface Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO {
	/**
	 * @type array
	 */
	aggregations?: Querybuildertypesv5TraceAggregationDTO[];
	/**
	 * @type string
	 */
	cursor?: string;
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array
	 */
	functions?: Querybuildertypesv5FunctionDTO[];
	/**
	 * @type array
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[];
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 */
	legend?: string;
	/**
	 * @type integer
	 */
	limit?: number;
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type integer
	 */
	offset?: number;
	/**
	 * @type array
	 */
	order?: Querybuildertypesv5OrderByDTO[];
	/**
	 * @type array
	 */
	secondaryAggregations?: Querybuildertypesv5SecondaryAggregationDTO[];
	/**
	 * @type array
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[];
	signal?: TelemetrytypesSignalDTO;
	source?: TelemetrytypesSourceDTO;
	stepInterval?: Querybuildertypesv5StepDTO;
}

export interface Querybuildertypesv5QueryBuilderTraceOperatorDTO {
	/**
	 * @type array
	 */
	aggregations?: Querybuildertypesv5TraceAggregationDTO[];
	/**
	 * @type string
	 */
	cursor?: string;
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	/**
	 * @type string
	 */
	expression?: string;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array
	 */
	functions?: Querybuildertypesv5FunctionDTO[];
	/**
	 * @type array
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[];
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 */
	legend?: string;
	/**
	 * @type integer
	 */
	limit?: number;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type integer
	 */
	offset?: number;
	/**
	 * @type array
	 */
	order?: Querybuildertypesv5OrderByDTO[];
	/**
	 * @type string
	 */
	returnSpansFrom?: string;
	/**
	 * @type array
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[];
	stepInterval?: Querybuildertypesv5StepDTO;
}

export type Querybuildertypesv5QueryDataDTO =
	| (Querybuildertypesv5TimeSeriesDataDTO & {
			/**
			 * @type array
			 * @nullable true
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5ScalarDataDTO & {
			/**
			 * @type array
			 * @nullable true
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5RawDataDTO & {
			/**
			 * @type array
			 * @nullable true
			 */
			results?: unknown[] | null;
	  });

export type Querybuildertypesv5QueryEnvelopeDTO =
	| (Querybuildertypesv5QueryEnvelopeBuilderTraceDTO & {
			spec?: unknown;
			type?: Querybuildertypesv5QueryTypeDTO;
	  })
	| (Querybuildertypesv5QueryEnvelopeBuilderLogDTO & {
			spec?: unknown;
			type?: Querybuildertypesv5QueryTypeDTO;
	  })
	| (Querybuildertypesv5QueryEnvelopeBuilderMetricDTO & {
			spec?: unknown;
			type?: Querybuildertypesv5QueryTypeDTO;
	  })
	| (Querybuildertypesv5QueryEnvelopeFormulaDTO & {
			spec?: unknown;
			type?: Querybuildertypesv5QueryTypeDTO;
	  })
	| (Querybuildertypesv5QueryEnvelopeTraceOperatorDTO & {
			spec?: unknown;
			type?: Querybuildertypesv5QueryTypeDTO;
	  })
	| (Querybuildertypesv5QueryEnvelopePromQLDTO & {
			spec?: unknown;
			type?: Querybuildertypesv5QueryTypeDTO;
	  })
	| (Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO & {
			spec?: unknown;
			type?: Querybuildertypesv5QueryTypeDTO;
	  });

export interface Querybuildertypesv5QueryEnvelopeBuilderLogDTO {
	spec?: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

export interface Querybuildertypesv5QueryEnvelopeBuilderMetricDTO {
	spec?: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

export interface Querybuildertypesv5QueryEnvelopeBuilderTraceDTO {
	spec?: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

export interface Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO {
	spec?: Querybuildertypesv5ClickHouseQueryDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

export interface Querybuildertypesv5QueryEnvelopeFormulaDTO {
	spec?: Querybuildertypesv5QueryBuilderFormulaDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

export interface Querybuildertypesv5QueryEnvelopePromQLDTO {
	spec?: Querybuildertypesv5PromQueryDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

export interface Querybuildertypesv5QueryEnvelopeTraceOperatorDTO {
	spec?: Querybuildertypesv5QueryBuilderTraceOperatorDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

export type Querybuildertypesv5QueryRangeRequestDTOVariables = {
	[key: string]: Querybuildertypesv5VariableItemDTO;
};

/**
 * Request body for the v5 query range endpoint. Supports builder queries (traces, logs, metrics), formulas, joins, trace operators, PromQL, and ClickHouse SQL queries.
 */
export interface Querybuildertypesv5QueryRangeRequestDTO {
	compositeQuery?: Querybuildertypesv5CompositeQueryDTO;
	/**
	 * @type integer
	 * @minimum 0
	 */
	end?: number;
	formatOptions?: Querybuildertypesv5FormatOptionsDTO;
	/**
	 * @type boolean
	 */
	noCache?: boolean;
	requestType?: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @type string
	 */
	schemaVersion?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	start?: number;
	/**
	 * @type object
	 */
	variables?: Querybuildertypesv5QueryRangeRequestDTOVariables;
}

/**
 * Response from the v5 query range endpoint. The data.results array contains typed results depending on the requestType: TimeSeriesData for time_series, ScalarData for scalar, or RawData for raw requests.
 */
export interface Querybuildertypesv5QueryRangeResponseDTO {
	data?: Querybuildertypesv5QueryDataDTO;
	meta?: Querybuildertypesv5ExecStatsDTO;
	type?: Querybuildertypesv5RequestTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export enum Querybuildertypesv5QueryTypeDTO {
	builder_query = 'builder_query',
	builder_formula = 'builder_formula',
	builder_trace_operator = 'builder_trace_operator',
	clickhouse_sql = 'clickhouse_sql',
	promql = 'promql',
}
export interface Querybuildertypesv5QueryWarnDataDTO {
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type string
	 */
	url?: string;
	/**
	 * @type array
	 */
	warnings?: Querybuildertypesv5QueryWarnDataAdditionalDTO[];
}

export interface Querybuildertypesv5QueryWarnDataAdditionalDTO {
	/**
	 * @type string
	 */
	message?: string;
}

export interface Querybuildertypesv5RawDataDTO {
	/**
	 * @type string
	 */
	nextCursor?: string;
	/**
	 * @type string
	 */
	queryName?: string;
	/**
	 * @type array
	 * @nullable true
	 */
	rows?: Querybuildertypesv5RawRowDTO[] | null;
}

/**
 * @nullable
 */
export type Querybuildertypesv5RawRowDTOData = {
	[key: string]: unknown;
} | null;

export interface Querybuildertypesv5RawRowDTO {
	/**
	 * @type object
	 * @nullable true
	 */
	data?: Querybuildertypesv5RawRowDTOData;
	/**
	 * @type string
	 * @format date-time
	 */
	timestamp?: Date;
}

export enum Querybuildertypesv5ReduceToDTO {
	sum = 'sum',
	count = 'count',
	avg = 'avg',
	min = 'min',
	max = 'max',
	last = 'last',
	median = 'median',
}
export enum Querybuildertypesv5RequestTypeDTO {
	scalar = 'scalar',
	time_series = 'time_series',
	raw = 'raw',
	raw_stream = 'raw_stream',
	trace = 'trace',
}
export interface Querybuildertypesv5ScalarDataDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	columns?: Querybuildertypesv5ColumnDescriptorDTO[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	data?: unknown[][] | null;
	/**
	 * @type string
	 */
	queryName?: string;
}

export interface Querybuildertypesv5SecondaryAggregationDTO {
	/**
	 * @type string
	 */
	alias?: string;
	/**
	 * @type string
	 */
	expression?: string;
	/**
	 * @type array
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[];
	/**
	 * @type integer
	 */
	limit?: number;
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type array
	 */
	order?: Querybuildertypesv5OrderByDTO[];
	stepInterval?: Querybuildertypesv5StepDTO;
}

/**
 * Step interval. Accepts a Go duration string (e.g., "60s", "1m", "1h") or a number representing seconds (e.g., 60).
 */
export type Querybuildertypesv5StepDTO = string | number;

export interface Querybuildertypesv5TimeSeriesDTO {
	/**
	 * @type array
	 */
	labels?: Querybuildertypesv5LabelDTO[];
	/**
	 * @type array
	 * @nullable true
	 */
	values?: Querybuildertypesv5TimeSeriesValueDTO[] | null;
}

export interface Querybuildertypesv5TimeSeriesDataDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	aggregations?: Querybuildertypesv5AggregationBucketDTO[] | null;
	/**
	 * @type string
	 */
	queryName?: string;
}

export interface Querybuildertypesv5TimeSeriesValueDTO {
	bucket?: Querybuildertypesv5BucketDTO;
	/**
	 * @type boolean
	 */
	partial?: boolean;
	/**
	 * @type integer
	 * @format int64
	 */
	timestamp?: number;
	/**
	 * @type number
	 * @format double
	 */
	value?: number;
	/**
	 * @type array
	 */
	values?: number[];
}

export interface Querybuildertypesv5TraceAggregationDTO {
	/**
	 * @type string
	 */
	alias?: string;
	/**
	 * @type string
	 */
	expression?: string;
}

export interface Querybuildertypesv5VariableItemDTO {
	type?: Querybuildertypesv5VariableTypeDTO;
	value?: unknown;
}

export enum Querybuildertypesv5VariableTypeDTO {
	query = 'query',
	dynamic = 'dynamic',
	custom = 'custom',
	text = 'text',
}
export interface RenderErrorResponseDTO {
	error: ErrorsJSONDTO;
	/**
	 * @type string
	 */
	status: string;
}

export interface RulestatehistorytypesGettableRuleStateHistoryDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	fingerprint: number;
	/**
	 * @type array
	 * @nullable true
	 */
	labels: Querybuildertypesv5LabelDTO[] | null;
	overallState: RuletypesAlertStateDTO;
	/**
	 * @type boolean
	 */
	overallStateChanged: boolean;
	/**
	 * @type string
	 */
	ruleId: string;
	/**
	 * @type string
	 */
	ruleName: string;
	state: RuletypesAlertStateDTO;
	/**
	 * @type boolean
	 */
	stateChanged: boolean;
	/**
	 * @type integer
	 * @format int64
	 */
	unixMilli: number;
	/**
	 * @type number
	 * @format double
	 */
	value: number;
}

export interface RulestatehistorytypesGettableRuleStateHistoryContributorDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	count: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	fingerprint: number;
	/**
	 * @type array
	 * @nullable true
	 */
	labels: Querybuildertypesv5LabelDTO[] | null;
	/**
	 * @type string
	 */
	relatedLogsLink?: string;
	/**
	 * @type string
	 */
	relatedTracesLink?: string;
}

export interface RulestatehistorytypesGettableRuleStateHistoryStatsDTO {
	/**
	 * @type number
	 * @format double
	 */
	currentAvgResolutionTime: number;
	currentAvgResolutionTimeSeries: Querybuildertypesv5TimeSeriesDTO;
	currentTriggersSeries: Querybuildertypesv5TimeSeriesDTO;
	/**
	 * @type number
	 * @format double
	 */
	pastAvgResolutionTime: number;
	pastAvgResolutionTimeSeries: Querybuildertypesv5TimeSeriesDTO;
	pastTriggersSeries: Querybuildertypesv5TimeSeriesDTO;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalCurrentTriggers: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalPastTriggers: number;
}

export interface RulestatehistorytypesGettableRuleStateTimelineDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	items: RulestatehistorytypesGettableRuleStateHistoryDTO[] | null;
	/**
	 * @type string
	 */
	nextCursor?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	total: number;
}

export interface RulestatehistorytypesGettableRuleStateWindowDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	/**
	 * @type integer
	 * @format int64
	 */
	start: number;
	state: RuletypesAlertStateDTO;
}

export interface RuletypesAlertCompositeQueryDTO {
	panelType: RuletypesPanelTypeDTO;
	/**
	 * @type array
	 * @nullable true
	 */
	queries: Querybuildertypesv5QueryEnvelopeDTO[] | null;
	queryType: RuletypesQueryTypeDTO;
	/**
	 * @type string
	 */
	unit?: string;
}

export enum RuletypesAlertStateDTO {
	inactive = 'inactive',
	pending = 'pending',
	recovering = 'recovering',
	firing = 'firing',
	nodata = 'nodata',
	disabled = 'disabled',
}
export enum RuletypesAlertTypeDTO {
	METRIC_BASED_ALERT = 'METRIC_BASED_ALERT',
	TRACES_BASED_ALERT = 'TRACES_BASED_ALERT',
	LOGS_BASED_ALERT = 'LOGS_BASED_ALERT',
	EXCEPTIONS_BASED_ALERT = 'EXCEPTIONS_BASED_ALERT',
}
export interface RuletypesBasicRuleThresholdDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	channels?: string[] | null;
	matchType: RuletypesMatchTypeDTO;
	/**
	 * @type string
	 */
	name: string;
	op: RuletypesCompareOperatorDTO;
	/**
	 * @type number
	 * @nullable true
	 */
	recoveryTarget?: number | null;
	/**
	 * @type number
	 * @nullable true
	 */
	target: number | null;
	/**
	 * @type string
	 */
	targetUnit?: string;
}

/**
 * @nullable
 */
export type RuletypesBasicRuleThresholdsDTO =
	| RuletypesBasicRuleThresholdDTO[]
	| null;

export enum RuletypesCompareOperatorDTO {
	above = 'above',
	below = 'below',
	equal = 'equal',
	not_equal = 'not_equal',
	outside_bounds = 'outside_bounds',
}
export interface RuletypesCumulativeScheduleDTO {
	/**
	 * @type integer
	 * @nullable true
	 */
	day?: number | null;
	/**
	 * @type integer
	 * @nullable true
	 */
	hour?: number | null;
	/**
	 * @type integer
	 * @nullable true
	 */
	minute?: number | null;
	type: RuletypesScheduleTypeDTO;
	/**
	 * @type integer
	 * @nullable true
	 */
	weekday?: number | null;
}

export interface RuletypesCumulativeWindowDTO {
	/**
	 * @type string
	 */
	frequency: string;
	schedule: RuletypesCumulativeScheduleDTO;
	/**
	 * @type string
	 */
	timezone: string;
}

export interface RuletypesEvaluationCumulativeDTO {
	kind?: RuletypesEvaluationKindDTO;
	spec?: RuletypesCumulativeWindowDTO;
}

export type RuletypesEvaluationEnvelopeDTO =
	| (RuletypesEvaluationRollingDTO & {
			kind: RuletypesEvaluationKindDTO;
			spec: unknown;
	  })
	| (RuletypesEvaluationCumulativeDTO & {
			kind: RuletypesEvaluationKindDTO;
			spec: unknown;
	  });

export enum RuletypesEvaluationKindDTO {
	rolling = 'rolling',
	cumulative = 'cumulative',
}
export interface RuletypesEvaluationRollingDTO {
	kind?: RuletypesEvaluationKindDTO;
	spec?: RuletypesRollingWindowDTO;
}

export interface RuletypesGettableTestRuleDTO {
	/**
	 * @type integer
	 */
	alertCount?: number;
	/**
	 * @type string
	 */
	message?: string;
}

export enum RuletypesMaintenanceKindDTO {
	fixed = 'fixed',
	recurring = 'recurring',
}
export enum RuletypesMaintenanceStatusDTO {
	active = 'active',
	upcoming = 'upcoming',
	expired = 'expired',
}
export enum RuletypesMatchTypeDTO {
	at_least_once = 'at_least_once',
	all_the_times = 'all_the_times',
	on_average = 'on_average',
	in_total = 'in_total',
	last = 'last',
}
export interface RuletypesNotificationSettingsDTO {
	/**
	 * @type array
	 */
	groupBy?: string[];
	/**
	 * @type string
	 */
	newGroupEvalDelay?: string;
	renotify?: RuletypesRenotifyDTO;
	/**
	 * @type boolean
	 */
	usePolicy?: boolean;
}

export enum RuletypesPanelTypeDTO {
	value = 'value',
	table = 'table',
	graph = 'graph',
}
export interface RuletypesPlannedMaintenanceDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	alertIds?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	id: string;
	kind: RuletypesMaintenanceKindDTO;
	/**
	 * @type string
	 */
	name: string;
	schedule: RuletypesScheduleDTO;
	status: RuletypesMaintenanceStatusDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface RuletypesPostablePlannedMaintenanceDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	alertIds?: string[] | null;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name: string;
	schedule: RuletypesScheduleDTO;
}

export type RuletypesPostableRuleDTOAnnotations = { [key: string]: string };

export type RuletypesPostableRuleDTOLabels = { [key: string]: string };

export interface RuletypesPostableRuleDTO {
	/**
	 * @type string
	 */
	alert: string;
	alertType?: RuletypesAlertTypeDTO;
	/**
	 * @type object
	 */
	annotations?: RuletypesPostableRuleDTOAnnotations;
	condition: RuletypesRuleConditionDTO;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	/**
	 * @type string
	 */
	evalWindow?: string;
	evaluation?: RuletypesEvaluationEnvelopeDTO;
	/**
	 * @type string
	 */
	frequency?: string;
	/**
	 * @type object
	 */
	labels?: RuletypesPostableRuleDTOLabels;
	notificationSettings?: RuletypesNotificationSettingsDTO;
	/**
	 * @type array
	 */
	preferredChannels?: string[];
	ruleType: RuletypesRuleTypeDTO;
	/**
	 * @type string
	 */
	schemaVersion?: string;
	/**
	 * @type string
	 */
	source?: string;
	/**
	 * @type string
	 */
	version?: string;
}

export enum RuletypesQueryTypeDTO {
	builder = 'builder',
	clickhouse_sql = 'clickhouse_sql',
	promql = 'promql',
}
export interface RuletypesRecurrenceDTO {
	/**
	 * @type string
	 */
	duration: string;
	/**
	 * @type string
	 * @format date-time
	 * @nullable true
	 */
	endTime?: Date | null;
	/**
	 * @type array
	 * @nullable true
	 */
	repeatOn?: RuletypesRepeatOnDTO[] | null;
	repeatType: RuletypesRepeatTypeDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	startTime: Date;
}

export interface RuletypesRenotifyDTO {
	/**
	 * @type array
	 */
	alertStates?: RuletypesAlertStateDTO[];
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type string
	 */
	interval?: string;
}

export enum RuletypesRepeatOnDTO {
	sunday = 'sunday',
	monday = 'monday',
	tuesday = 'tuesday',
	wednesday = 'wednesday',
	thursday = 'thursday',
	friday = 'friday',
	saturday = 'saturday',
}
export enum RuletypesRepeatTypeDTO {
	daily = 'daily',
	weekly = 'weekly',
	monthly = 'monthly',
}
export interface RuletypesRollingWindowDTO {
	/**
	 * @type string
	 */
	evalWindow: string;
	/**
	 * @type string
	 */
	frequency: string;
}

export type RuletypesRuleDTOAnnotations = { [key: string]: string };

export type RuletypesRuleDTOLabels = { [key: string]: string };

export interface RuletypesRuleDTO {
	/**
	 * @type string
	 */
	alert: string;
	alertType?: RuletypesAlertTypeDTO;
	/**
	 * @type object
	 */
	annotations?: RuletypesRuleDTOAnnotations;
	condition: RuletypesRuleConditionDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type boolean
	 */
	disabled?: boolean;
	/**
	 * @type string
	 */
	evalWindow?: string;
	evaluation?: RuletypesEvaluationEnvelopeDTO;
	/**
	 * @type string
	 */
	frequency?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type object
	 */
	labels?: RuletypesRuleDTOLabels;
	notificationSettings?: RuletypesNotificationSettingsDTO;
	/**
	 * @type array
	 */
	preferredChannels?: string[];
	ruleType: RuletypesRuleTypeDTO;
	/**
	 * @type string
	 */
	schemaVersion?: string;
	/**
	 * @type string
	 */
	source?: string;
	state: RuletypesAlertStateDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
	/**
	 * @type string
	 */
	updatedBy?: string;
	/**
	 * @type string
	 */
	version?: string;
}

export interface RuletypesRuleConditionDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	absentFor?: number;
	/**
	 * @type boolean
	 */
	alertOnAbsent?: boolean;
	/**
	 * @type string
	 */
	algorithm?: string;
	compositeQuery: RuletypesAlertCompositeQueryDTO;
	matchType: RuletypesMatchTypeDTO;
	op: RuletypesCompareOperatorDTO;
	/**
	 * @type boolean
	 */
	requireMinPoints?: boolean;
	/**
	 * @type integer
	 */
	requiredNumPoints?: number;
	seasonality?: RuletypesSeasonalityDTO;
	/**
	 * @type string
	 */
	selectedQueryName?: string;
	/**
	 * @type number
	 * @nullable true
	 */
	target?: number | null;
	/**
	 * @type string
	 */
	targetUnit?: string;
	thresholds?: RuletypesRuleThresholdDataDTO;
}

export type RuletypesRuleThresholdDataDTO = RuletypesThresholdBasicDTO & {
	kind: RuletypesThresholdKindDTO;
	spec: unknown;
};

export enum RuletypesRuleTypeDTO {
	threshold_rule = 'threshold_rule',
	promql_rule = 'promql_rule',
	anomaly_rule = 'anomaly_rule',
}
export interface RuletypesScheduleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	endTime?: Date;
	recurrence?: RuletypesRecurrenceDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	startTime?: Date;
	/**
	 * @type string
	 */
	timezone: string;
}

export enum RuletypesScheduleTypeDTO {
	hourly = 'hourly',
	daily = 'daily',
	weekly = 'weekly',
	monthly = 'monthly',
}
export enum RuletypesSeasonalityDTO {
	hourly = 'hourly',
	daily = 'daily',
	weekly = 'weekly',
}
export interface RuletypesThresholdBasicDTO {
	kind?: RuletypesThresholdKindDTO;
	spec?: RuletypesBasicRuleThresholdsDTO;
}

export enum RuletypesThresholdKindDTO {
	basic = 'basic',
}
export interface ServiceaccounttypesGettableFactorAPIKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type integer
	 * @minimum 0
	 */
	expiresAt: number;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 * @format date-time
	 */
	lastObservedAt: Date;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	serviceAccountId: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO {
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	key: string;
}

export interface ServiceaccounttypesPostableFactorAPIKeyDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	expiresAt: number;
	/**
	 * @type string
	 */
	name: string;
}

export interface ServiceaccounttypesPostableServiceAccountDTO {
	/**
	 * @type string
	 */
	name: string;
}

export interface ServiceaccounttypesPostableServiceAccountRoleDTO {
	/**
	 * @type string
	 */
	id: string;
}

export interface ServiceaccounttypesServiceAccountDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	email: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type string
	 */
	status: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface ServiceaccounttypesServiceAccountRoleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	id: string;
	role: AuthtypesRoleDTO;
	/**
	 * @type string
	 */
	roleId: string;
	/**
	 * @type string
	 */
	serviceAccountId: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface ServiceaccounttypesServiceAccountWithRolesDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	email: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type array
	 * @nullable true
	 */
	serviceAccountRoles: ServiceaccounttypesServiceAccountRoleDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface ServiceaccounttypesUpdatableFactorAPIKeyDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	expiresAt: number;
	/**
	 * @type string
	 */
	name: string;
}

export interface Sigv4SigV4ConfigDTO {
	[key: string]: unknown;
}

export enum TelemetrytypesFieldContextDTO {
	metric = 'metric',
	log = 'log',
	span = 'span',
	resource = 'resource',
	attribute = 'attribute',
	body = 'body',
}
export enum TelemetrytypesFieldDataTypeDTO {
	string = 'string',
	bool = 'bool',
	float64 = 'float64',
	int64 = 'int64',
	number = 'number',
}
/**
 * @nullable
 */
export type TelemetrytypesGettableFieldKeysDTOKeys = {
	[key: string]: TelemetrytypesTelemetryFieldKeyDTO[];
} | null;

export interface TelemetrytypesGettableFieldKeysDTO {
	/**
	 * @type boolean
	 */
	complete: boolean;
	/**
	 * @type object
	 * @nullable true
	 */
	keys: TelemetrytypesGettableFieldKeysDTOKeys;
}

export interface TelemetrytypesGettableFieldValuesDTO {
	/**
	 * @type boolean
	 */
	complete: boolean;
	values: TelemetrytypesTelemetryFieldValuesDTO;
}

export enum TelemetrytypesSignalDTO {
	traces = 'traces',
	logs = 'logs',
	metrics = 'metrics',
}
export enum TelemetrytypesSourceDTO {
	meter = 'meter',
}
export interface TelemetrytypesTelemetryFieldKeyDTO {
	/**
	 * @type string
	 */
	description?: string;
	fieldContext?: TelemetrytypesFieldContextDTO;
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 */
	name: string;
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 */
	unit?: string;
}

export interface TelemetrytypesTelemetryFieldValuesDTO {
	/**
	 * @type array
	 */
	boolValues?: boolean[];
	/**
	 * @type array
	 */
	numberValues?: number[];
	/**
	 * @type array
	 */
	relatedValues?: string[];
	/**
	 * @type array
	 */
	stringValues?: string[];
}

export type TimeDurationDTO = number;

export interface TypesAlertStatusDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	inhibitedBy?: string[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	silencedBy?: string[] | null;
	/**
	 * @type string
	 */
	state?: string;
}

export interface TypesChangePasswordRequestDTO {
	/**
	 * @type string
	 */
	newPassword?: string;
	/**
	 * @type string
	 */
	oldPassword?: string;
}

export interface TypesDeprecatedUserDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	displayName?: string;
	/**
	 * @type string
	 */
	email?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type boolean
	 */
	isRoot?: boolean;
	/**
	 * @type string
	 */
	orgId?: string;
	/**
	 * @type string
	 */
	role?: string;
	/**
	 * @type string
	 */
	status?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface TypesIdentifiableDTO {
	/**
	 * @type string
	 */
	id: string;
}

export interface TypesInviteDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	email?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	inviteLink?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	orgId?: string;
	/**
	 * @type string
	 */
	role?: string;
	/**
	 * @type string
	 */
	token?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface TypesOrganizationDTO {
	/**
	 * @type string
	 */
	alias?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	displayName?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	key?: number;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface TypesPostableBulkInviteRequestDTO {
	/**
	 * @type array
	 */
	invites: TypesPostableInviteDTO[];
}

export interface TypesPostableForgotPasswordDTO {
	/**
	 * @type string
	 */
	email: string;
	/**
	 * @type string
	 */
	frontendBaseURL?: string;
	/**
	 * @type string
	 */
	orgId: string;
}

export interface TypesPostableInviteDTO {
	/**
	 * @type string
	 */
	email?: string;
	/**
	 * @type string
	 */
	frontendBaseUrl?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	role?: string;
}

export interface TypesPostableResetPasswordDTO {
	/**
	 * @type string
	 */
	password?: string;
	/**
	 * @type string
	 */
	token?: string;
}

export interface TypesPostableRoleDTO {
	/**
	 * @type string
	 */
	name: string;
}

export interface TypesResetPasswordTokenDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	expiresAt?: Date;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	passwordId?: string;
	/**
	 * @type string
	 */
	token?: string;
}

export interface TypesUpdatableUserDTO {
	/**
	 * @type string
	 */
	displayName: string;
}

export interface TypesUserDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	displayName?: string;
	/**
	 * @type string
	 */
	email?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type boolean
	 */
	isRoot?: boolean;
	/**
	 * @type string
	 */
	orgId?: string;
	/**
	 * @type string
	 */
	status?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface ZeustypesGettableHostDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	hosts: ZeustypesHostDTO[] | null;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	state: string;
	/**
	 * @type string
	 */
	tier: string;
}

export interface ZeustypesHostDTO {
	/**
	 * @type boolean
	 */
	is_default: boolean;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	url: string;
}

export interface ZeustypesPostableHostDTO {
	/**
	 * @type string
	 */
	name: string;
}

export interface ZeustypesPostableProfileDTO {
	/**
	 * @type string
	 */
	existing_observability_tool: string;
	/**
	 * @type boolean
	 */
	has_existing_observability_tool: boolean;
	/**
	 * @type integer
	 * @format int64
	 */
	logs_scale_per_day_in_gb: number;
	/**
	 * @type integer
	 * @format int64
	 */
	number_of_hosts: number;
	/**
	 * @type integer
	 * @format int64
	 */
	number_of_services: number;
	/**
	 * @type array
	 * @nullable true
	 */
	reasons_for_interest_in_signoz: string[] | null;
	/**
	 * @type string
	 */
	timeline_for_migrating_to_signoz: string;
	/**
	 * @type boolean
	 */
	uses_otel: boolean;
	/**
	 * @type string
	 */
	where_did_you_discover_signoz: string;
}

export type GetAlerts200 = {
	/**
	 * @type array
	 */
	data: AlertmanagertypesDeprecatedGettableAlertDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type AuthzCheck200 = {
	/**
	 * @type array
	 */
	data: AuthtypesGettableTransactionDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type AuthzResources200 = {
	data: AuthtypesGettableResourcesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListChannels200 = {
	/**
	 * @type array
	 */
	data: AlertmanagertypesChannelDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateChannel201 = {
	data: AlertmanagertypesChannelDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteChannelByIDPathParameters = {
	id: string;
};
export type GetChannelByIDPathParameters = {
	id: string;
};
export type GetChannelByID200 = {
	data: AlertmanagertypesChannelDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateChannelByIDPathParameters = {
	id: string;
};
export type AgentCheckInDeprecatedPathParameters = {
	cloudProvider: string;
};
export type AgentCheckInDeprecated200 = {
	data: CloudintegrationtypesGettableAgentCheckInDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListAccountsPathParameters = {
	cloudProvider: string;
};
export type ListAccounts200 = {
	data: CloudintegrationtypesGettableAccountsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateAccountPathParameters = {
	cloudProvider: string;
};
export type CreateAccount201 = {
	data: CloudintegrationtypesGettableAccountWithConnectionArtifactDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DisconnectAccountPathParameters = {
	cloudProvider: string;
	id: string;
};
export type GetAccountPathParameters = {
	cloudProvider: string;
	id: string;
};
export type GetAccount200 = {
	data: CloudintegrationtypesAccountDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateAccountPathParameters = {
	cloudProvider: string;
	id: string;
};
export type UpdateServicePathParameters = {
	cloudProvider: string;
	id: string;
	serviceId: string;
};
export type AgentCheckInPathParameters = {
	cloudProvider: string;
};
export type AgentCheckIn200 = {
	data: CloudintegrationtypesGettableAgentCheckInDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetConnectionCredentialsPathParameters = {
	cloudProvider: string;
};
export type GetConnectionCredentials200 = {
	data: CloudintegrationtypesCredentialsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListServicesMetadataPathParameters = {
	cloudProvider: string;
};
export type ListServicesMetadataParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	cloud_integration_id?: string;
};

export type ListServicesMetadata200 = {
	data: CloudintegrationtypesGettableServicesMetadataDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetServicePathParameters = {
	cloudProvider: string;
	serviceId: string;
};
export type GetServiceParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	cloud_integration_id?: string;
};

export type GetService200 = {
	data: CloudintegrationtypesServiceDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateSessionByGoogleCallback303 = {
	data: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateSessionByOIDCCallback303 = {
	data: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateSessionBySAMLCallbackParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	RelayState?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	SAMLResponse?: string;
};

export type CreateSessionBySAMLCallbackBody = {
	/**
	 * @type string
	 */
	RelayState?: string;
	/**
	 * @type string
	 */
	SAMLResponse?: string;
};

export type CreateSessionBySAMLCallback303 = {
	data: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeletePublicDashboardPathParameters = {
	id: string;
};
export type GetPublicDashboardPathParameters = {
	id: string;
};
export type GetPublicDashboard200 = {
	data: DashboardtypesGettablePublicDasbhboardDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreatePublicDashboardPathParameters = {
	id: string;
};
export type CreatePublicDashboard201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdatePublicDashboardPathParameters = {
	id: string;
};
export type ListAuthDomains200 = {
	/**
	 * @type array
	 */
	data: AuthtypesGettableAuthDomainDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateAuthDomain200 = {
	data: AuthtypesGettableAuthDomainDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteAuthDomainPathParameters = {
	id: string;
};
export type UpdateAuthDomainPathParameters = {
	id: string;
};
export type ListDowntimeSchedulesParams = {
	/**
	 * @type boolean
	 * @nullable true
	 * @description undefined
	 */
	active?: boolean | null;
	/**
	 * @type boolean
	 * @nullable true
	 * @description undefined
	 */
	recurring?: boolean | null;
};

export type ListDowntimeSchedules200 = {
	/**
	 * @type array
	 */
	data: RuletypesPlannedMaintenanceDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateDowntimeSchedule201 = {
	data: RuletypesPlannedMaintenanceDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteDowntimeScheduleByIDPathParameters = {
	id: string;
};
export type GetDowntimeScheduleByIDPathParameters = {
	id: string;
};
export type GetDowntimeScheduleByID200 = {
	data: RuletypesPlannedMaintenanceDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateDowntimeScheduleByIDPathParameters = {
	id: string;
};
export type HandleExportRawDataPOSTParams = {
	/**
	 * @enum csv,jsonl
	 * @type string
	 * @description The output format for the export.
	 */
	format?: HandleExportRawDataPOSTFormat;
};

export enum HandleExportRawDataPOSTFormat {
	csv = 'csv',
	jsonl = 'jsonl',
}
export type GetFieldsKeysParams = {
	/**
	 * @description undefined
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description undefined
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	endUnixMilli?: number;
	/**
	 * @description undefined
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description undefined
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	searchText?: string;
};

export type GetFieldsKeys200 = {
	data: TelemetrytypesGettableFieldKeysDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetFieldsValuesParams = {
	/**
	 * @description undefined
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description undefined
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	endUnixMilli?: number;
	/**
	 * @description undefined
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description undefined
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	searchText?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	name?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	existingQuery?: string;
};

export type GetFieldsValues200 = {
	data: TelemetrytypesGettableFieldValuesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetResetPasswordTokenDeprecatedPathParameters = {
	id: string;
};
export type GetResetPasswordTokenDeprecated200 = {
	data: TypesResetPasswordTokenDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetGlobalConfig200 = {
	data: GlobaltypesConfigDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateInvite201 = {
	data: TypesInviteDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListPromotedAndIndexedPaths200 = {
	/**
	 * @type array
	 * @nullable true
	 */
	data: PromotetypesPromotePathDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
};

export type ListOrgPreferences200 = {
	/**
	 * @type array
	 */
	data: PreferencetypesPreferenceDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type GetOrgPreferencePathParameters = {
	name: string;
};
export type GetOrgPreference200 = {
	data: PreferencetypesPreferenceDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateOrgPreferencePathParameters = {
	name: string;
};
export type GetPublicDashboardDataPathParameters = {
	id: string;
};
export type GetPublicDashboardData200 = {
	data: DashboardtypesGettablePublicDashboardDataDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetPublicDashboardWidgetQueryRangePathParameters = {
	id: string;
	idx: string;
};
export type GetPublicDashboardWidgetQueryRange200 = {
	data: Querybuildertypesv5QueryRangeResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListRoles200 = {
	/**
	 * @type array
	 */
	data: AuthtypesRoleDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateRole201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteRolePathParameters = {
	id: string;
};
export type GetRolePathParameters = {
	id: string;
};
export type GetRole200 = {
	data: AuthtypesRoleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type PatchRolePathParameters = {
	id: string;
};
export type GetObjectsPathParameters = {
	id: string;
	relation: string;
};
export type GetObjects200 = {
	/**
	 * @type array
	 */
	data: AuthtypesGettableObjectsDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type PatchObjectsPathParameters = {
	id: string;
	relation: string;
};
export type GetAllRoutePolicies200 = {
	/**
	 * @type array
	 */
	data: AlertmanagertypesGettableRoutePolicyDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateRoutePolicy201 = {
	data: AlertmanagertypesGettableRoutePolicyDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteRoutePolicyByIDPathParameters = {
	id: string;
};
export type GetRoutePolicyByIDPathParameters = {
	id: string;
};
export type GetRoutePolicyByID200 = {
	data: AlertmanagertypesGettableRoutePolicyDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateRoutePolicyPathParameters = {
	id: string;
};
export type UpdateRoutePolicy200 = {
	data: AlertmanagertypesGettableRoutePolicyDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListServiceAccounts200 = {
	/**
	 * @type array
	 */
	data: ServiceaccounttypesServiceAccountDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateServiceAccount201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteServiceAccountPathParameters = {
	id: string;
};
export type GetServiceAccountPathParameters = {
	id: string;
};
export type GetServiceAccount200 = {
	data: ServiceaccounttypesServiceAccountWithRolesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateServiceAccountPathParameters = {
	id: string;
};
export type ListServiceAccountKeysPathParameters = {
	id: string;
};
export type ListServiceAccountKeys200 = {
	/**
	 * @type array
	 */
	data: ServiceaccounttypesGettableFactorAPIKeyDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateServiceAccountKeyPathParameters = {
	id: string;
};
export type CreateServiceAccountKey201 = {
	data: ServiceaccounttypesGettableFactorAPIKeyWithKeyDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type RevokeServiceAccountKeyPathParameters = {
	id: string;
	fid: string;
};
export type UpdateServiceAccountKeyPathParameters = {
	id: string;
	fid: string;
};
export type GetServiceAccountRolesPathParameters = {
	id: string;
};
export type GetServiceAccountRoles200 = {
	/**
	 * @type array
	 * @nullable true
	 */
	data: AuthtypesRoleDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateServiceAccountRolePathParameters = {
	id: string;
};
export type CreateServiceAccountRole201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteServiceAccountRolePathParameters = {
	id: string;
	rid: string;
};
export type GetMyServiceAccount200 = {
	data: ServiceaccounttypesServiceAccountWithRolesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListUsersDeprecated200 = {
	/**
	 * @type array
	 */
	data: TypesDeprecatedUserDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteUserPathParameters = {
	id: string;
};
export type GetUserDeprecatedPathParameters = {
	id: string;
};
export type GetUserDeprecated200 = {
	data: TypesDeprecatedUserDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateUserDeprecatedPathParameters = {
	id: string;
};
export type UpdateUserDeprecated200 = {
	data: TypesDeprecatedUserDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMyUserDeprecated200 = {
	data: TypesDeprecatedUserDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListUserPreferences200 = {
	/**
	 * @type array
	 */
	data: PreferencetypesPreferenceDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type GetUserPreferencePathParameters = {
	name: string;
};
export type GetUserPreference200 = {
	data: PreferencetypesPreferenceDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateUserPreferencePathParameters = {
	name: string;
};
export type GetFeatures200 = {
	/**
	 * @type array
	 */
	data: FeaturetypesGettableFeatureDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type GetIngestionKeysParams = {
	/**
	 * @type integer
	 * @description undefined
	 */
	page?: number;
	/**
	 * @type integer
	 * @description undefined
	 */
	per_page?: number;
};

export type GetIngestionKeys200 = {
	data: GatewaytypesGettableIngestionKeysDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateIngestionKey201 = {
	data: GatewaytypesGettableCreatedIngestionKeyDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteIngestionKeyPathParameters = {
	keyId: string;
};
export type UpdateIngestionKeyPathParameters = {
	keyId: string;
};
export type CreateIngestionKeyLimitPathParameters = {
	keyId: string;
};
export type CreateIngestionKeyLimit201 = {
	data: GatewaytypesGettableCreatedIngestionKeyLimitDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteIngestionKeyLimitPathParameters = {
	limitId: string;
};
export type UpdateIngestionKeyLimitPathParameters = {
	limitId: string;
};
export type SearchIngestionKeysParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	name: string;
	/**
	 * @type integer
	 * @description undefined
	 */
	page?: number;
	/**
	 * @type integer
	 * @description undefined
	 */
	per_page?: number;
};

export type SearchIngestionKeys200 = {
	data: GatewaytypesGettableIngestionKeysDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type Healthz200 = {
	data: FactoryResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type Healthz503 = {
	data: FactoryResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type Livez200 = {
	data: FactoryResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListMetricsParams = {
	/**
	 * @type integer
	 * @nullable true
	 * @description undefined
	 */
	start?: number | null;
	/**
	 * @type integer
	 * @nullable true
	 * @description undefined
	 */
	end?: number | null;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @type string
	 * @description undefined
	 */
	searchText?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	source?: string;
};

export type ListMetrics200 = {
	data: MetricsexplorertypesListMetricsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricAlertsPathParameters = {
	metricName: string;
};
export type GetMetricAlerts200 = {
	data: MetricsexplorertypesMetricAlertsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricAttributesPathParameters = {
	metricName: string;
};
export type GetMetricAttributesParams = {
	/**
	 * @type integer
	 * @nullable true
	 * @description undefined
	 */
	start?: number | null;
	/**
	 * @type integer
	 * @nullable true
	 * @description undefined
	 */
	end?: number | null;
};

export type GetMetricAttributes200 = {
	data: MetricsexplorertypesMetricAttributesResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricDashboardsPathParameters = {
	metricName: string;
};
export type GetMetricDashboards200 = {
	data: MetricsexplorertypesMetricDashboardsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricHighlightsPathParameters = {
	metricName: string;
};
export type GetMetricHighlights200 = {
	data: MetricsexplorertypesMetricHighlightsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricMetadataPathParameters = {
	metricName: string;
};
export type GetMetricMetadata200 = {
	data: MetricsexplorertypesMetricMetadataDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateMetricMetadataPathParameters = {
	metricName: string;
};
export type InspectMetrics200 = {
	data: MetricsexplorertypesInspectMetricsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricsOnboardingStatus200 = {
	data: MetricsexplorertypesMetricsOnboardingResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricsStats200 = {
	data: MetricsexplorertypesStatsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricsTreemap200 = {
	data: MetricsexplorertypesTreemapResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMyOrganization200 = {
	data: TypesOrganizationDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type Readyz200 = {
	data: FactoryResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type Readyz503 = {
	data: FactoryResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetUsersByRoleIDPathParameters = {
	id: string;
};
export type GetUsersByRoleID200 = {
	/**
	 * @type array
	 */
	data: TypesUserDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type ListRules200 = {
	/**
	 * @type array
	 */
	data: RuletypesRuleDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateRule201 = {
	data: RuletypesRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteRuleByIDPathParameters = {
	id: string;
};
export type GetRuleByIDPathParameters = {
	id: string;
};
export type GetRuleByID200 = {
	data: RuletypesRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type PatchRuleByIDPathParameters = {
	id: string;
};
export type PatchRuleByID200 = {
	data: RuletypesRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateRuleByIDPathParameters = {
	id: string;
};
export type GetRuleHistoryFilterKeysPathParameters = {
	id: string;
};
export type GetRuleHistoryFilterKeysParams = {
	/**
	 * @description undefined
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description undefined
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	endUnixMilli?: number;
	/**
	 * @description undefined
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description undefined
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	searchText?: string;
};

export type GetRuleHistoryFilterKeys200 = {
	data: TelemetrytypesGettableFieldKeysDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetRuleHistoryFilterValuesPathParameters = {
	id: string;
};
export type GetRuleHistoryFilterValuesParams = {
	/**
	 * @description undefined
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description undefined
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	endUnixMilli?: number;
	/**
	 * @description undefined
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description undefined
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	searchText?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	name?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	existingQuery?: string;
};

export type GetRuleHistoryFilterValues200 = {
	data: TelemetrytypesGettableFieldValuesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetRuleHistoryOverallStatusPathParameters = {
	id: string;
};
export type GetRuleHistoryOverallStatusParams = {
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	start: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	end: number;
};

export type GetRuleHistoryOverallStatus200 = {
	/**
	 * @type array
	 * @nullable true
	 */
	data: RulestatehistorytypesGettableRuleStateWindowDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
};

export type GetRuleHistoryStatsPathParameters = {
	id: string;
};
export type GetRuleHistoryStatsParams = {
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	start: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	end: number;
};

export type GetRuleHistoryStats200 = {
	data: RulestatehistorytypesGettableRuleStateHistoryStatsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetRuleHistoryTimelinePathParameters = {
	id: string;
};
export type GetRuleHistoryTimelineParams = {
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	start: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	end: number;
	/**
	 * @description undefined
	 */
	state?: RuletypesAlertStateDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	filterExpression?: string;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @description undefined
	 */
	order?: Querybuildertypesv5OrderDirectionDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	cursor?: string;
};

export type GetRuleHistoryTimeline200 = {
	data: RulestatehistorytypesGettableRuleStateTimelineDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetRuleHistoryTopContributorsPathParameters = {
	id: string;
};
export type GetRuleHistoryTopContributorsParams = {
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	start: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	end: number;
};

export type GetRuleHistoryTopContributors200 = {
	/**
	 * @type array
	 * @nullable true
	 */
	data: RulestatehistorytypesGettableRuleStateHistoryContributorDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
};

export type TestRule200 = {
	data: RuletypesGettableTestRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetSessionContext200 = {
	data: AuthtypesSessionContextDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateSessionByEmailPassword200 = {
	data: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type RotateSession200 = {
	data: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListUsers200 = {
	/**
	 * @type array
	 */
	data: TypesUserDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type GetUserPathParameters = {
	id: string;
};
export type GetUser200 = {
	data: AuthtypesUserWithRolesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateUserPathParameters = {
	id: string;
};
export type GetResetPasswordTokenPathParameters = {
	id: string;
};
export type GetResetPasswordToken200 = {
	data: TypesResetPasswordTokenDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateResetPasswordTokenPathParameters = {
	id: string;
};
export type CreateResetPasswordToken201 = {
	data: TypesResetPasswordTokenDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetRolesByUserIDPathParameters = {
	id: string;
};
export type GetRolesByUserID200 = {
	/**
	 * @type array
	 */
	data: AuthtypesRoleDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type SetRoleByUserIDPathParameters = {
	id: string;
};
export type RemoveUserRoleByUserIDAndRoleIDPathParameters = {
	id: string;
	roleId: string;
};
export type GetMyUser200 = {
	data: AuthtypesUserWithRolesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetHosts200 = {
	data: ZeustypesGettableHostDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type QueryRangeV5200 = {
	data: Querybuildertypesv5QueryRangeResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ReplaceVariables200 = {
	data: Querybuildertypesv5QueryRangeRequestDTO;
	/**
	 * @type string
	 */
	status: string;
};
