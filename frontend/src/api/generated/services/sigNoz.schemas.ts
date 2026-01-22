/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'yarn generate:api'
 * SigNoz
 */
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
	id?: string;
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

export interface AuthtypesPostableRotateTokenDTO {
	/**
	 * @type string
	 */
	refreshToken?: string;
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

export interface AuthtypesUpdateableAuthDomainDTO {
	config?: AuthtypesAuthDomainConfigDTO;
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
	code?: string;
	/**
	 * @type array
	 */
	errors?: ErrorsResponseerroradditionalDTO[];
	/**
	 * @type string
	 */
	message?: string;
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
	id?: string;
	/**
	 * @type string
	 */
	value?: string;
}

export interface GatewaytypesGettableCreatedIngestionKeyLimitDTO {
	/**
	 * @type string
	 */
	id?: string;
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
	 * @format int64
	 */
	count?: number;
	/**
	 * @type integer
	 * @format int64
	 */
	size?: number;
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
	name?: string;
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
	config?: GatewaytypesLimitConfigDTO;
	/**
	 * @type array
	 * @nullable true
	 */
	tags?: string[] | null;
}

export interface MetricsexplorertypesMetricAlertDTO {
	/**
	 * @type string
	 */
	alertId?: string;
	/**
	 * @type string
	 */
	alertName?: string;
}

export interface MetricsexplorertypesMetricAlertsResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	alerts?: MetricsexplorertypesMetricAlertDTO[] | null;
}

export interface MetricsexplorertypesMetricAttributeDTO {
	/**
	 * @type string
	 */
	key?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	valueCount?: number;
	/**
	 * @type array
	 * @nullable true
	 */
	values?: string[] | null;
}

export interface MetricsexplorertypesMetricAttributesRequestDTO {
	/**
	 * @type integer
	 * @nullable true
	 */
	end?: number | null;
	/**
	 * @type string
	 */
	metricName?: string;
	/**
	 * @type integer
	 * @nullable true
	 */
	start?: number | null;
}

export interface MetricsexplorertypesMetricAttributesResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	attributes?: MetricsexplorertypesMetricAttributeDTO[] | null;
	/**
	 * @type integer
	 * @format int64
	 */
	totalKeys?: number;
}

export interface MetricsexplorertypesMetricDashboardDTO {
	/**
	 * @type string
	 */
	dashboardId?: string;
	/**
	 * @type string
	 */
	dashboardName?: string;
	/**
	 * @type string
	 */
	widgetId?: string;
	/**
	 * @type string
	 */
	widgetName?: string;
}

export interface MetricsexplorertypesMetricDashboardsResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	dashboards?: MetricsexplorertypesMetricDashboardDTO[] | null;
}

export interface MetricsexplorertypesMetricHighlightsResponseDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	activeTimeSeries?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	dataPoints?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	lastReceived?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalTimeSeries?: number;
}

export interface MetricsexplorertypesMetricMetadataDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type boolean
	 */
	isMonotonic?: boolean;
	/**
	 * @type string
	 */
	temporality?: string;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	unit?: string;
}

export interface MetricsexplorertypesStatDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	metricName?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	samples?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	timeseries?: number;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	unit?: string;
}

export interface MetricsexplorertypesStatsRequestDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end?: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type integer
	 */
	limit?: number;
	/**
	 * @type integer
	 */
	offset?: number;
	orderBy?: Querybuildertypesv5OrderByDTO;
	/**
	 * @type integer
	 * @format int64
	 */
	start?: number;
}

export interface MetricsexplorertypesStatsResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	metrics?: MetricsexplorertypesStatDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 */
	total?: number;
}

export interface MetricsexplorertypesTreemapEntryDTO {
	/**
	 * @type string
	 */
	metricName?: string;
	/**
	 * @type number
	 * @format double
	 */
	percentage?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalValue?: number;
}

export interface MetricsexplorertypesTreemapRequestDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end?: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type integer
	 */
	limit?: number;
	/**
	 * @type string
	 */
	mode?: string;
	/**
	 * @type integer
	 * @format int64
	 */
	start?: number;
}

export interface MetricsexplorertypesTreemapResponseDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	samples?: MetricsexplorertypesTreemapEntryDTO[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	timeseries?: MetricsexplorertypesTreemapEntryDTO[] | null;
}

