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

export interface AuthtypesNameDTO {
	[key: string]: unknown;
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
	selector: AuthtypesSelectorDTO;
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

export interface AuthtypesResourceDTO {
	name: AuthtypesNameDTO;
	/**
	 * @type string
	 */
	type: string;
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

export interface AuthtypesSelectorDTO {
	[key: string]: unknown;
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
	/**
	 * @type string
	 */
	id?: string;
	object: AuthtypesObjectDTO;
	/**
	 * @type string
	 */
	relation: string;
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
	error?: ErrorsJSONDTO;
	/**
	 * @type string
	 */
	status?: string;
}

/**
 * @nullable
 */
export type RoletypesGettableResourcesDTORelations = {
	[key: string]: string[];
} | null;

export interface RoletypesGettableResourcesDTO {
	/**
	 * @type object
	 * @nullable true
	 */
	relations: RoletypesGettableResourcesDTORelations;
	/**
	 * @type array
	 * @nullable true
	 */
	resources: AuthtypesResourceDTO[] | null;
}

export interface RoletypesPatchableObjectsDTO {
	/**
	 * @type array
	 * @nullable true
	 */
	additions: AuthtypesObjectDTO[] | null;
	/**
	 * @type array
	 * @nullable true
	 */
	deletions: AuthtypesObjectDTO[] | null;
}

export interface RoletypesPatchableRoleDTO {
	/**
	 * @type string
	 */
	description: string;
}

export interface RoletypesPostableRoleDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name: string;
}

export interface RoletypesRoleDTO {
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
	id?: string;
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

export interface TypesResetPasswordTokenDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	expiresAt?: Date;
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

export type AuthzCheck200 = {
	/**
	 * @type array
	 */
	data?: AuthtypesGettableTransactionDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

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
	searchText?: string;
};

export type GetFieldsKeys200 = {
	data?: TelemetrytypesGettableFieldKeysDTO;
	/**
	 * @type string
	 */
	status?: string;
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
	data?: TelemetrytypesGettableFieldValuesDTO;
	/**
	 * @type string
	 */
	status?: string;
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

export type ListRoles200 = {
	/**
	 * @type array
	 */
	data?: RoletypesRoleDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type CreateRole201 = {
	data?: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type DeleteRolePathParameters = {
	id: string;
};
export type GetRolePathParameters = {
	id: string;
};
export type GetRole200 = {
	data?: RoletypesRoleDTO;
	/**
	 * @type string
	 */
	status?: string;
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
	data?: AuthtypesObjectDTO[];
	/**
	 * @type string
	 */
	status?: string;
};

export type PatchObjectsPathParameters = {
	id: string;
	relation: string;
};
export type GetResources200 = {
	data?: RoletypesGettableResourcesDTO;
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
	data?: GatewaytypesGettableIngestionKeysDTO;
	/**
	 * @type string
	 */
	status?: string;
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
};

export type ListMetrics200 = {
	data?: MetricsexplorertypesListMetricsResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricAlertsPathParameters = {
	metricName: string;
};
export type GetMetricAlerts200 = {
	data?: MetricsexplorertypesMetricAlertsResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
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
	data?: MetricsexplorertypesMetricAttributesResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricDashboardsPathParameters = {
	metricName: string;
};
export type GetMetricDashboards200 = {
	data?: MetricsexplorertypesMetricDashboardsResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricHighlightsPathParameters = {
	metricName: string;
};
export type GetMetricHighlights200 = {
	data?: MetricsexplorertypesMetricHighlightsResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type GetMetricMetadataPathParameters = {
	metricName: string;
};
export type GetMetricMetadata200 = {
	data?: MetricsexplorertypesMetricMetadataDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type UpdateMetricMetadataPathParameters = {
	metricName: string;
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

export type GetHosts200 = {
	data?: ZeustypesGettableHostDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type QueryRangeV5200 = {
	data?: Querybuildertypesv5QueryRangeResponseDTO;
	/**
	 * @type string
	 */
	status?: string;
};

export type ReplaceVariables200 = {
	data?: Querybuildertypesv5QueryRangeRequestDTO;
	/**
	 * @type string
	 */
	status?: string;
};