export interface MetricsexplorertypesUpdateMetricMetadataRequestDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type boolean
	 */
	isMonotonic?: boolean;
	/**
	 * @type string
	 */
	metricName?: string;
	/**
	 * @type string
	 */
	temporality?: string;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	unit?: string;
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

export type Querybuildertypesv5ExecStatsDTOStepIntervals = {
	[key: string]: number;
};

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

export interface Querybuildertypesv5OrderByDTO {
	/**
	 * @type string
	 */
	direction?: string;
	key?: Querybuildertypesv5OrderByKeyDTO;
}

export interface Querybuildertypesv5OrderByKeyDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	fieldContext?: string;
	/**
	 * @type string
	 */
	fieldDataType?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	signal?: string;
	/**
	 * @type string
	 */
	unit?: string;
}

export interface Querybuildertypesv5QueryDataDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	results?: unknown[] | null;
}

export interface Querybuildertypesv5QueryRangeResponseDTO {
	data?: Querybuildertypesv5QueryDataDTO;
	meta?: Querybuildertypesv5ExecStatsDTO;
	/**
	 * @type string
	 */
	type?: string;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
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

export interface RenderErrorResponseDTO {
	error?: ErrorsJSONDTO;
	/**
	 * @type string
	 */
	status?: string;
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
	/**
	 * @type string
	 */
	userId?: string;
}

export interface TypesGettableAPIKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: Date;
	/**
	 * @type string
	 */
	createdBy?: string;
	createdByUser?: TypesUserDTO;
	/**
	 * @type integer
	 * @format int64
	 */
	expiresAt?: number;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type integer
	 * @format int64
	 */
	lastUsed?: number;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type boolean
	 */
	revoked?: boolean;
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
	/**
	 * @type string
	 */
	updatedBy?: string;
	updatedByUser?: TypesUserDTO;
	/**
	 * @type string
	 */
	userId?: string;
}

export interface TypesGettableGlobalConfigDTO {
	/**
	 * @type string
	 */
	external_url?: string;
	/**
	 * @type string
	 */
	ingestion_url?: string;
}

export interface TypesIdentifiableDTO {
	/**
	 * @type string
	 */
	id?: string;
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
	id?: string;
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
	id?: string;
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

export interface TypesPostableAPIKeyDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	expiresInDays?: number;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	role?: string;
}

export interface TypesPostableAcceptInviteDTO {
	/**
	 * @type string
	 */
	displayName?: string;
	/**
	 * @type string
	 */
	password?: string;
	/**
	 * @type string
	 */
	sourceUrl?: string;
	/**
	 * @type string
	 */
	token?: string;
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

export interface TypesResetPasswordTokenDTO {
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type string
	 */
	passwordId?: string;
	/**
	 * @type string
	 */
	token?: string;
}

export interface TypesStorableAPIKeyDTO {
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
	id?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type boolean
	 */
	revoked?: boolean;
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
	/**
	 * @type string
	 */
	updatedBy?: string;
	/**
	 * @type string
	 */
	userId?: string;
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
	id?: string;
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
	 * @format date-time
	 */
	updatedAt?: Date;
}

export type ChangePasswordPathParameters = {
	id: string;
};
export type CreateSessionByGoogleCallback303 = {
	data?: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type CreateSessionByOIDCCallback303 = {
	data?: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status?: string;
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
	data?: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type DeletePublicDashboardPathParameters = {
	id: string;
};
export type GetPublicDashboardPathParameters = {
	id: string;
};
export type GetPublicDashboard200 = {
	data?: DashboardtypesGettablePublicDasbhboardDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type CreatePublicDashboardPathParameters = {
	id: string;
};
export type CreatePublicDashboard201 = {
	data?: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type UpdatePublicDashboardPathParameters = {
	id: string;
};
export type ListAuthDomains200 = {
	/**
	 * @type array
	 */
	data?: AuthtypesGettableAuthDomainDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type CreateAuthDomain200 = {
	data?: AuthtypesGettableAuthDomainDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type DeleteAuthDomainPathParameters = {
	id: string;
};
export type UpdateAuthDomainPathParameters = {
	id: string;
};
export type GetResetPasswordTokenPathParameters = {
	id: string;
};
export type GetResetPasswordToken200 = {
	data?: TypesResetPasswordTokenDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetGlobalConfig200 = {
	data?: TypesGettableGlobalConfigDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type ListInvite200 = {
	/**
	 * @type array
	 */
	data?: TypesInviteDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type CreateInvite201 = {
	data?: TypesInviteDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type DeleteInvitePathParameters = {
	id: string;
};
export type GetInvitePathParameters = {
	token: string;
};
export type GetInvite200 = {
	data?: TypesInviteDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type AcceptInvite201 = {
	data?: TypesUserDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type ListPromotedAndIndexedPaths200 = {
	/**
	 * @type array
	 * @nullable true
	 */
	data?: PromotetypesPromotePathDTO[] | null;
	/**
	 * @type string
	 */
	status?: string;
};

export type ListOrgPreferences200 = {
	/**
	 * @type array
	 */
	data?: PreferencetypesPreferenceDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type GetOrgPreferencePathParameters = {
	name: string;
};
export type GetOrgPreference200 = {
	data?: PreferencetypesPreferenceDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type UpdateOrgPreferencePathParameters = {
	name: string;
};
export type ListAPIKeys200 = {
	/**
	 * @type array
	 */
	data?: TypesGettableAPIKeyDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type CreateAPIKey201 = {
	data?: TypesGettableAPIKeyDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type RevokeAPIKeyPathParameters = {
	id: string;
};
export type UpdateAPIKeyPathParameters = {
	id: string;
};
export type GetPublicDashboardDataPathParameters = {
	id: string;
};
export type GetPublicDashboardData200 = {
	data?: DashboardtypesGettablePublicDashboardDataDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetPublicDashboardWidgetQueryRangePathParameters = {
	id: string;
	idx: string;
};
export type GetPublicDashboardWidgetQueryRange200 = {
	data?: Querybuildertypesv5QueryRangeResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type ListUsers200 = {
	/**
	 * @type array
	 */
	data?: TypesUserDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type DeleteUserPathParameters = {
	id: string;
};
export type GetUserPathParameters = {
	id: string;
};
export type GetUser200 = {
	data?: TypesUserDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type UpdateUserPathParameters = {
	id: string;
};
export type UpdateUser200 = {
	data?: TypesUserDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMyUser200 = {
	data?: TypesUserDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type ListUserPreferences200 = {
	/**
	 * @type array
	 */
	data?: PreferencetypesPreferenceDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type GetUserPreferencePathParameters = {
	name: string;
};
export type GetUserPreference200 = {
	data?: PreferencetypesPreferenceDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type UpdateUserPreferencePathParameters = {
	name: string;
};
export type GetFeatures200 = {
	/**
	 * @type array
	 */
	data?: FeaturetypesGettableFeatureDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type GetIngestionKeys200 = {
	data?: GatewaytypesGettableIngestionKeysDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type CreateIngestionKey200 = {
	data?: GatewaytypesGettableCreatedIngestionKeyDTO;
	/**
	 * @type string
	 */
	status?: string;
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
	data?: GatewaytypesGettableCreatedIngestionKeyLimitDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type DeleteIngestionKeyLimitPathParameters = {
	limitId: string;
};
export type UpdateIngestionKeyLimitPathParameters = {
	limitId: string;
};
export type SearchIngestionKeys200 = {
	data?: GatewaytypesGettableIngestionKeysDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricAlertsParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
};

export type GetMetricAlerts200 = {
	data?: MetricsexplorertypesMetricAlertsResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricDashboardsParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
};

export type GetMetricDashboards200 = {
	data?: MetricsexplorertypesMetricDashboardsResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricHighlightsParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
};

export type GetMetricHighlights200 = {
	data?: MetricsexplorertypesMetricHighlightsResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type UpdateMetricMetadataPathParameters = {
	metricName: string;
};
export type GetMetricAttributes200 = {
	data?: MetricsexplorertypesMetricAttributesResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricMetadataParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
};

export type GetMetricMetadata200 = {
	data?: MetricsexplorertypesMetricMetadataDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricsStats200 = {
	data?: MetricsexplorertypesStatsResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricsTreemap200 = {
	data?: MetricsexplorertypesTreemapResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMyOrganization200 = {
	data?: TypesOrganizationDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetSessionContext200 = {
	data?: AuthtypesSessionContextDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type CreateSessionByEmailPassword200 = {
	data?: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type RotateSession200 = {
	data?: AuthtypesGettableTokenDTO;
	/**
	 * @type string
	 */
	status?: string;
};
