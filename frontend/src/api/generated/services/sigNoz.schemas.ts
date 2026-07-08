/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
export interface AlertmanagertypesChannelDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	updatedAt?: string;
}

export interface ModelLabelSetDTO {
	[key: string]: string;
}

export interface TypesAlertStatusDTO {
	/**
	 * @type array,null
	 */
	inhibitedBy?: string[] | null;
	/**
	 * @type array,null
	 */
	silencedBy?: string[] | null;
	/**
	 * @type string
	 */
	state?: string;
}

export interface AlertmanagertypesDeprecatedGettableAlertDTO {
	annotations?: ModelLabelSetDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	endsAt?: string;
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
	 * @type array,null
	 */
	receivers?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	startsAt?: string;
	status?: TypesAlertStatusDTO;
}

export enum AlertmanagertypesExpressionKindDTO {
	rule = 'rule',
	policy = 'policy',
}
export interface AlertmanagertypesGettableRoutePolicyDTO {
	/**
	 * @type array,null
	 */
	channels: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string,null
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
	 * @type array,null
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
	/**
	 * @type string,null
	 */
	updatedBy?: string | null;
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

export interface ConfigHeadersDTO {
	[key: string]: unknown;
}

export interface ConfigProxyHeaderDTO {
	[key: string]: string[];
}

export interface ConfigURLDTO {
	[key: string]: unknown;
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

export interface ConfigSecretURLDTO {
	[key: string]: unknown;
}

export interface AlertmanagertypesGoogleChatReceiverConfigDTO {
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
}

export enum AlertmanagertypesMaintenanceKindDTO {
	fixed = 'fixed',
	recurring = 'recurring',
}
export enum AlertmanagertypesMaintenanceStatusDTO {
	active = 'active',
	upcoming = 'upcoming',
	expired = 'expired',
}
export enum AlertmanagertypesRepeatOnDTO {
	sunday = 'sunday',
	monday = 'monday',
	tuesday = 'tuesday',
	wednesday = 'wednesday',
	thursday = 'thursday',
	friday = 'friday',
	saturday = 'saturday',
}
export enum AlertmanagertypesRepeatTypeDTO {
	daily = 'daily',
	weekly = 'weekly',
	monthly = 'monthly',
}
export interface AlertmanagertypesRecurrenceDTO {
	/**
	 * @type string
	 */
	duration: string;
	/**
	 * @type array,null
	 */
	repeatOn?: AlertmanagertypesRepeatOnDTO[] | null;
	repeatType: AlertmanagertypesRepeatTypeDTO;
}

export interface AlertmanagertypesScheduleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	endTime?: string;
	recurrence?: AlertmanagertypesRecurrenceDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	startTime: string;
	/**
	 * @type string
	 */
	timezone: string;
}

export interface AlertmanagertypesPlannedMaintenanceDTO {
	/**
	 * @type array,null
	 */
	alertIds?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	kind: AlertmanagertypesMaintenanceKindDTO;
	/**
	 * @type string
	 */
	name: string;
	schedule: AlertmanagertypesScheduleDTO;
	/**
	 * @type string
	 */
	scope?: string;
	status: AlertmanagertypesMaintenanceStatusDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
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

export interface ConfigHostPortDTO {
	[key: string]: unknown;
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
	 * @type boolean,null
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
	 * @type boolean,null
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

export type TimeDurationDTO = number;

export interface ConfigURLType2DTO {
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

export interface ConfigJiraFieldConfigDTO {
	/**
	 * @type boolean,null
	 */
	enable_update?: boolean | null;
	/**
	 * @type string
	 */
	template?: string;
}

export type ModelDurationDTO = number;

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

export interface ConfigMattermostFieldDTO {
	/**
	 * @type boolean,null
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

export type ConfigDurationDTO = string;

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
	 * @type boolean,null
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

export interface ConfigSlackFieldDTO {
	/**
	 * @type boolean,null
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

export interface Sigv4SigV4ConfigDTO {
	[key: string]: unknown;
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

export type AlertmanagertypesPostableChannelDTO = unknown & {
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
	googlechat_configs?: AlertmanagertypesGoogleChatReceiverConfigDTO[];
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
	name: string;
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
};

export interface AlertmanagertypesPostablePlannedMaintenanceDTO {
	/**
	 * @type array,null
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
	schedule: AlertmanagertypesScheduleDTO;
	/**
	 * @type string
	 */
	scope?: string;
}

export interface AlertmanagertypesPostableRoutePolicyDTO {
	/**
	 * @type array,null
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
	 * @type array,null
	 */
	tags?: string[] | null;
}

export interface AlertmanagertypesReceiverDTO {
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
	googlechat_configs?: AlertmanagertypesGoogleChatReceiverConfigDTO[];
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

export type AuthtypesRoleMappingDTOGroupMappingsAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type AuthtypesRoleMappingDTOGroupMappings =
	AuthtypesRoleMappingDTOGroupMappingsAnyOf | null;

export interface AuthtypesRoleMappingDTO {
	/**
	 * @type string
	 */
	defaultRole?: string;
	/**
	 * @type object,null
	 */
	groupMappings?: AuthtypesRoleMappingDTOGroupMappings;
	/**
	 * @type boolean
	 */
	useRoleAttribute?: boolean;
}

export enum AuthtypesAuthNProviderDTO {
	google_auth = 'google_auth',
	saml = 'saml',
	email_password = 'email_password',
	oidc = 'oidc',
}
export type AuthtypesAuthDomainConfigDTO =
	| (AuthtypesSamlConfigDTO & {
			googleAuthConfig?: AuthtypesGoogleConfigDTO;
			oidcConfig?: AuthtypesOIDCConfigDTO;
			roleMapping?: AuthtypesRoleMappingDTO;
			samlConfig?: AuthtypesSamlConfigDTO;
			/**
			 * @type boolean
			 */
			ssoEnabled?: boolean;
			ssoType?: AuthtypesAuthNProviderDTO;
	  })
	| (AuthtypesGoogleConfigDTO & {
			googleAuthConfig?: AuthtypesGoogleConfigDTO;
			oidcConfig?: AuthtypesOIDCConfigDTO;
			roleMapping?: AuthtypesRoleMappingDTO;
			samlConfig?: AuthtypesSamlConfigDTO;
			/**
			 * @type boolean
			 */
			ssoEnabled?: boolean;
			ssoType?: AuthtypesAuthNProviderDTO;
	  })
	| (AuthtypesOIDCConfigDTO & {
			googleAuthConfig?: AuthtypesGoogleConfigDTO;
			oidcConfig?: AuthtypesOIDCConfigDTO;
			roleMapping?: AuthtypesRoleMappingDTO;
			samlConfig?: AuthtypesSamlConfigDTO;
			/**
			 * @type boolean
			 */
			ssoEnabled?: boolean;
			ssoType?: AuthtypesAuthNProviderDTO;
	  });

export interface AuthtypesAuthNProviderInfoDTO {
	/**
	 * @type string,null
	 */
	relayStatePath?: string | null;
}

export interface AuthtypesCallbackAuthNSupportDTO {
	provider?: AuthtypesAuthNProviderDTO;
	/**
	 * @type string
	 */
	url?: string;
}

export interface AuthtypesPasswordAuthNSupportDTO {
	provider?: AuthtypesAuthNProviderDTO;
}

export interface AuthtypesAuthNSupportDTO {
	/**
	 * @type array,null
	 */
	callback?: AuthtypesCallbackAuthNSupportDTO[] | null;
	/**
	 * @type array,null
	 */
	password?: AuthtypesPasswordAuthNSupportDTO[] | null;
}

export interface AuthtypesDeprecatedPostableUserRoleDTO {
	/**
	 * @type string
	 */
	id: string;
}

export interface AuthtypesGettableAuthDomainDTO {
	authNProviderInfo?: AuthtypesAuthNProviderInfoDTO;
	config?: AuthtypesAuthDomainConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	id: string;
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
	 * @format date-time
	 */
	updatedAt?: string;
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

export enum CoretypesKindDTO {
	anonymous = 'anonymous',
	organization = 'organization',
	role = 'role',
	serviceaccount = 'serviceaccount',
	user = 'user',
	'notification-channel' = 'notification-channel',
	'route-policy' = 'route-policy',
	'apdex-setting' = 'apdex-setting',
	'auth-domain' = 'auth-domain',
	session = 'session',
	'cloud-integration' = 'cloud-integration',
	'cloud-integration-service' = 'cloud-integration-service',
	integration = 'integration',
	dashboard = 'dashboard',
	'public-dashboard' = 'public-dashboard',
	'ingestion-key' = 'ingestion-key',
	'ingestion-limit' = 'ingestion-limit',
	pipeline = 'pipeline',
	'user-preference' = 'user-preference',
	'org-preference' = 'org-preference',
	'quick-filter' = 'quick-filter',
	'ttl-setting' = 'ttl-setting',
	rule = 'rule',
	'planned-maintenance' = 'planned-maintenance',
	'saved-view' = 'saved-view',
	'trace-funnel' = 'trace-funnel',
	'factor-password' = 'factor-password',
	'factor-api-key' = 'factor-api-key',
	license = 'license',
	subscription = 'subscription',
	logs = 'logs',
	traces = 'traces',
	metrics = 'metrics',
	'audit-logs' = 'audit-logs',
	'meter-metrics' = 'meter-metrics',
	'logs-field' = 'logs-field',
	'traces-field' = 'traces-field',
}
export enum CoretypesTypeDTO {
	user = 'user',
	serviceaccount = 'serviceaccount',
	anonymous = 'anonymous',
	role = 'role',
	organization = 'organization',
	metaresource = 'metaresource',
	telemetryresource = 'telemetryresource',
}
export interface CoretypesResourceRefDTO {
	kind: CoretypesKindDTO;
	type: CoretypesTypeDTO;
}

export interface CoretypesObjectDTO {
	resource: CoretypesResourceRefDTO;
	/**
	 * @type string
	 */
	selector: string;
}

export enum AuthtypesRelationDTO {
	create = 'create',
	read = 'read',
	update = 'update',
	delete = 'delete',
	list = 'list',
	assignee = 'assignee',
	attach = 'attach',
	detach = 'detach',
}
export interface AuthtypesGettableTransactionDTO {
	/**
	 * @type boolean
	 */
	authorized: boolean;
	object: CoretypesObjectDTO;
	relation: AuthtypesRelationDTO;
}

export interface ErrorsResponseerroradditionalDTO {
	/**
	 * @type string
	 */
	message: string;
	/**
	 * @type array
	 */
	suggestions: string[];
}

export interface ErrorsResponseretryjsonDTO {
	delay: TimeDurationDTO;
}

export interface ErrorsJSONDTO {
	/**
	 * @type string
	 */
	code: string;
	/**
	 * @type array
	 */
	errors: ErrorsResponseerroradditionalDTO[];
	/**
	 * @type string
	 */
	message: string;
	retry?: ErrorsResponseretryjsonDTO;
	/**
	 * @type array
	 */
	suggestions: string[];
	/**
	 * @type string
	 */
	type: string;
	/**
	 * @type string
	 */
	url?: string;
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

export interface CoretypesObjectGroupDTO {
	resource: CoretypesResourceRefDTO;
	/**
	 * @type array
	 */
	selectors: string[];
}

export interface AuthtypesTransactionGroupDTO {
	objectGroup: CoretypesObjectGroupDTO;
	relation: AuthtypesRelationDTO;
}

export type AuthtypesTransactionGroupsDTO = AuthtypesTransactionGroupDTO[];

export interface AuthtypesPostableRoleDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name: string;
	transactionGroups?: AuthtypesTransactionGroupsDTO;
}

export interface AuthtypesPostableRotateTokenDTO {
	/**
	 * @type string
	 */
	refreshToken?: string;
}

export interface AuthtypesPostableUserDTO {
	/**
	 * @type string
	 */
	displayName?: string;
	/**
	 * @type string
	 */
	email: string;
	/**
	 * @type string
	 */
	frontendBaseUrl?: string;
	/**
	 * @type array
	 */
	userRoles?: AuthtypesDeprecatedPostableUserRoleDTO[];
}

export interface AuthtypesPostableUserRoleDTO {
	/**
	 * @type string
	 */
	roleId: string;
	/**
	 * @type string
	 */
	userId: string;
}

export interface AuthtypesRoleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	updatedAt?: string;
}

export interface AuthtypesRoleWithTransactionGroupsDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	transactionGroups: AuthtypesTransactionGroupsDTO;
	/**
	 * @type string
	 */
	type: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}

export interface AuthtypesSessionContextDTO {
	/**
	 * @type boolean
	 */
	exists?: boolean;
	/**
	 * @type array,null
	 */
	orgs?: AuthtypesOrgSessionContextDTO[] | null;
}

export interface AuthtypesTransactionDTO {
	object: CoretypesObjectDTO;
	relation: AuthtypesRelationDTO;
}

export interface AuthtypesUpdatableAuthDomainDTO {
	config?: AuthtypesAuthDomainConfigDTO;
}

export interface AuthtypesUpdatableRoleDTO {
	/**
	 * @type string
	 */
	description: string;
	transactionGroups: AuthtypesTransactionGroupsDTO;
}

export interface AuthtypesUserRoleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
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
	updatedAt: string;
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
	createdAt?: string;
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
	updatedAt?: string;
	/**
	 * @type array,null
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

export interface CloudintegrationtypesAWSIntegrationConfigDTO {
	/**
	 * @type array
	 */
	enabledRegions: string[];
	telemetryCollectionStrategy: CloudintegrationtypesAWSTelemetryCollectionStrategyDTO;
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

export interface CloudintegrationtypesAWSServiceConfigDTO {
	logs?: CloudintegrationtypesAWSServiceLogsConfigDTO;
	metrics?: CloudintegrationtypesAWSServiceMetricsConfigDTO;
}

export type CloudintegrationtypesAgentReportDTOAnyOfDataAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type CloudintegrationtypesAgentReportDTOAnyOfData =
	CloudintegrationtypesAgentReportDTOAnyOfDataAnyOf | null;

export type CloudintegrationtypesAgentReportDTOAnyOf = {
	/**
	 * @type object,null
	 */
	data: CloudintegrationtypesAgentReportDTOAnyOfData;
	/**
	 * @type integer
	 * @format int64
	 */
	timestampMillis: number;
};

/**
 * @nullable
 */
export type CloudintegrationtypesAgentReportDTO =
	CloudintegrationtypesAgentReportDTOAnyOf | null;

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

export interface CloudintegrationtypesGCPAccountConfigDTO {
	/**
	 * @type string
	 */
	deploymentProjectId: string;
	/**
	 * @type string
	 */
	deploymentRegion: string;
	/**
	 * @type array
	 */
	projectIds: string[];
}

export interface CloudintegrationtypesAccountConfigDTO {
	aws?: CloudintegrationtypesAWSAccountConfigDTO;
	azure?: CloudintegrationtypesAzureAccountConfigDTO;
	gcp?: CloudintegrationtypesGCPAccountConfigDTO;
}

export interface CloudintegrationtypesAccountDTO {
	agentReport: CloudintegrationtypesAgentReportDTO | null;
	config: CloudintegrationtypesAccountConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	 * @type string,null
	 */
	providerAccountId: string | null;
	/**
	 * @type string,null
	 * @format date-time
	 */
	removedAt: string | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
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

export interface CloudintegrationtypesAzureLogsCollectionStrategyDTO {
	/**
	 * @type array
	 */
	categoryGroups: string[];
}

export interface CloudintegrationtypesAzureMetricsCollectionStrategyDTO {
	[key: string]: unknown;
}

export interface CloudintegrationtypesAzureTelemetryCollectionStrategyDTO {
	logs?: CloudintegrationtypesAzureLogsCollectionStrategyDTO;
	metrics?: CloudintegrationtypesAzureMetricsCollectionStrategyDTO;
	/**
	 * @type string
	 */
	resourceProvider: string;
	/**
	 * @type string
	 */
	resourceType: string;
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

export interface CloudintegrationtypesAzureServiceConfigDTO {
	logs: CloudintegrationtypesAzureServiceLogsConfigDTO;
	metrics: CloudintegrationtypesAzureServiceMetricsConfigDTO;
}

export interface CloudintegrationtypesGCPServiceLogsConfigDTO {
	/**
	 * @type boolean
	 */
	enabled: boolean;
}

export interface CloudintegrationtypesGCPServiceMetricsConfigDTO {
	/**
	 * @type boolean
	 */
	enabled: boolean;
}

export interface CloudintegrationtypesGCPServiceConfigDTO {
	logs?: CloudintegrationtypesGCPServiceLogsConfigDTO;
	metrics?: CloudintegrationtypesGCPServiceMetricsConfigDTO;
}

export interface CloudintegrationtypesServiceConfigDTO {
	aws?: CloudintegrationtypesAWSServiceConfigDTO;
	azure?: CloudintegrationtypesAzureServiceConfigDTO;
	gcp?: CloudintegrationtypesGCPServiceConfigDTO;
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
	storageaccountsblob = 'storageaccountsblob',
	cdnprofile = 'cdnprofile',
	virtualmachine = 'virtualmachine',
	appservice = 'appservice',
	containerapp = 'containerapp',
	aks = 'aks',
	sqldatabase = 'sqldatabase',
	sqldatabasemi = 'sqldatabasemi',
	mysqlflexibleserver = 'mysqlflexibleserver',
	postgresqlflexibleserver = 'postgresqlflexibleserver',
	mongodb = 'mongodb',
	cosmosdb = 'cosmosdb',
	cassandradb = 'cassandradb',
	redis = 'redis',
	cloudsql = 'cloudsql',
}
export type CloudintegrationtypesCloudIntegrationServiceDTOAnyOf = {
	/**
	 * @type string
	 */
	cloudIntegrationId?: string;
	config?: CloudintegrationtypesServiceConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	id: string;
	type?: CloudintegrationtypesServiceIDDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
};

/**
 * @nullable
 */
export type CloudintegrationtypesCloudIntegrationServiceDTO =
	CloudintegrationtypesCloudIntegrationServiceDTOAnyOf | null;

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

export interface CloudintegrationtypesGCPConnectionArtifactDTO {
	[key: string]: unknown;
}

export interface CloudintegrationtypesConnectionArtifactDTO {
	aws?: CloudintegrationtypesAWSConnectionArtifactDTO;
	azure?: CloudintegrationtypesAzureConnectionArtifactDTO;
	gcp?: CloudintegrationtypesGCPConnectionArtifactDTO;
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

export interface CloudintegrationtypesDataCollectedDTO {
	/**
	 * @type array,null
	 */
	logs?: CloudintegrationtypesCollectedLogAttributeDTO[] | null;
	/**
	 * @type array,null
	 */
	metrics?: CloudintegrationtypesCollectedMetricDTO[] | null;
}

export interface CloudintegrationtypesGCPIntegrationConfigDTO {
	[key: string]: unknown;
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

export type CloudintegrationtypesOldAWSLogsStrategyDTOCloudwatchLogsSubscriptionsItem =
	{
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
	 * @type array,null
	 */
	cloudwatch_logs_subscriptions?:
		| CloudintegrationtypesOldAWSLogsStrategyDTOCloudwatchLogsSubscriptionsItem[]
		| null;
}

export type CloudintegrationtypesOldAWSMetricsStrategyDTOCloudwatchMetricStreamFiltersItem =
	{
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
	 * @type array,null
	 */
	cloudwatch_metric_stream_filters?:
		| CloudintegrationtypesOldAWSMetricsStrategyDTOCloudwatchMetricStreamFiltersItem[]
		| null;
}

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

export type CloudintegrationtypesIntegrationConfigDTOAnyOf = {
	/**
	 * @type array
	 */
	enabled_regions: string[];
	telemetry: CloudintegrationtypesOldAWSCollectionStrategyDTO;
};

/**
 * @nullable
 */
export type CloudintegrationtypesIntegrationConfigDTO =
	CloudintegrationtypesIntegrationConfigDTOAnyOf | null;

export interface CloudintegrationtypesProviderIntegrationConfigDTO {
	aws?: CloudintegrationtypesAWSIntegrationConfigDTO;
	azure?: CloudintegrationtypesAzureIntegrationConfigDTO;
	gcp?: CloudintegrationtypesGCPIntegrationConfigDTO;
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
	integration_config: CloudintegrationtypesIntegrationConfigDTO | null;
	integrationConfig: CloudintegrationtypesProviderIntegrationConfigDTO;
	/**
	 * @type string
	 */
	providerAccountId: string;
	/**
	 * @type string,null
	 * @format date-time
	 */
	removed_at: string | null;
	/**
	 * @type string,null
	 * @format date-time
	 */
	removedAt: string | null;
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

export interface CloudintegrationtypesGettableServicesMetadataDTO {
	/**
	 * @type array
	 */
	services: CloudintegrationtypesServiceMetadataDTO[];
}

export interface CloudintegrationtypesPostableAccountConfigDTO {
	aws?: CloudintegrationtypesAWSPostableAccountConfigDTO;
	azure?: CloudintegrationtypesAzureAccountConfigDTO;
	gcp?: CloudintegrationtypesGCPAccountConfigDTO;
}

export interface CloudintegrationtypesPostableAccountDTO {
	config: CloudintegrationtypesPostableAccountConfigDTO;
	credentials: CloudintegrationtypesCredentialsDTO;
}

export type CloudintegrationtypesPostableAgentCheckInDTODataAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type CloudintegrationtypesPostableAgentCheckInDTOData =
	CloudintegrationtypesPostableAgentCheckInDTODataAnyOf | null;

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
	 * @type object,null
	 */
	data: CloudintegrationtypesPostableAgentCheckInDTOData;
	/**
	 * @type string
	 */
	providerAccountId?: string;
}

export interface CloudintegrationtypesStorableIntegrationDashboardDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string
	 */
	dashboardId: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	provider: string;
	/**
	 * @type string
	 */
	slug: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
}

export interface CloudintegrationtypesServiceDashboardDTO {
	/**
	 * @type string
	 */
	description: string;
	integrationDashboard?: CloudintegrationtypesStorableIntegrationDashboardDTO;
	/**
	 * @type string
	 */
	title: string;
}

export interface CloudintegrationtypesServiceAssetsDTO {
	/**
	 * @type array
	 */
	dashboards: CloudintegrationtypesServiceDashboardDTO[];
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

export interface CloudintegrationtypesServiceDTO {
	assets: CloudintegrationtypesServiceAssetsDTO;
	cloudIntegrationService: CloudintegrationtypesCloudIntegrationServiceDTO | null;
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
	/**
	 * @type string
	 */
	title: string;
}

export interface CloudintegrationtypesUpdatableAzureAccountConfigDTO {
	/**
	 * @type array
	 */
	resourceGroups: string[];
}

export interface CloudintegrationtypesUpdatableGCPAccountConfigDTO {
	/**
	 * @type string
	 */
	deploymentProjectId: string;
	/**
	 * @type string
	 */
	deploymentRegion: string;
	/**
	 * @type array,null
	 */
	projectIds: string[] | null;
}

export interface CloudintegrationtypesUpdatableAccountConfigDTO {
	aws?: CloudintegrationtypesAWSAccountConfigDTO;
	azure?: CloudintegrationtypesUpdatableAzureAccountConfigDTO;
	gcp?: CloudintegrationtypesUpdatableGCPAccountConfigDTO;
}

export interface CloudintegrationtypesUpdatableAccountDTO {
	config: CloudintegrationtypesUpdatableAccountConfigDTO;
}

export interface CloudintegrationtypesUpdatableServiceDTO {
	config: CloudintegrationtypesServiceConfigDTO;
}

export interface CommonDisplayDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name?: string;
}

export interface CommonJSONRefDTO {
	/**
	 * @type string
	 */
	$ref?: string;
}

export interface DashboardGridItemDTO {
	content?: CommonJSONRefDTO;
	/**
	 * @type integer
	 */
	height?: number;
	/**
	 * @type integer
	 */
	width?: number;
	/**
	 * @type integer
	 */
	x?: number;
	/**
	 * @type integer
	 */
	y?: number;
}

export interface DashboardGridLayoutCollapseDTO {
	/**
	 * @type boolean
	 */
	open?: boolean;
}

export interface DashboardGridLayoutDisplayDTO {
	collapse?: DashboardGridLayoutCollapseDTO;
	/**
	 * @type string
	 */
	title?: string;
}

export interface DashboardGridLayoutSpecDTO {
	display?: DashboardGridLayoutDisplayDTO;
	/**
	 * @type array,null
	 */
	items?: DashboardGridItemDTO[] | null;
	/**
	 * @type string
	 */
	repeatVariable?: string;
}

export interface DashboardLinkDTO {
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type boolean
	 */
	renderVariables?: boolean;
	/**
	 * @type boolean
	 */
	targetBlank?: boolean;
	/**
	 * @type string
	 */
	tooltip?: string;
	/**
	 * @type string
	 */
	url?: string;
}

export interface DashboardtypesAxesDTO {
	/**
	 * @type boolean
	 */
	isLogScale?: boolean;
	/**
	 * @type number,null
	 */
	softMax?: number | null;
	/**
	 * @type number,null
	 */
	softMin?: number | null;
}

export enum DashboardtypesPrecisionOptionDTO {
	NUMBER_0 = '0',
	NUMBER_1 = '1',
	NUMBER_2 = '2',
	NUMBER_3 = '3',
	NUMBER_4 = '4',
	full = 'full',
}
export interface DashboardtypesPanelFormattingDTO {
	decimalPrecision?: DashboardtypesPrecisionOptionDTO;
	/**
	 * @type string
	 */
	unit?: string;
}

export enum DashboardtypesLegendModeDTO {
	list = 'list',
}
export enum DashboardtypesLegendPositionDTO {
	bottom = 'bottom',
	right = 'right',
}
export type DashboardtypesLegendDTOCustomColorsAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type DashboardtypesLegendDTOCustomColors =
	DashboardtypesLegendDTOCustomColorsAnyOf | null;

export interface DashboardtypesLegendDTO {
	/**
	 * @type object,null
	 */
	customColors?: DashboardtypesLegendDTOCustomColors;
	mode?: DashboardtypesLegendModeDTO;
	position?: DashboardtypesLegendPositionDTO;
}

export interface DashboardtypesThresholdWithLabelDTO {
	/**
	 * @type string
	 */
	color: string;
	/**
	 * @type string
	 */
	label?: string;
	/**
	 * @type string
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 */
	value: number;
}

export enum DashboardtypesTimePreferenceDTO {
	global_time = 'global_time',
	last_5_min = 'last_5_min',
	last_15_min = 'last_15_min',
	last_30_min = 'last_30_min',
	last_1_hr = 'last_1_hr',
	last_6_hr = 'last_6_hr',
	last_1_day = 'last_1_day',
	last_3_days = 'last_3_days',
	last_1_week = 'last_1_week',
	last_1_month = 'last_1_month',
}
export interface DashboardtypesBarChartVisualizationDTO {
	/**
	 * @type boolean
	 */
	fillSpans?: boolean;
	/**
	 * @type boolean
	 */
	stackedBarChart?: boolean;
	timePreference?: DashboardtypesTimePreferenceDTO;
}

export interface DashboardtypesBarChartPanelSpecDTO {
	axes?: DashboardtypesAxesDTO;
	formatting?: DashboardtypesPanelFormattingDTO;
	legend?: DashboardtypesLegendDTO;
	/**
	 * @type array,null
	 */
	thresholds?: DashboardtypesThresholdWithLabelDTO[] | null;
	visualization?: DashboardtypesBarChartVisualizationDTO;
}

export interface DashboardtypesBasicVisualizationDTO {
	timePreference?: DashboardtypesTimePreferenceDTO;
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

export interface Querybuildertypesv5FilterDTO {
	/**
	 * @type string
	 */
	expression?: string;
}

export type Querybuildertypesv5FunctionArgDTOValue = number | string;

export interface Querybuildertypesv5FunctionArgDTO {
	/**
	 * @type string
	 */
	name?: string;
	value?: Querybuildertypesv5FunctionArgDTOValue;
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
export interface Querybuildertypesv5FunctionDTO {
	/**
	 * @type array
	 */
	args?: Querybuildertypesv5FunctionArgDTO[];
	name?: Querybuildertypesv5FunctionNameDTO;
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
export enum TelemetrytypesSignalDTO {
	traces = 'traces',
	logs = 'logs',
	metrics = 'metrics',
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

export interface Querybuildertypesv5LimitByDTO {
	/**
	 * @type array,null
	 */
	keys?: string[] | null;
	/**
	 * @type string
	 */
	value?: string;
}

export enum Querybuildertypesv5OrderDirectionDTO {
	asc = 'asc',
	desc = 'desc',
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

export interface Querybuildertypesv5OrderByDTO {
	direction?: Querybuildertypesv5OrderDirectionDTO;
	key?: Querybuildertypesv5OrderByKeyDTO;
}

/**
 * Step interval. Accepts a Go duration string (e.g., "60s", "1m", "1h") or a number representing seconds (e.g., 60).
 */
export type Querybuildertypesv5StepDTO = string | number;

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

export enum Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal {
	logs = 'logs',
}
export enum TelemetrytypesSourceDTO {
	meter = 'meter',
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
	/**
	 * @enum logs
	 * @type string
	 */
	signal: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal;
	source?: TelemetrytypesSourceDTO;
	stepInterval?: Querybuildertypesv5StepDTO;
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

export enum Querybuildertypesv5ReduceToDTO {
	sum = 'sum',
	count = 'count',
	avg = 'avg',
	min = 'min',
	max = 'max',
	last = 'last',
	median = 'median',
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

export enum Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal {
	metrics = 'metrics',
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
	/**
	 * @enum metrics
	 * @type string
	 */
	signal: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal;
	source?: TelemetrytypesSourceDTO;
	stepInterval?: Querybuildertypesv5StepDTO;
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

export enum Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal {
	traces = 'traces',
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
	/**
	 * @enum traces
	 * @type string
	 */
	signal: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal;
	source?: TelemetrytypesSourceDTO;
	stepInterval?: Querybuildertypesv5StepDTO;
}

export type DashboardtypesBuilderQuerySpecDTO =
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO;

export enum DashboardtypesComparisonOperatorDTO {
	above = 'above',
	below = 'below',
	above_or_equal = 'above_or_equal',
	below_or_equal = 'below_or_equal',
	equal = 'equal',
	not_equal = 'not_equal',
}
export enum DashboardtypesThresholdFormatDTO {
	text = 'text',
	background = 'background',
}
export interface DashboardtypesComparisonThresholdDTO {
	/**
	 * @type string
	 */
	color: string;
	format?: DashboardtypesThresholdFormatDTO;
	operator?: DashboardtypesComparisonOperatorDTO;
	/**
	 * @type string
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 */
	value: number;
}

export interface DashboardtypesCustomVariableSpecDTO {
	/**
	 * @type string
	 */
	customValue: string;
}

export interface DashboardtypesStorableDashboardDataDTO {
	[key: string]: unknown;
}

export enum DashboardtypesSourceDTO {
	user = 'user',
	system = 'system',
	integration = 'integration',
}
export interface DashboardtypesDashboardDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	source?: DashboardtypesSourceDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface DashboardtypesDashboardPanelRefDTO {
	/**
	 * @type string
	 */
	dashboardId: string;
	/**
	 * @type string
	 */
	dashboardName: string;
	/**
	 * @type array
	 */
	filterBy?: string[];
	/**
	 * @type array
	 */
	groupBy?: string[];
	/**
	 * @type string
	 */
	panelId: string;
	/**
	 * @type string
	 */
	panelName: string;
}

export enum DashboardtypesDatasourcePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesSigNozDatasourceSpecDTOKind {
	'signoz/Datasource' = 'signoz/Datasource',
}
export interface DashboardtypesSigNozDatasourceSpecDTO {
	[key: string]: unknown;
}

export interface DashboardtypesDatasourcePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesSigNozDatasourceSpecDTO {
	/**
	 * @enum signoz/Datasource
	 * @type string
	 */
	kind: DashboardtypesDatasourcePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesSigNozDatasourceSpecDTOKind;
	spec: DashboardtypesSigNozDatasourceSpecDTO;
}

export type DashboardtypesDatasourcePluginDTO =
	DashboardtypesDatasourcePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesSigNozDatasourceSpecDTO;

export interface DashboardtypesDatasourceSpecDTO {
	/**
	 * @type boolean
	 */
	default?: boolean;
	display?: CommonDisplayDTO;
	plugin?: DashboardtypesDatasourcePluginDTO;
}

export type DashboardtypesDashboardSpecDTODatasources = {
	[key: string]: DashboardtypesDatasourceSpecDTO;
};

export enum DashboardtypesPanelKindDTO {
	Panel = 'Panel',
}
export interface DashboardtypesDisplayDTO {
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name: string;
}

export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind {
	'signoz/TimeSeriesPanel' = 'signoz/TimeSeriesPanel',
}
export enum DashboardtypesFillModeDTO {
	solid = 'solid',
	gradient = 'gradient',
	none = 'none',
}
export enum DashboardtypesLineInterpolationDTO {
	linear = 'linear',
	spline = 'spline',
	step_after = 'step_after',
	step_before = 'step_before',
}
export enum DashboardtypesLineStyleDTO {
	solid = 'solid',
	dashed = 'dashed',
}
export interface DashboardtypesSpanGapsDTO {
	/**
	 * @type string
	 * @description The maximum gap size to connect when fillOnlyBelow is true. Gaps larger than this duration are left disconnected.
	 */
	fillLessThan?: string;
	/**
	 * @type boolean
	 * @description Controls whether lines connect across null values. When false (default), all gaps are connected. When true, only gaps smaller than fillLessThan are connected.
	 */
	fillOnlyBelow?: boolean;
}

export interface DashboardtypesTimeSeriesChartAppearanceDTO {
	fillMode?: DashboardtypesFillModeDTO;
	lineInterpolation?: DashboardtypesLineInterpolationDTO;
	lineStyle?: DashboardtypesLineStyleDTO;
	/**
	 * @type boolean
	 */
	showPoints?: boolean;
	spanGaps?: DashboardtypesSpanGapsDTO;
}

export interface DashboardtypesTimeSeriesVisualizationDTO {
	/**
	 * @type boolean
	 */
	fillSpans?: boolean;
	timePreference?: DashboardtypesTimePreferenceDTO;
}

export interface DashboardtypesTimeSeriesPanelSpecDTO {
	axes?: DashboardtypesAxesDTO;
	chartAppearance?: DashboardtypesTimeSeriesChartAppearanceDTO;
	formatting?: DashboardtypesPanelFormattingDTO;
	legend?: DashboardtypesLegendDTO;
	/**
	 * @type array,null
	 */
	thresholds?: DashboardtypesThresholdWithLabelDTO[] | null;
	visualization?: DashboardtypesTimeSeriesVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTO {
	/**
	 * @enum signoz/TimeSeriesPanel
	 * @type string
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind;
	spec: DashboardtypesTimeSeriesPanelSpecDTO;
}

export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind {
	'signoz/BarChartPanel' = 'signoz/BarChartPanel',
}
export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTO {
	/**
	 * @enum signoz/BarChartPanel
	 * @type string
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind;
	spec: DashboardtypesBarChartPanelSpecDTO;
}

export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind {
	'signoz/NumberPanel' = 'signoz/NumberPanel',
}
export interface DashboardtypesNumberPanelSpecDTO {
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @type array,null
	 */
	thresholds?: DashboardtypesComparisonThresholdDTO[] | null;
	visualization?: DashboardtypesBasicVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTO {
	/**
	 * @enum signoz/NumberPanel
	 * @type string
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind;
	spec: DashboardtypesNumberPanelSpecDTO;
}

export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind {
	'signoz/PieChartPanel' = 'signoz/PieChartPanel',
}
export interface DashboardtypesPieChartPanelSpecDTO {
	formatting?: DashboardtypesPanelFormattingDTO;
	legend?: DashboardtypesLegendDTO;
	visualization?: DashboardtypesBasicVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTO {
	/**
	 * @enum signoz/PieChartPanel
	 * @type string
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind;
	spec: DashboardtypesPieChartPanelSpecDTO;
}

export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind {
	'signoz/TablePanel' = 'signoz/TablePanel',
}
export type DashboardtypesTableFormattingDTOColumnUnitsAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type DashboardtypesTableFormattingDTOColumnUnits =
	DashboardtypesTableFormattingDTOColumnUnitsAnyOf | null;

export interface DashboardtypesTableFormattingDTO {
	/**
	 * @type object,null
	 */
	columnUnits?: DashboardtypesTableFormattingDTOColumnUnits;
	decimalPrecision?: DashboardtypesPrecisionOptionDTO;
}

export interface DashboardtypesTableThresholdDTO {
	/**
	 * @type string
	 */
	color: string;
	/**
	 * @type string
	 */
	columnName: string;
	format?: DashboardtypesThresholdFormatDTO;
	operator?: DashboardtypesComparisonOperatorDTO;
	/**
	 * @type string
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 */
	value: number;
}

export interface DashboardtypesTablePanelSpecDTO {
	formatting?: DashboardtypesTableFormattingDTO;
	/**
	 * @type array,null
	 */
	thresholds?: DashboardtypesTableThresholdDTO[] | null;
	visualization?: DashboardtypesBasicVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTO {
	/**
	 * @enum signoz/TablePanel
	 * @type string
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind;
	spec: DashboardtypesTablePanelSpecDTO;
}

export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTOKind {
	'signoz/HistogramPanel' = 'signoz/HistogramPanel',
}
export interface DashboardtypesHistogramBucketsDTO {
	/**
	 * @type number,null
	 */
	bucketCount?: number | null;
	/**
	 * @type number,null
	 */
	bucketWidth?: number | null;
	/**
	 * @type boolean
	 */
	mergeAllActiveQueries?: boolean;
}

export interface DashboardtypesHistogramPanelSpecDTO {
	histogramBuckets?: DashboardtypesHistogramBucketsDTO;
	legend?: DashboardtypesLegendDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTO {
	/**
	 * @enum signoz/HistogramPanel
	 * @type string
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTOKind;
	spec: DashboardtypesHistogramPanelSpecDTO;
}

export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind {
	'signoz/ListPanel' = 'signoz/ListPanel',
}
export interface DashboardtypesListPanelSpecDTO {
	/**
	 * @type array
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[];
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTO {
	/**
	 * @enum signoz/ListPanel
	 * @type string
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind;
	spec: DashboardtypesListPanelSpecDTO;
}

export type DashboardtypesPanelPluginDTO =
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTO;

export enum Querybuildertypesv5RequestTypeDTO {
	scalar = 'scalar',
	time_series = 'time_series',
	raw = 'raw',
	raw_stream = 'raw_stream',
	trace = 'trace',
}
export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind {
	'signoz/BuilderQuery' = 'signoz/BuilderQuery',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTO {
	/**
	 * @enum signoz/BuilderQuery
	 * @type string
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind;
	spec: DashboardtypesBuilderQuerySpecDTO;
}

export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind {
	'signoz/CompositeQuery' = 'signoz/CompositeQuery',
}
export type Querybuildertypesv5BuilderQuerySpecDTO =
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO;

export enum Querybuildertypesv5QueryEnvelopeBuilderDTOType {
	builder_query = 'builder_query',
}
export interface Querybuildertypesv5QueryEnvelopeBuilderDTO {
	spec?: Querybuildertypesv5BuilderQuerySpecDTO;
	/**
	 * @type string
	 * @enum builder_query
	 */
	type: Querybuildertypesv5QueryEnvelopeBuilderDTOType;
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

export enum Querybuildertypesv5QueryEnvelopeFormulaDTOType {
	builder_formula = 'builder_formula',
}
export interface Querybuildertypesv5QueryEnvelopeFormulaDTO {
	spec?: Querybuildertypesv5QueryBuilderFormulaDTO;
	/**
	 * @type string
	 * @enum builder_formula
	 */
	type: Querybuildertypesv5QueryEnvelopeFormulaDTOType;
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

export enum Querybuildertypesv5QueryEnvelopeTraceOperatorDTOType {
	builder_trace_operator = 'builder_trace_operator',
}
export interface Querybuildertypesv5QueryEnvelopeTraceOperatorDTO {
	spec?: Querybuildertypesv5QueryBuilderTraceOperatorDTO;
	/**
	 * @type string
	 * @enum builder_trace_operator
	 */
	type: Querybuildertypesv5QueryEnvelopeTraceOperatorDTOType;
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

export enum Querybuildertypesv5QueryEnvelopePromQLDTOType {
	promql = 'promql',
}
export interface Querybuildertypesv5QueryEnvelopePromQLDTO {
	spec?: Querybuildertypesv5PromQueryDTO;
	/**
	 * @type string
	 * @enum promql
	 */
	type: Querybuildertypesv5QueryEnvelopePromQLDTOType;
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

export enum Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType {
	clickhouse_sql = 'clickhouse_sql',
}
export interface Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO {
	spec?: Querybuildertypesv5ClickHouseQueryDTO;
	/**
	 * @type string
	 * @enum clickhouse_sql
	 */
	type: Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType;
}

export type Querybuildertypesv5QueryEnvelopeDTO =
	| Querybuildertypesv5QueryEnvelopeBuilderDTO
	| Querybuildertypesv5QueryEnvelopeFormulaDTO
	| Querybuildertypesv5QueryEnvelopeTraceOperatorDTO
	| Querybuildertypesv5QueryEnvelopePromQLDTO
	| Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO;

/**
 * Composite query containing one or more query envelopes. Each query envelope specifies its type and corresponding spec.
 */
export interface Querybuildertypesv5CompositeQueryDTO {
	/**
	 * @type array,null
	 */
	queries?: Querybuildertypesv5QueryEnvelopeDTO[] | null;
}

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTO {
	/**
	 * @enum signoz/CompositeQuery
	 * @type string
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind;
	spec: Querybuildertypesv5CompositeQueryDTO;
}

export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTOKind {
	'signoz/Formula' = 'signoz/Formula',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTO {
	/**
	 * @enum signoz/Formula
	 * @type string
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTOKind;
	spec: Querybuildertypesv5QueryBuilderFormulaDTO;
}

export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTOKind {
	'signoz/PromQLQuery' = 'signoz/PromQLQuery',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTO {
	/**
	 * @enum signoz/PromQLQuery
	 * @type string
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTOKind;
	spec: Querybuildertypesv5PromQueryDTO;
}

export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTOKind {
	'signoz/ClickHouseSQL' = 'signoz/ClickHouseSQL',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTO {
	/**
	 * @enum signoz/ClickHouseSQL
	 * @type string
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTOKind;
	spec: Querybuildertypesv5ClickHouseQueryDTO;
}

export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTOKind {
	'signoz/TraceOperator' = 'signoz/TraceOperator',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTO {
	/**
	 * @enum signoz/TraceOperator
	 * @type string
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTOKind;
	spec: Querybuildertypesv5QueryBuilderTraceOperatorDTO;
}

export type DashboardtypesQueryPluginDTO =
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTO;

export interface DashboardtypesQuerySpecDTO {
	/**
	 * @type string
	 */
	name?: string;
	plugin: DashboardtypesQueryPluginDTO;
}

export interface DashboardtypesQueryDTO {
	kind: Querybuildertypesv5RequestTypeDTO;
	spec: DashboardtypesQuerySpecDTO;
}

export interface DashboardtypesPanelSpecDTO {
	display: DashboardtypesDisplayDTO;
	/**
	 * @type array
	 */
	links?: DashboardLinkDTO[];
	plugin: DashboardtypesPanelPluginDTO;
	/**
	 * @type array
	 */
	queries: DashboardtypesQueryDTO[];
}

export interface DashboardtypesPanelDTO {
	kind: DashboardtypesPanelKindDTO;
	spec: DashboardtypesPanelSpecDTO;
}

export type DashboardtypesDashboardSpecDTOPanels = {
	[key: string]: DashboardtypesPanelDTO;
};

export enum DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind {
	Grid = 'Grid',
}
export interface DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTO {
	/**
	 * @enum Grid
	 * @type string
	 */
	kind: DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind;
	spec: DashboardGridLayoutSpecDTO;
}

export type DashboardtypesLayoutDTO =
	DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTO;

export enum DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind {
	ListVariable = 'ListVariable',
}
export type DashboardtypesVariableDefaultValueDTO = string | string[];

export enum DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind {
	'signoz/DynamicVariable' = 'signoz/DynamicVariable',
}
export interface DashboardtypesDynamicVariableSpecDTO {
	/**
	 * @type string
	 */
	name: string;
	signal?: TelemetrytypesSignalDTO;
}

export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTO {
	/**
	 * @enum signoz/DynamicVariable
	 * @type string
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind;
	spec: DashboardtypesDynamicVariableSpecDTO;
}

export enum DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind {
	'signoz/QueryVariable' = 'signoz/QueryVariable',
}
export interface DashboardtypesQueryVariableSpecDTO {
	/**
	 * @type string
	 */
	queryValue: string;
}

export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTO {
	/**
	 * @enum signoz/QueryVariable
	 * @type string
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind;
	spec: DashboardtypesQueryVariableSpecDTO;
}

export enum DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind {
	'signoz/CustomVariable' = 'signoz/CustomVariable',
}
export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTO {
	/**
	 * @enum signoz/CustomVariable
	 * @type string
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind;
	spec: DashboardtypesCustomVariableSpecDTO;
}

export type DashboardtypesVariablePluginDTO =
	| DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTO
	| DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTO
	| DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTO;

export enum DashboardtypesListVariableSpecSortDTO {
	none = 'none',
	'alphabetical-asc' = 'alphabetical-asc',
	'alphabetical-desc' = 'alphabetical-desc',
	'numerical-asc' = 'numerical-asc',
	'numerical-desc' = 'numerical-desc',
	'alphabetical-ci-asc' = 'alphabetical-ci-asc',
	'alphabetical-ci-desc' = 'alphabetical-ci-desc',
}
export interface DashboardtypesListVariableSpecDTO {
	/**
	 * @type boolean
	 */
	allowAllValue?: boolean;
	/**
	 * @type boolean
	 */
	allowMultiple?: boolean;
	/**
	 * @type string
	 */
	capturingRegexp?: string;
	/**
	 * @type string
	 */
	customAllValue?: string;
	defaultValue?: DashboardtypesVariableDefaultValueDTO;
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 * @minLength 1
	 */
	name: string;
	plugin?: DashboardtypesVariablePluginDTO;
	sort?: DashboardtypesListVariableSpecSortDTO;
}

export interface DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTO {
	/**
	 * @enum ListVariable
	 * @type string
	 */
	kind: DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind;
	spec: DashboardtypesListVariableSpecDTO;
}

export enum DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind {
	TextVariable = 'TextVariable',
}
export interface DashboardtypesTextVariableSpecDTO {
	/**
	 * @type boolean
	 */
	constant?: boolean;
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 * @minLength 1
	 */
	name: string;
	/**
	 * @type string
	 */
	value: string;
}

export interface DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTO {
	/**
	 * @enum TextVariable
	 * @type string
	 */
	kind: DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind;
	spec: DashboardtypesTextVariableSpecDTO;
}

export type DashboardtypesVariableDTO =
	| DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTO
	| DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTO;

export interface DashboardtypesDashboardSpecDTO {
	/**
	 * @type object
	 */
	datasources?: DashboardtypesDashboardSpecDTODatasources;
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 */
	duration?: string;
	/**
	 * @type array
	 */
	layouts: DashboardtypesLayoutDTO[];
	/**
	 * @type array
	 */
	links?: DashboardLinkDTO[];
	/**
	 * @type object
	 */
	panels: DashboardtypesDashboardSpecDTOPanels;
	/**
	 * @type string
	 */
	refreshInterval?: string;
	/**
	 * @type array
	 */
	variables: DashboardtypesVariableDTO[];
}

export enum DashboardtypesListOrderDTO {
	asc = 'asc',
	desc = 'desc',
}
export enum DashboardtypesListSortDTO {
	updated_at = 'updated_at',
	created_at = 'created_at',
	name = 'name',
}
export interface DashboardtypesDashboardViewDataDTO {
	order?: DashboardtypesListOrderDTO;
	/**
	 * @type string
	 */
	query?: string;
	sort?: DashboardtypesListSortDTO;
	/**
	 * @type string
	 */
	version: string;
}

export interface DashboardtypesDashboardViewDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	data: DashboardtypesDashboardViewDataDTO;
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
	 * @format date-time
	 */
	updatedAt?: string;
}

export enum DashboardtypesDatasourcePluginKindDTO {
	'signoz/Datasource' = 'signoz/Datasource',
}
export interface TagtypesGettableTagDTO {
	/**
	 * @type string
	 */
	key: string;
	/**
	 * @type string
	 */
	value: string;
}

export interface DashboardtypesGettableDashboardV2DTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	image?: string;
	/**
	 * @type boolean
	 */
	locked: boolean;
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
	schemaVersion: string;
	source: DashboardtypesSourceDTO;
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 */
	tags: TagtypesGettableTagDTO[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
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

export interface DashboardtypesGettablePublicDashboardDataV2DTO {
	dashboard?: DashboardtypesGettableDashboardV2DTO;
	publicDashboard?: DashboardtypesGettablePublicDasbhboardDTO;
}

export enum DashboardtypesPatchOpDTO {
	add = 'add',
	remove = 'remove',
	replace = 'replace',
	move = 'move',
	copy = 'copy',
	test = 'test',
}
export interface DashboardtypesJSONPatchOperationDTO {
	/**
	 * @type string
	 * @description Source JSON Pointer for move/copy ops; ignored for other ops.
	 */
	from?: string;
	op: DashboardtypesPatchOpDTO;
	/**
	 * @type string
	 * @description JSON Pointer (RFC 6901) into the dashboard's postable shape — e.g. /spec/display/name, /spec/panels/<id>, /spec/panels/<id>/spec/queries/0, /tags/-.
	 */
	path: string;
	/**
	 * @description Value to add/replace/test against. The expected type depends on the path. Common shapes (see referenced schemas for the exact field set): /spec/panels/<id> takes a DashboardtypesPanel; /spec/panels/<id>/spec/queries/N (or /-) takes a DashboardtypesQuery; /spec/variables/N takes a DashboardtypesVariable; /spec/layouts/N takes a DashboardtypesLayout; /tags/N (or /-) takes a TagtypesPostableTag; /spec/display/name and other leaf string fields take a string. Required for add/replace/test; ignored for remove/move/copy.
	 */
	value?: unknown;
}

export interface DashboardtypesListedDashboardV2SpecDTO {
	display?: DashboardtypesDisplayDTO;
}

export interface DashboardtypesListedDashboardForUserV2DTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	image?: string;
	/**
	 * @type boolean
	 */
	locked: boolean;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	orgId: string;
	/**
	 * @type boolean
	 */
	pinned: boolean;
	/**
	 * @type string
	 */
	schemaVersion: string;
	source: DashboardtypesSourceDTO;
	spec: DashboardtypesListedDashboardV2SpecDTO;
	/**
	 * @type array
	 */
	tags: TagtypesGettableTagDTO[];
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface DashboardtypesListableDashboardForUserV2DTO {
	/**
	 * @type array
	 */
	dashboards: DashboardtypesListedDashboardForUserV2DTO[];
	/**
	 * @type array
	 */
	reservedKeywords: string[];
	/**
	 * @type array
	 */
	tags: TagtypesGettableTagDTO[];
	/**
	 * @type integer
	 * @format int64
	 */
	total: number;
}

export interface DashboardtypesListedDashboardV2DTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	image?: string;
	/**
	 * @type boolean
	 */
	locked: boolean;
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
	schemaVersion: string;
	source: DashboardtypesSourceDTO;
	spec: DashboardtypesListedDashboardV2SpecDTO;
	/**
	 * @type array
	 */
	tags: TagtypesGettableTagDTO[];
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface DashboardtypesListableDashboardV2DTO {
	/**
	 * @type array
	 */
	dashboards: DashboardtypesListedDashboardV2DTO[];
	/**
	 * @type array
	 */
	reservedKeywords: string[];
	/**
	 * @type array
	 */
	tags: TagtypesGettableTagDTO[];
	/**
	 * @type integer
	 * @format int64
	 */
	total: number;
}

export interface DashboardtypesListableDashboardViewDTO {
	/**
	 * @type array
	 */
	views: DashboardtypesDashboardViewDTO[];
}

export enum DashboardtypesPanelPluginKindDTO {
	'signoz/TimeSeriesPanel' = 'signoz/TimeSeriesPanel',
	'signoz/BarChartPanel' = 'signoz/BarChartPanel',
	'signoz/NumberPanel' = 'signoz/NumberPanel',
	'signoz/PieChartPanel' = 'signoz/PieChartPanel',
	'signoz/TablePanel' = 'signoz/TablePanel',
	'signoz/HistogramPanel' = 'signoz/HistogramPanel',
	'signoz/ListPanel' = 'signoz/ListPanel',
}
/**
 * @nullable
 */
export type DashboardtypesPatchableDashboardV2DTO =
	| DashboardtypesJSONPatchOperationDTO[]
	| null;

export interface TagtypesPostableTagDTO {
	/**
	 * @type string
	 */
	key: string;
	/**
	 * @type string
	 */
	value: string;
}

export interface DashboardtypesPostableDashboardV2DTO {
	/**
	 * @type boolean
	 */
	generateName?: boolean;
	/**
	 * @type string
	 */
	image?: string;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	schemaVersion: string;
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 */
	tags: TagtypesPostableTagDTO[] | null;
}

export interface DashboardtypesPostableDashboardViewDTO {
	data: DashboardtypesDashboardViewDataDTO;
	/**
	 * @type string
	 */
	name: string;
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

export enum DashboardtypesQueryPluginKindDTO {
	'signoz/BuilderQuery' = 'signoz/BuilderQuery',
	'signoz/CompositeQuery' = 'signoz/CompositeQuery',
	'signoz/Formula' = 'signoz/Formula',
	'signoz/PromQLQuery' = 'signoz/PromQLQuery',
	'signoz/ClickHouseSQL' = 'signoz/ClickHouseSQL',
	'signoz/TraceOperator' = 'signoz/TraceOperator',
}
export interface DashboardtypesUpdatableDashboardV2DTO {
	/**
	 * @type string
	 */
	image?: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	schemaVersion: string;
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 */
	tags: TagtypesPostableTagDTO[] | null;
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

export enum DashboardtypesVariablePluginKindDTO {
	'signoz/DynamicVariable' = 'signoz/DynamicVariable',
	'signoz/QueryVariable' = 'signoz/QueryVariable',
	'signoz/CustomVariable' = 'signoz/CustomVariable',
}
export type FactoryResponseDTOServicesAnyOf = { [key: string]: string[] };

/**
 * @nullable
 */
export type FactoryResponseDTOServices = FactoryResponseDTOServicesAnyOf | null;

export interface FactoryResponseDTO {
	/**
	 * @type boolean
	 */
	healthy?: boolean;
	/**
	 * @type object,null
	 */
	services?: FactoryResponseDTOServices;
}

export type FeaturetypesGettableFeatureDTOVariantsAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type FeaturetypesGettableFeatureDTOVariants =
	FeaturetypesGettableFeatureDTOVariantsAnyOf | null;

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
	 * @type object,null
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

export interface GatewaytypesLimitValueDTO {
	/**
	 * @type integer,null
	 */
	count?: number | null;
	/**
	 * @type integer,null
	 */
	size?: number | null;
}

export interface GatewaytypesLimitConfigDTO {
	day?: GatewaytypesLimitValueDTO;
	second?: GatewaytypesLimitValueDTO;
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

export interface GatewaytypesLimitMetricDTO {
	day?: GatewaytypesLimitMetricValueDTO;
	second?: GatewaytypesLimitMetricValueDTO;
}

export interface GatewaytypesLimitDTO {
	config?: GatewaytypesLimitConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	created_at?: string;
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
	 * @type array,null
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updated_at?: string;
}

export interface GatewaytypesIngestionKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	created_at?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	expires_at?: string;
	/**
	 * @type string
	 */
	id?: string;
	/**
	 * @type array,null
	 */
	limits?: GatewaytypesLimitDTO[] | null;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type array,null
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updated_at?: string;
	/**
	 * @type string
	 */
	value?: string;
	/**
	 * @type string
	 */
	workspace_id?: string;
}

export interface GatewaytypesGettableIngestionKeysDTO {
	_pagination?: GatewaytypesPaginationDTO;
	/**
	 * @type array,null
	 */
	keys?: GatewaytypesIngestionKeyDTO[] | null;
}

export interface GatewaytypesPostableIngestionKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	expires_at?: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type array,null
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
	 * @type array,null
	 */
	tags?: string[] | null;
}

export interface GatewaytypesUpdatableIngestionKeyLimitDTO {
	config: GatewaytypesLimitConfigDTO;
	/**
	 * @type array,null
	 */
	tags?: string[] | null;
}

export interface GlobaltypesAPIKeyConfigDTO {
	/**
	 * @type boolean
	 */
	enabled?: boolean;
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

export interface GlobaltypesIdentNConfigDTO {
	apikey?: GlobaltypesAPIKeyConfigDTO;
	impersonation?: GlobaltypesImpersonationConfigDTO;
	tokenizer?: GlobaltypesTokenizerConfigDTO;
}

export interface GlobaltypesConfigDTO {
	/**
	 * @type string,null
	 */
	ai_assistant_url: string | null;
	/**
	 * @type string
	 */
	external_url: string;
	identN?: GlobaltypesIdentNConfigDTO;
	/**
	 * @type string
	 */
	ingestion_url: string;
	/**
	 * @type string,null
	 */
	mcp_url: string | null;
}

export enum InframonitoringtypesCheckComponentTypeDTO {
	receiver = 'receiver',
	processor = 'processor',
}
export interface InframonitoringtypesAssociatedComponentDTO {
	/**
	 * @type string
	 */
	name: string;
	type: InframonitoringtypesCheckComponentTypeDTO;
}

export interface InframonitoringtypesAttributesComponentEntryDTO {
	associatedComponent: InframonitoringtypesAssociatedComponentDTO;
	/**
	 * @type array,null
	 */
	attributes: string[] | null;
}

export enum InframonitoringtypesCheckTypeDTO {
	hosts = 'hosts',
	processes = 'processes',
	pods = 'pods',
	nodes = 'nodes',
	deployments = 'deployments',
	daemonsets = 'daemonsets',
	statefulsets = 'statefulsets',
	jobs = 'jobs',
	namespaces = 'namespaces',
	clusters = 'clusters',
	volumes = 'volumes',
}
export interface InframonitoringtypesMissingMetricsComponentEntryDTO {
	associatedComponent: InframonitoringtypesAssociatedComponentDTO;
	/**
	 * @type string
	 */
	documentationLink: string;
	/**
	 * @type string
	 */
	message: string;
	/**
	 * @type array,null
	 */
	metrics: string[] | null;
}

export interface InframonitoringtypesMissingAttributesComponentEntryDTO {
	associatedComponent: InframonitoringtypesAssociatedComponentDTO;
	/**
	 * @type array,null
	 */
	attributes: string[] | null;
	/**
	 * @type string
	 */
	documentationLink: string;
	/**
	 * @type string
	 */
	message: string;
}

export interface InframonitoringtypesMetricsComponentEntryDTO {
	associatedComponent: InframonitoringtypesAssociatedComponentDTO;
	/**
	 * @type array,null
	 */
	metrics: string[] | null;
}

export interface InframonitoringtypesChecksDTO {
	/**
	 * @type array,null
	 */
	missingDefaultEnabledMetrics:
		| InframonitoringtypesMissingMetricsComponentEntryDTO[]
		| null;
	/**
	 * @type array,null
	 */
	missingOptionalMetrics:
		| InframonitoringtypesMissingMetricsComponentEntryDTO[]
		| null;
	/**
	 * @type array,null
	 */
	missingRequiredAttributes:
		| InframonitoringtypesMissingAttributesComponentEntryDTO[]
		| null;
	/**
	 * @type array,null
	 */
	presentDefaultEnabledMetrics:
		| InframonitoringtypesMetricsComponentEntryDTO[]
		| null;
	/**
	 * @type array,null
	 */
	presentOptionalMetrics: InframonitoringtypesMetricsComponentEntryDTO[] | null;
	/**
	 * @type array,null
	 */
	presentRequiredAttributes:
		| InframonitoringtypesAttributesComponentEntryDTO[]
		| null;
	/**
	 * @type boolean
	 */
	ready: boolean;
	type: InframonitoringtypesCheckTypeDTO;
}

export type InframonitoringtypesClusterRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesClusterRecordDTOMeta =
	InframonitoringtypesClusterRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesNodeCountsByReadinessDTO {
	/**
	 * @type integer
	 */
	notReady: number;
	/**
	 * @type integer
	 */
	ready: number;
}

export interface InframonitoringtypesPodCountsByPhaseDTO {
	/**
	 * @type integer
	 */
	failed: number;
	/**
	 * @type integer
	 */
	pending: number;
	/**
	 * @type integer
	 */
	running: number;
	/**
	 * @type integer
	 */
	succeeded: number;
	/**
	 * @type integer
	 */
	unknown: number;
}

export interface InframonitoringtypesPodCountsByStatusDTO {
	/**
	 * @type integer
	 */
	completed: number;
	/**
	 * @type integer
	 */
	containerCannotRun: number;
	/**
	 * @type integer
	 */
	containerCreating: number;
	/**
	 * @type integer
	 */
	crashLoopBackOff: number;
	/**
	 * @type integer
	 */
	createContainerConfigError: number;
	/**
	 * @type integer
	 */
	errImagePull: number;
	/**
	 * @type integer
	 */
	error: number;
	/**
	 * @type integer
	 */
	evicted: number;
	/**
	 * @type integer
	 */
	failed: number;
	/**
	 * @type integer
	 */
	imagePullBackOff: number;
	/**
	 * @type integer
	 */
	nodeAffinity: number;
	/**
	 * @type integer
	 */
	nodeLost: number;
	/**
	 * @type integer
	 */
	oomKilled: number;
	/**
	 * @type integer
	 */
	pending: number;
	/**
	 * @type integer
	 */
	running: number;
	/**
	 * @type integer
	 */
	shutdown: number;
	/**
	 * @type integer
	 */
	unexpectedAdmissionError: number;
	/**
	 * @type integer
	 */
	unknown: number;
}

export interface InframonitoringtypesClusterRecordDTO {
	/**
	 * @type number
	 * @format double
	 */
	clusterCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	clusterCPUAllocatable: number;
	/**
	 * @type number
	 * @format double
	 */
	clusterMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	clusterMemoryAllocatable: number;
	/**
	 * @type string
	 */
	clusterName: string;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesClusterRecordDTOMeta;
	nodeCountsByReadiness: InframonitoringtypesNodeCountsByReadinessDTO;
	podCountsByPhase: InframonitoringtypesPodCountsByPhaseDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}

export enum InframonitoringtypesResponseTypeDTO {
	list = 'list',
	grouped_list = 'grouped_list',
}
export interface Querybuildertypesv5QueryWarnDataAdditionalDTO {
	/**
	 * @type string
	 */
	message?: string;
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

export interface InframonitoringtypesClustersDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesClusterRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export type InframonitoringtypesDaemonSetRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesDaemonSetRecordDTOMeta =
	InframonitoringtypesDaemonSetRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesDaemonSetRecordDTO {
	/**
	 * @type integer
	 */
	currentNodes: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetCPURequest: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	daemonSetMemoryRequest: number;
	/**
	 * @type string
	 */
	daemonSetName: string;
	/**
	 * @type integer
	 */
	desiredNodes: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesDaemonSetRecordDTOMeta;
	podCountsByPhase: InframonitoringtypesPodCountsByPhaseDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}

export interface InframonitoringtypesDaemonSetsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesDaemonSetRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export type InframonitoringtypesDeploymentRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesDeploymentRecordDTOMeta =
	InframonitoringtypesDeploymentRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesDeploymentRecordDTO {
	/**
	 * @type integer
	 */
	availablePods: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentCPURequest: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	deploymentMemoryRequest: number;
	/**
	 * @type string
	 */
	deploymentName: string;
	/**
	 * @type integer
	 */
	desiredPods: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesDeploymentRecordDTOMeta;
	podCountsByPhase: InframonitoringtypesPodCountsByPhaseDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}

export interface InframonitoringtypesDeploymentsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesDeploymentRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export enum InframonitoringtypesHostStatusDTO {
	active = 'active',
	inactive = 'inactive',
	'' = '',
}
export interface InframonitoringtypesHostFilterDTO {
	/**
	 * @type string
	 */
	expression?: string;
	filterByStatus?: InframonitoringtypesHostStatusDTO;
}

export type InframonitoringtypesHostRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesHostRecordDTOMeta =
	InframonitoringtypesHostRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesHostRecordDTO {
	/**
	 * @type integer
	 */
	activeHostCount: number;
	/**
	 * @type number
	 * @format double
	 */
	cpu: number;
	/**
	 * @type number
	 * @format double
	 */
	diskUsage: number;
	/**
	 * @type string
	 */
	hostName: string;
	/**
	 * @type integer
	 */
	inactiveHostCount: number;
	/**
	 * @type number
	 * @format double
	 */
	load15: number;
	/**
	 * @type number
	 * @format double
	 */
	memory: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesHostRecordDTOMeta;
	status: InframonitoringtypesHostStatusDTO;
	/**
	 * @type number
	 * @format double
	 */
	wait: number;
}

export interface InframonitoringtypesHostsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesHostRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export type InframonitoringtypesJobRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesJobRecordDTOMeta =
	InframonitoringtypesJobRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesJobRecordDTO {
	/**
	 * @type integer
	 */
	activePods: number;
	/**
	 * @type integer
	 */
	desiredSuccessfulPods: number;
	/**
	 * @type integer
	 */
	failedPods: number;
	/**
	 * @type number
	 * @format double
	 */
	jobCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	jobCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	jobCPURequest: number;
	/**
	 * @type number
	 * @format double
	 */
	jobMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	jobMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	jobMemoryRequest: number;
	/**
	 * @type string
	 */
	jobName: string;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesJobRecordDTOMeta;
	podCountsByPhase: InframonitoringtypesPodCountsByPhaseDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
	/**
	 * @type integer
	 */
	successfulPods: number;
}

export interface InframonitoringtypesJobsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesJobRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export type InframonitoringtypesNamespaceRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesNamespaceRecordDTOMeta =
	InframonitoringtypesNamespaceRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesNamespaceRecordDTO {
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesNamespaceRecordDTOMeta;
	/**
	 * @type number
	 * @format double
	 */
	namespaceCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	namespaceMemory: number;
	/**
	 * @type string
	 */
	namespaceName: string;
	podCountsByPhase: InframonitoringtypesPodCountsByPhaseDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}

export interface InframonitoringtypesNamespacesDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesNamespaceRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export enum InframonitoringtypesNodeConditionDTO {
	ready = 'ready',
	not_ready = 'not_ready',
	no_data = 'no_data',
}
export type InframonitoringtypesNodeRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesNodeRecordDTOMeta =
	InframonitoringtypesNodeRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesNodeRecordDTO {
	condition: InframonitoringtypesNodeConditionDTO;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesNodeRecordDTOMeta;
	/**
	 * @type number
	 * @format double
	 */
	nodeCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	nodeCPUAllocatable: number;
	nodeCountsByReadiness: InframonitoringtypesNodeCountsByReadinessDTO;
	/**
	 * @type number
	 * @format double
	 */
	nodeMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	nodeMemoryAllocatable: number;
	/**
	 * @type string
	 */
	nodeName: string;
	podCountsByPhase: InframonitoringtypesPodCountsByPhaseDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}

export interface InframonitoringtypesNodesDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesNodeRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export enum InframonitoringtypesPodPhaseDTO {
	pending = 'pending',
	running = 'running',
	succeeded = 'succeeded',
	failed = 'failed',
	unknown = 'unknown',
	no_data = 'no_data',
}
export type InframonitoringtypesPodRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesPodRecordDTOMeta =
	InframonitoringtypesPodRecordDTOMetaAnyOf | null;

export enum InframonitoringtypesPodStatusDTO {
	pending = 'pending',
	running = 'running',
	failed = 'failed',
	unknown = 'unknown',
	crashloopbackoff = 'crashloopbackoff',
	imagepullbackoff = 'imagepullbackoff',
	errimagepull = 'errimagepull',
	createcontainerconfigerror = 'createcontainerconfigerror',
	containercreating = 'containercreating',
	oomkilled = 'oomkilled',
	completed = 'completed',
	error = 'error',
	containercannotrun = 'containercannotrun',
	evicted = 'evicted',
	nodeaffinity = 'nodeaffinity',
	nodelost = 'nodelost',
	shutdown = 'shutdown',
	unexpectedadmissionerror = 'unexpectedadmissionerror',
	no_data = 'no_data',
}
export interface InframonitoringtypesPodRecordDTO {
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesPodRecordDTOMeta;
	/**
	 * @type integer
	 * @format int64
	 */
	podAge: number;
	/**
	 * @type number
	 * @format double
	 */
	podCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	podCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	podCPURequest: number;
	podCountsByPhase: InframonitoringtypesPodCountsByPhaseDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
	/**
	 * @type number
	 * @format double
	 */
	podMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	podMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	podMemoryRequest: number;
	podPhase: InframonitoringtypesPodPhaseDTO;
	/**
	 * @type integer
	 * @format int64
	 */
	podRestarts: number;
	podStatus: InframonitoringtypesPodStatusDTO;
	/**
	 * @type string
	 */
	podUID: string;
}

export interface InframonitoringtypesPodsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesPodRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export interface InframonitoringtypesPostableClustersDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostableDaemonSetsDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostableDeploymentsDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostableHostsDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: InframonitoringtypesHostFilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostableJobsDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostableNamespacesDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostableNodesDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostablePodsDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostableStatefulSetsDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export interface InframonitoringtypesPostableVolumesDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
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

export type InframonitoringtypesStatefulSetRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesStatefulSetRecordDTOMeta =
	InframonitoringtypesStatefulSetRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesStatefulSetRecordDTO {
	/**
	 * @type integer
	 */
	currentPods: number;
	/**
	 * @type integer
	 */
	desiredPods: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesStatefulSetRecordDTOMeta;
	podCountsByPhase: InframonitoringtypesPodCountsByPhaseDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetCPU: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetCPULimit: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetCPURequest: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetMemory: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetMemoryLimit: number;
	/**
	 * @type number
	 * @format double
	 */
	statefulSetMemoryRequest: number;
	/**
	 * @type string
	 */
	statefulSetName: string;
}

export interface InframonitoringtypesStatefulSetsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesStatefulSetRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export type InframonitoringtypesVolumeRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesVolumeRecordDTOMeta =
	InframonitoringtypesVolumeRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesVolumeRecordDTO {
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesVolumeRecordDTOMeta;
	/**
	 * @type string
	 */
	persistentVolumeClaimName: string;
	/**
	 * @type number
	 * @format double
	 */
	volumeAvailable: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeCapacity: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeInodes: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeInodesFree: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeInodesUsed: number;
	/**
	 * @type number
	 * @format double
	 */
	volumeUsage: number;
}

export interface InframonitoringtypesVolumesDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesVolumeRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

/**
 * @nullable
 */
export type LlmpricingruletypesStringSliceDTO = string[] | null;

export enum LlmpricingruletypesLLMPricingRuleCacheModeDTO {
	subtract = 'subtract',
	additive = 'additive',
	unknown = 'unknown',
}
export interface LlmpricingruletypesLLMPricingCacheCostsDTO {
	mode: LlmpricingruletypesLLMPricingRuleCacheModeDTO;
	/**
	 * @type number
	 * @format double
	 */
	read?: number;
	/**
	 * @type number
	 * @format double
	 */
	write?: number;
}

export interface LlmpricingruletypesLLMRulePricingDTO {
	cache?: LlmpricingruletypesLLMPricingCacheCostsDTO;
	/**
	 * @type number
	 * @format double
	 */
	input: number;
	/**
	 * @type number
	 * @format double
	 */
	output: number;
}

export enum LlmpricingruletypesLLMPricingRuleUnitDTO {
	per_million_tokens = 'per_million_tokens',
}
export interface LlmpricingruletypesLLMPricingRuleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type boolean
	 */
	enabled: boolean;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type boolean
	 */
	isOverride: boolean;
	/**
	 * @type string
	 */
	modelName: string;
	modelPattern: LlmpricingruletypesStringSliceDTO | null;
	/**
	 * @type string
	 */
	orgId: string;
	pricing: LlmpricingruletypesLLMRulePricingDTO;
	/**
	 * @type string
	 */
	provider: string;
	/**
	 * @type string
	 */
	sourceId?: string;
	/**
	 * @type string,null
	 * @format date-time
	 */
	syncedAt?: string | null;
	unit: LlmpricingruletypesLLMPricingRuleUnitDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface LlmpricingruletypesGettablePricingRulesDTO {
	/**
	 * @type array,null
	 */
	items: LlmpricingruletypesLLMPricingRuleDTO[] | null;
	/**
	 * @type integer
	 */
	limit: number;
	/**
	 * @type integer
	 */
	offset: number;
	/**
	 * @type integer
	 */
	total: number;
}

export interface LlmpricingruletypesUnmappedModelDTO {
	/**
	 * @type string
	 */
	modelName: string;
	/**
	 * @type string
	 */
	provider?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	spanCount: number;
}

export interface LlmpricingruletypesGettableUnmappedModelsDTO {
	/**
	 * @type array,null
	 */
	items: LlmpricingruletypesUnmappedModelDTO[] | null;
}

export interface LlmpricingruletypesUpdatableLLMPricingRuleDTO {
	/**
	 * @type boolean
	 */
	enabled: boolean;
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @type boolean,null
	 */
	isOverride?: boolean | null;
	/**
	 * @type string
	 */
	modelName: string;
	/**
	 * @type array,null
	 */
	modelPattern: string[] | null;
	pricing: LlmpricingruletypesLLMRulePricingDTO;
	/**
	 * @type string
	 */
	provider: string;
	/**
	 * @type string,null
	 */
	sourceId?: string | null;
	unit: LlmpricingruletypesLLMPricingRuleUnitDTO;
}

export interface LlmpricingruletypesUpdatableLLMPricingRulesDTO {
	/**
	 * @type array,null
	 */
	rules: LlmpricingruletypesUpdatableLLMPricingRuleDTO[] | null;
}

export enum MetricreductionruletypesAssetTypeDTO {
	dashboard = 'dashboard',
	alert_rule = 'alert_rule',
}
export interface MetricreductionruletypesAffectedWidgetDTO {
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
}

export interface MetricreductionruletypesAffectedAssetDTO {
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type array,null
	 */
	impactedLabels: string[] | null;
	/**
	 * @type string
	 */
	name: string;
	type: MetricreductionruletypesAssetTypeDTO;
	widget?: MetricreductionruletypesAffectedWidgetDTO;
}

export enum MetricreductionruletypesMatchTypeDTO {
	drop = 'drop',
	keep = 'keep',
}
export interface MetricreductionruletypesGettableReductionRuleDTO {
	/**
	 * @type boolean
	 */
	active: boolean;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type string
	 * @format date-time
	 */
	effectiveFrom: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	ingestedSamples: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	ingestedSeries: number;
	/**
	 * @type array,null
	 */
	labels: string[] | null;
	matchType: MetricreductionruletypesMatchTypeDTO;
	/**
	 * @type string
	 */
	metricName: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	retainedSamples: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	retainedSeries: number;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface MetricreductionruletypesGettableReductionRulePreviewDTO {
	/**
	 * @type array,null
	 */
	affectedAssets: MetricreductionruletypesAffectedAssetDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 */
	currentRetainedSeries: number;
	/**
	 * @type array,null
	 */
	droppedLabels: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	effectiveFrom: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	ingestedSeries: number;
	/**
	 * @type number
	 * @format double
	 */
	reductionPercent: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	retainedSeries: number;
}

export interface MetricreductionruletypesGettableReductionRuleStatsDTO {
	/**
	 * @type number
	 * @format double
	 */
	estimatedMonthlySavingsUsd: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	ingestedSamples: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	ingestedSeries: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	retainedSamples: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	retainedSeries: number;
}

export interface MetricreductionruletypesGettableReductionRulesDTO {
	/**
	 * @type array,null
	 */
	rules: MetricreductionruletypesGettableReductionRuleDTO[] | null;
	/**
	 * @type integer
	 */
	total: number;
}

export enum MetricreductionruletypesOrderDTO {
	asc = 'asc',
	desc = 'desc',
}
export interface MetricreductionruletypesPostableReductionRuleDTO {
	/**
	 * @type array,null
	 */
	labels: string[] | null;
	matchType: MetricreductionruletypesMatchTypeDTO;
	/**
	 * @type string
	 */
	metricName: string;
}

export interface MetricreductionruletypesPostableReductionRulePreviewDTO {
	/**
	 * @type array,null
	 */
	labels: string[] | null;
	/**
	 * @type integer
	 * @format int64
	 */
	lookbackMs?: number;
	matchType: MetricreductionruletypesMatchTypeDTO;
	/**
	 * @type string
	 */
	metricName: string;
}

export enum MetricreductionruletypesReductionRuleOrderByDTO {
	metric = 'metric',
	ingested_volume = 'ingested_volume',
	reduced_volume = 'reduced_volume',
	last_updated = 'last_updated',
}
export interface MetricreductionruletypesUpdatableReductionRuleDTO {
	/**
	 * @type array,null
	 */
	labels: string[] | null;
	matchType: MetricreductionruletypesMatchTypeDTO;
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

export type Querybuildertypesv5LabelDTOValue = string | number | boolean;

export interface Querybuildertypesv5LabelDTO {
	key?: TelemetrytypesTelemetryFieldKeyDTO;
	value?: Querybuildertypesv5LabelDTOValue;
}

export interface Querybuildertypesv5BucketDTO {
	/**
	 * @type number
	 * @format double
	 */
	step?: number;
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

export interface Querybuildertypesv5TimeSeriesDTO {
	/**
	 * @type array
	 */
	labels?: Querybuildertypesv5LabelDTO[];
	/**
	 * @type array,null
	 */
	values?: Querybuildertypesv5TimeSeriesValueDTO[] | null;
}

export interface MetricsexplorertypesInspectMetricsResponseDTO {
	/**
	 * @type array,null
	 */
	series: Querybuildertypesv5TimeSeriesDTO[] | null;
}

export enum MetrictypesTypeDTO {
	gauge = 'gauge',
	sum = 'sum',
	histogram = 'histogram',
	summary = 'summary',
	exponentialhistogram = 'exponentialhistogram',
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
	 * @type array,null
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
	 * @type array,null
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
	 * @type array,null
	 */
	values: string[] | null;
}

export interface MetricsexplorertypesMetricAttributesResponseDTO {
	/**
	 * @type array,null
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

export interface MetricsexplorertypesMetricDashboardPanelsResponseDTO {
	/**
	 * @type array,null
	 */
	dashboards: DashboardtypesDashboardPanelRefDTO[] | null;
}

export interface MetricsexplorertypesMetricDashboardsResponseDTO {
	/**
	 * @type array,null
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
	 * @type array,null
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
	 * @type array,null
	 */
	samples: MetricsexplorertypesTreemapEntryDTO[] | null;
	/**
	 * @type array,null
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

export interface PreferencetypesValueDTO {
	[key: string]: unknown;
}

export interface PreferencetypesPreferenceDTO {
	/**
	 * @type array,null
	 */
	allowedScopes?: string[] | null;
	/**
	 * @type array,null
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

export interface PromotetypesWrappedIndexDTO {
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type integer
	 */
	granularity?: number;
	/**
	 * @type string
	 */
	type?: string;
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
	 * @type array,null
	 */
	series?: Querybuildertypesv5TimeSeriesDTO[] | null;
	/**
	 * @type array
	 */
	upperBoundSeries?: Querybuildertypesv5TimeSeriesDTO[];
}

export type Querybuildertypesv5ColumnDescriptorDTOMeta = {
	/**
	 * @type string
	 */
	unit?: string;
};

export enum Querybuildertypesv5ColumnTypeDTO {
	group = 'group',
	aggregation = 'aggregation',
}
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

export interface TelemetrystoretypesEstimateEntryDTO {
	/**
	 * @type string
	 */
	database: string;
	/**
	 * @type integer
	 * @format int64
	 */
	marks: number;
	/**
	 * @type integer
	 * @format int64
	 */
	parts: number;
	/**
	 * @type integer
	 * @format int64
	 */
	rows: number;
	/**
	 * @type string
	 */
	table: string;
}

export interface TelemetrystoretypesIndexStepDTO {
	/**
	 * @type string
	 */
	condition: string;
	/**
	 * @type integer
	 * @format int64
	 */
	initialGranules: number;
	/**
	 * @type integer
	 * @format int64
	 */
	initialParts: number;
	/**
	 * @type array
	 */
	keys: string[];
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type integer
	 * @format int64
	 */
	selectedGranules: number;
	/**
	 * @type integer
	 * @format int64
	 */
	selectedParts: number;
	/**
	 * @type string
	 */
	type: string;
}

export interface TelemetrystoretypesMergeTreeReadDTO {
	/**
	 * @type array
	 */
	steps: TelemetrystoretypesIndexStepDTO[];
	/**
	 * @type string
	 */
	table: string;
}

export type TelemetrystoretypesGranulesDTOAnyOf = {
	/**
	 * @type integer
	 * @format int64
	 */
	initial: number;
	/**
	 * @type array
	 */
	reads: TelemetrystoretypesMergeTreeReadDTO[];
	/**
	 * @type integer
	 * @format int64
	 */
	selected: number;
	/**
	 * @type integer
	 * @format int64
	 */
	skipped: number;
};

/**
 * @nullable
 */
export type TelemetrystoretypesGranulesDTO =
	TelemetrystoretypesGranulesDTOAnyOf | null;

export interface Querybuildertypesv5PreviewStatementDTO {
	/**
	 * @type array
	 */
	'db.statement.args': unknown[];
	/**
	 * @type string
	 */
	'db.statement.query': string;
	/**
	 * @type array
	 */
	estimate: TelemetrystoretypesEstimateEntryDTO[];
	granules: TelemetrystoretypesGranulesDTO | null;
}

export interface Querybuildertypesv5TimeSeriesDataDTO {
	/**
	 * @type array,null
	 */
	aggregations?: Querybuildertypesv5AggregationBucketDTO[] | null;
	/**
	 * @type string
	 */
	queryName?: string;
}

export interface Querybuildertypesv5ScalarDataDTO {
	/**
	 * @type array,null
	 */
	columns?: Querybuildertypesv5ColumnDescriptorDTO[] | null;
	/**
	 * @type array,null
	 */
	data?: unknown[][] | null;
	/**
	 * @type string
	 */
	queryName?: string;
}

export type Querybuildertypesv5RawRowDTODataAnyOf = { [key: string]: unknown };

/**
 * @nullable
 */
export type Querybuildertypesv5RawRowDTOData =
	Querybuildertypesv5RawRowDTODataAnyOf | null;

export interface Querybuildertypesv5RawRowDTO {
	/**
	 * @type object,null
	 */
	data?: Querybuildertypesv5RawRowDTOData;
	/**
	 * @type string
	 * @format date-time
	 */
	timestamp?: string;
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
	 * @type array,null
	 */
	rows?: Querybuildertypesv5RawRowDTO[] | null;
}

export type Querybuildertypesv5QueryDataDTO =
	| (Querybuildertypesv5TimeSeriesDataDTO & {
			/**
			 * @type array,null
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5ScalarDataDTO & {
			/**
			 * @type array,null
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5RawDataDTO & {
			/**
			 * @type array,null
			 */
			results?: unknown[] | null;
	  });

export interface Querybuildertypesv5QueryPreviewDTO {
	error: unknown;
	/**
	 * @type array
	 */
	statements: Querybuildertypesv5PreviewStatementDTO[];
	/**
	 * @type boolean
	 */
	valid: boolean;
	/**
	 * @type array
	 */
	warnings: string[];
}

export type Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQueryAnyOf =
	{ [key: string]: Querybuildertypesv5QueryPreviewDTO };

/**
 * @nullable
 */
export type Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQuery =
	Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQueryAnyOf | null;

/**
 * Response from the v5 query range preview (dry-run) endpoint. For each query in the composite query, returns the underlying ClickHouse statement(s) it renders to without executing them (one per PromQL metric selector; exactly one for builder/ClickHouse/trace-operator queries), with the optional EXPLAIN ESTIMATE and granule analysis attached per statement when requested.
 */
export interface Querybuildertypesv5QueryRangePreviewResponseDTO {
	/**
	 * @type object,null
	 */
	compositeQuery: Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQuery;
}

export enum Querybuildertypesv5VariableTypeDTO {
	query = 'query',
	dynamic = 'dynamic',
	custom = 'custom',
	text = 'text',
}
export type Querybuildertypesv5VariableItemDTOValueOneOfItem =
	| string
	| number
	| boolean;

export type Querybuildertypesv5VariableItemDTOValue =
	| string
	| number
	| boolean
	| Querybuildertypesv5VariableItemDTOValueOneOfItem[];

export interface Querybuildertypesv5VariableItemDTO {
	type?: Querybuildertypesv5VariableTypeDTO;
	value?: Querybuildertypesv5VariableItemDTOValue;
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
export interface RenderErrorResponseDTO {
	error: ErrorsJSONDTO;
	/**
	 * @type string
	 */
	status: string;
}

export enum RuletypesAlertStateDTO {
	inactive = 'inactive',
	pending = 'pending',
	recovering = 'recovering',
	firing = 'firing',
	nodata = 'nodata',
	disabled = 'disabled',
}
export interface RulestatehistorytypesGettableRuleStateHistoryDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	fingerprint: number;
	/**
	 * @type array,null
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
	 * @type array,null
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
	 * @type array,null
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

export enum RuletypesPanelTypeDTO {
	value = 'value',
	table = 'table',
	graph = 'graph',
}
export enum RuletypesQueryTypeDTO {
	builder = 'builder',
	clickhouse_sql = 'clickhouse_sql',
	promql = 'promql',
}
export interface RuletypesAlertCompositeQueryDTO {
	panelType: RuletypesPanelTypeDTO;
	/**
	 * @type array,null
	 */
	queries: Querybuildertypesv5QueryEnvelopeDTO[] | null;
	queryType: RuletypesQueryTypeDTO;
	/**
	 * @type string
	 */
	unit?: string;
}

export enum RuletypesAlertTypeDTO {
	METRIC_BASED_ALERT = 'METRIC_BASED_ALERT',
	TRACES_BASED_ALERT = 'TRACES_BASED_ALERT',
	LOGS_BASED_ALERT = 'LOGS_BASED_ALERT',
	EXCEPTIONS_BASED_ALERT = 'EXCEPTIONS_BASED_ALERT',
}
export enum RuletypesMatchTypeDTO {
	at_least_once = 'at_least_once',
	all_the_times = 'all_the_times',
	on_average = 'on_average',
	in_total = 'in_total',
	last = 'last',
}
export enum RuletypesCompareOperatorDTO {
	above = 'above',
	below = 'below',
	equal = 'equal',
	not_equal = 'not_equal',
	outside_bounds = 'outside_bounds',
}
export interface RuletypesBasicRuleThresholdDTO {
	/**
	 * @type array,null
	 */
	channels?: string[] | null;
	matchType: RuletypesMatchTypeDTO;
	/**
	 * @type string
	 */
	name: string;
	op: RuletypesCompareOperatorDTO;
	/**
	 * @type number,null
	 */
	recoveryTarget?: number | null;
	/**
	 * @type number,null
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

export enum RuletypesScheduleTypeDTO {
	hourly = 'hourly',
	daily = 'daily',
	weekly = 'weekly',
	monthly = 'monthly',
}
export interface RuletypesCumulativeScheduleDTO {
	/**
	 * @type integer,null
	 */
	day?: number | null;
	/**
	 * @type integer,null
	 */
	hour?: number | null;
	/**
	 * @type integer,null
	 */
	minute?: number | null;
	type: RuletypesScheduleTypeDTO;
	/**
	 * @type integer,null
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

export enum RuletypesEvaluationCumulativeDTOKind {
	cumulative = 'cumulative',
}
export interface RuletypesEvaluationCumulativeDTO {
	/**
	 * @type string
	 * @enum cumulative
	 */
	kind: RuletypesEvaluationCumulativeDTOKind;
	spec: RuletypesCumulativeWindowDTO;
}

export enum RuletypesEvaluationRollingDTOKind {
	rolling = 'rolling',
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

export interface RuletypesEvaluationRollingDTO {
	/**
	 * @type string
	 * @enum rolling
	 */
	kind: RuletypesEvaluationRollingDTOKind;
	spec: RuletypesRollingWindowDTO;
}

export type RuletypesEvaluationEnvelopeDTO =
	| RuletypesEvaluationRollingDTO
	| RuletypesEvaluationCumulativeDTO;

export enum RuletypesEvaluationKindDTO {
	rolling = 'rolling',
	cumulative = 'cumulative',
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

export type RuletypesPostableRuleDTOAnnotations = { [key: string]: string };

export type RuletypesPostableRuleDTOLabels = { [key: string]: string };

export enum RuletypesSeasonalityDTO {
	hourly = 'hourly',
	daily = 'daily',
	weekly = 'weekly',
}
export enum RuletypesThresholdBasicDTOKind {
	basic = 'basic',
}
export interface RuletypesThresholdBasicDTO {
	/**
	 * @type string
	 * @enum basic
	 */
	kind: RuletypesThresholdBasicDTOKind;
	spec: RuletypesBasicRuleThresholdsDTO | null;
}

export type RuletypesRuleThresholdDataDTO = RuletypesThresholdBasicDTO;

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
	matchType?: RuletypesMatchTypeDTO;
	op?: RuletypesCompareOperatorDTO;
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
	 * @type number,null
	 */
	target?: number | null;
	/**
	 * @type string
	 */
	targetUnit?: string;
	thresholds?: RuletypesRuleThresholdDataDTO;
}

export enum RuletypesRuleTypeDTO {
	threshold_rule = 'threshold_rule',
	promql_rule = 'promql_rule',
	anomaly_rule = 'anomaly_rule',
}
export interface RuletypesPostableRuleDTO {
	/**
	 * @type string
	 */
	alert: string;
	alertType: RuletypesAlertTypeDTO;
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

export type RuletypesRuleDTOAnnotations = { [key: string]: string };

export type RuletypesRuleDTOLabels = { [key: string]: string };

export interface RuletypesRuleDTO {
	/**
	 * @type string
	 */
	alert: string;
	alertType: RuletypesAlertTypeDTO;
	/**
	 * @type object
	 */
	annotations?: RuletypesRuleDTOAnnotations;
	condition: RuletypesRuleConditionDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
	/**
	 * @type string
	 */
	version?: string;
}

export enum RuletypesThresholdKindDTO {
	basic = 'basic',
}
export interface ServiceaccounttypesDeprecatedPostableServiceAccountRoleDTO {
	/**
	 * @type string
	 */
	id: string;
}

export interface ServiceaccounttypesGettableFactorAPIKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	lastObservedAt: string;
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
	updatedAt?: string;
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
	roleId: string;
	/**
	 * @type string
	 */
	serviceAccountId: string;
}

export interface ServiceaccounttypesServiceAccountDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	updatedAt?: string;
}

export interface ServiceaccounttypesServiceAccountRoleDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	updatedAt?: string;
}

export interface ServiceaccounttypesServiceAccountWithRolesDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
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
	 * @type array,null
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
	updatedAt?: string;
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

export type SpantypesEventDTOAttributeMap = { [key: string]: unknown };

export interface SpantypesEventDTO {
	/**
	 * @type object
	 */
	attributeMap?: SpantypesEventDTOAttributeMap;
	/**
	 * @type boolean
	 */
	isError?: boolean;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	timeUnixNano?: number;
}

export enum SpantypesFieldContextDTO {
	attribute = 'attribute',
	resource = 'resource',
}
export type SpantypesFlamegraphSpanDTOAttributes = { [key: string]: unknown };

export type SpantypesFlamegraphSpanDTOResource = { [key: string]: string };

export interface SpantypesFlamegraphSpanDTO {
	/**
	 * @type object
	 */
	attributes: SpantypesFlamegraphSpanDTOAttributes;
	/**
	 * @type integer
	 * @minimum 0
	 */
	durationNano: number;
	/**
	 * @type array
	 */
	event: SpantypesEventDTO[];
	/**
	 * @type boolean
	 */
	hasError: boolean;
	/**
	 * @type integer
	 * @format int64
	 */
	level: number;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	parentSpanId: string;
	/**
	 * @type object
	 */
	resource: SpantypesFlamegraphSpanDTOResource;
	/**
	 * @type string
	 */
	spanId: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	timestamp: number;
}

export interface SpantypesGettableFlamegraphTraceDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	endTimestampMillis: number;
	/**
	 * @type boolean
	 */
	hasMore: boolean;
	/**
	 * @type array
	 */
	spans: SpantypesFlamegraphSpanDTO[][];
	/**
	 * @type integer
	 * @format int64
	 */
	startTimestampMillis: number;
}

export type SpantypesSpanMapperGroupConditionDTOAnyOf = {
	/**
	 * @type array,null
	 */
	attributes: string[] | null;
	/**
	 * @type array,null
	 */
	resource: string[] | null;
};

/**
 * @nullable
 */
export type SpantypesSpanMapperGroupConditionDTO =
	SpantypesSpanMapperGroupConditionDTOAnyOf | null;

export interface SpantypesSpanMapperGroupDTO {
	condition: SpantypesSpanMapperGroupConditionDTO | null;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type boolean
	 */
	enabled: boolean;
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
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface SpantypesGettableSpanMapperGroupsDTO {
	/**
	 * @type array
	 */
	items: SpantypesSpanMapperGroupDTO[];
}

export enum SpantypesSpanAggregationTypeDTO {
	span_count = 'span_count',
	execution_time_percentage = 'execution_time_percentage',
	duration = 'duration',
}
export type SpantypesSpanAggregationResultDTOValueAnyOf = {
	[key: string]: number;
};

/**
 * @nullable
 */
export type SpantypesSpanAggregationResultDTOValue =
	SpantypesSpanAggregationResultDTOValueAnyOf | null;

export interface SpantypesSpanAggregationResultDTO {
	aggregation: SpantypesSpanAggregationTypeDTO;
	field: TelemetrytypesTelemetryFieldKeyDTO;
	/**
	 * @type object,null
	 */
	value: SpantypesSpanAggregationResultDTOValue;
}

export interface SpantypesGettableTraceAggregationsDTO {
	/**
	 * @type array
	 */
	aggregations: SpantypesSpanAggregationResultDTO[];
}

export interface SpantypesOtelSpanRefDTO {
	/**
	 * @type string
	 */
	refType?: string;
	/**
	 * @type string
	 */
	spanId?: string;
	/**
	 * @type string
	 */
	traceId?: string;
}

export type SpantypesWaterfallSpanDTOAttributesAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type SpantypesWaterfallSpanDTOAttributes =
	SpantypesWaterfallSpanDTOAttributesAnyOf | null;

export type SpantypesWaterfallSpanDTOResourceAnyOf = { [key: string]: string };

/**
 * @nullable
 */
export type SpantypesWaterfallSpanDTOResource =
	SpantypesWaterfallSpanDTOResourceAnyOf | null;

export interface SpantypesWaterfallSpanDTO {
	/**
	 * @type object,null
	 */
	attributes?: SpantypesWaterfallSpanDTOAttributes;
	/**
	 * @type string
	 */
	db_name?: string;
	/**
	 * @type string
	 */
	db_operation?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	duration_nano?: number;
	/**
	 * @type array,null
	 */
	events?: SpantypesEventDTO[] | null;
	/**
	 * @type string
	 */
	external_http_method?: string;
	/**
	 * @type string
	 */
	external_http_url?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	flags?: number;
	/**
	 * @type boolean
	 */
	has_children?: boolean;
	/**
	 * @type boolean
	 */
	has_error?: boolean;
	/**
	 * @type string
	 */
	http_host?: string;
	/**
	 * @type string
	 */
	http_method?: string;
	/**
	 * @type string
	 */
	http_url?: string;
	/**
	 * @type string
	 */
	is_remote?: string;
	/**
	 * @type string
	 */
	kind_string?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	level?: number;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	parent_span_id?: string;
	/**
	 * @type array
	 */
	references: SpantypesOtelSpanRefDTO[];
	/**
	 * @type object,null
	 */
	resource?: SpantypesWaterfallSpanDTOResource;
	/**
	 * @type string
	 */
	response_status_code?: string;
	/**
	 * @type string
	 */
	span_id?: string;
	/**
	 * @type integer
	 */
	status_code?: number;
	/**
	 * @type string
	 */
	status_code_string?: string;
	/**
	 * @type string
	 */
	status_message?: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	sub_tree_node_count?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	time_unix?: number;
	/**
	 * @type string
	 */
	trace_id?: string;
	/**
	 * @type string
	 */
	trace_state?: string;
}

export interface SpantypesGettableWaterfallTraceDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	endTimestampMillis?: number;
	/**
	 * @type boolean
	 */
	hasMissingSpans?: boolean;
	/**
	 * @type boolean
	 */
	hasMore?: boolean;
	/**
	 * @type string
	 */
	rootServiceEntryPoint?: string;
	/**
	 * @type string
	 */
	rootServiceName?: string;
	/**
	 * @type array,null
	 */
	spans?: SpantypesWaterfallSpanDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 */
	startTimestampMillis?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalErrorSpansCount?: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalSpansCount?: number;
	/**
	 * @type array,null
	 */
	uncollapsedSpans?: string[] | null;
}

export interface SpantypesPostableFlamegraphDTO {
	/**
	 * @type array
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[];
	/**
	 * @type string
	 */
	selectedSpanId?: string;
}

export enum SpantypesSpanMapperOperationDTO {
	move = 'move',
	copy = 'copy',
}
export interface SpantypesSpanMapperSourceDTO {
	context: SpantypesFieldContextDTO;
	/**
	 * @type string
	 */
	key: string;
	operation: SpantypesSpanMapperOperationDTO;
	/**
	 * @type integer
	 */
	priority: number;
}

export interface SpantypesSpanMapperConfigDTO {
	/**
	 * @type array,null
	 */
	sources: SpantypesSpanMapperSourceDTO[] | null;
}

export interface SpantypesPostableSpanMapperDTO {
	config: SpantypesSpanMapperConfigDTO;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	fieldContext: SpantypesFieldContextDTO;
	/**
	 * @type string
	 */
	name: string;
}

export interface SpantypesPostableSpanMapperGroupDTO {
	condition: SpantypesSpanMapperGroupConditionDTO | null;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type string
	 */
	name: string;
}

export interface SpantypesSpanAggregationDTO {
	aggregation: SpantypesSpanAggregationTypeDTO;
	field: TelemetrytypesTelemetryFieldKeyDTO;
}

export interface SpantypesPostableTraceAggregationsDTO {
	/**
	 * @type array
	 */
	aggregations: SpantypesSpanAggregationDTO[];
}

export interface SpantypesPostableWaterfallDTO {
	/**
	 * @type string
	 */
	selectedSpanId?: string;
	/**
	 * @type array,null
	 */
	uncollapsedSpans?: string[] | null;
}

export interface SpantypesSpanMapperDTO {
	config: SpantypesSpanMapperConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 */
	createdBy?: string;
	/**
	 * @type boolean
	 */
	enabled: boolean;
	fieldContext: SpantypesFieldContextDTO;
	/**
	 * @type string
	 */
	group_id: string;
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
	 * @format date-time
	 */
	updatedAt?: string;
	/**
	 * @type string
	 */
	updatedBy?: string;
}

export interface SpantypesUpdatableSpanMapperDTO {
	config?: SpantypesSpanMapperConfigDTO;
	/**
	 * @type boolean,null
	 */
	enabled?: boolean | null;
	fieldContext?: SpantypesFieldContextDTO;
}

export interface SpantypesUpdatableSpanMapperGroupDTO {
	condition?: SpantypesSpanMapperGroupConditionDTO | null;
	/**
	 * @type boolean,null
	 */
	enabled?: boolean | null;
	/**
	 * @type string,null
	 */
	name?: string | null;
}

export type TelemetrytypesGettableFieldKeysDTOKeysAnyOf = {
	[key: string]: TelemetrytypesTelemetryFieldKeyDTO[];
};

/**
 * @nullable
 */
export type TelemetrytypesGettableFieldKeysDTOKeys =
	TelemetrytypesGettableFieldKeysDTOKeysAnyOf | null;

export interface TelemetrytypesGettableFieldKeysDTO {
	/**
	 * @type boolean
	 */
	complete: boolean;
	/**
	 * @type object,null
	 */
	keys: TelemetrytypesGettableFieldKeysDTOKeys;
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

export interface TelemetrytypesGettableFieldValuesDTO {
	/**
	 * @type boolean
	 */
	complete: boolean;
	values: TelemetrytypesTelemetryFieldValuesDTO;
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
	createdAt?: string;
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
	updatedAt?: string;
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
	createdAt?: string;
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
	updatedAt?: string;
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
	createdAt?: string;
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
	updatedAt?: string;
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

export interface TypesPostableVerifyResetPasswordTokenDTO {
	/**
	 * @type string
	 */
	token: string;
}

export interface TypesResetPasswordTokenDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	expiresAt?: string;
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
	createdAt?: string;
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
	updatedAt?: string;
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

export interface ZeustypesGettableHostDTO {
	/**
	 * @type array,null
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
	 * @type array,null
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
export type ListAccountServicesMetadataPathParameters = {
	cloudProvider: string;
	id: string;
};
export type ListAccountServicesMetadata200 = {
	data: CloudintegrationtypesGettableServicesMetadataDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetAccountServicePathParameters = {
	cloudProvider: string;
	id: string;
	serviceId: string;
};
export type GetAccountService200 = {
	data: CloudintegrationtypesServiceDTO;
	/**
	 * @type string
	 */
	status: string;
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

export type CreateAuthDomain201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteAuthDomainPathParameters = {
	id: string;
};
export type GetAuthDomainPathParameters = {
	id: string;
};
export type GetAuthDomain200 = {
	data: AuthtypesGettableAuthDomainDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateAuthDomainPathParameters = {
	id: string;
};
export type ListDowntimeSchedulesParams = {
	/**
	 * @type boolean,null
	 * @description undefined
	 */
	active?: boolean | null;
	/**
	 * @type boolean,null
	 * @description undefined
	 */
	recurring?: boolean | null;
};

export type ListDowntimeSchedules200 = {
	/**
	 * @type array
	 */
	data: AlertmanagertypesPlannedMaintenanceDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type CreateDowntimeSchedule201 = {
	data: AlertmanagertypesPlannedMaintenanceDTO;
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
	data: AlertmanagertypesPlannedMaintenanceDTO;
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

export type ListLLMPricingRulesParams = {
	/**
	 * @type integer
	 * @description undefined
	 */
	offset?: number;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @type string
	 * @description undefined
	 */
	q?: string;
	/**
	 * @type boolean,null
	 * @description undefined
	 */
	isOverride?: boolean | null;
};

export type ListLLMPricingRules200 = {
	data: LlmpricingruletypesGettablePricingRulesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteLLMPricingRulePathParameters = {
	id: string;
};
export type GetLLMPricingRulePathParameters = {
	id: string;
};
export type GetLLMPricingRule200 = {
	data: LlmpricingruletypesLLMPricingRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListUnmappedLLMModels200 = {
	data: LlmpricingruletypesGettableUnmappedModelsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListPromotedAndIndexedPaths200 = {
	/**
	 * @type array,null
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
	data: AuthtypesRoleWithTransactionGroupsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateRolePathParameters = {
	id: string;
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

export type CreateServiceAccountRole201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteServiceAccountRolePathParameters = {
	id: string;
};
export type GetServiceAccountRolePathParameters = {
	id: string;
};
export type GetServiceAccountRole200 = {
	data: ServiceaccounttypesServiceAccountRoleDTO;
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
	 * @type array,null
	 */
	data: AuthtypesRoleDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateServiceAccountRoleDeprecatedPathParameters = {
	id: string;
};
export type CreateServiceAccountRoleDeprecated201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteServiceAccountRoleDeprecatedPathParameters = {
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

export type ListSpanMapperGroupsParams = {
	/**
	 * @type boolean,null
	 * @description undefined
	 */
	enabled?: boolean | null;
};

export type ListSpanMapperGroups200 = {
	data: SpantypesGettableSpanMapperGroupsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateSpanMapperGroup201 = {
	data: SpantypesSpanMapperGroupDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteSpanMapperGroupPathParameters = {
	groupId: string;
};
export type UpdateSpanMapperGroupPathParameters = {
	groupId: string;
};
export type ListSpanMappersPathParameters = {
	groupId: string;
};
export type ListSpanMappers200 = {
	data: SpantypesGettableSpanMapperGroupsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateSpanMapperPathParameters = {
	groupId: string;
};
export type CreateSpanMapper201 = {
	data: SpantypesSpanMapperDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteSpanMapperPathParameters = {
	groupId: string;
	mapperId: string;
};
export type UpdateSpanMapperPathParameters = {
	groupId: string;
	mapperId: string;
};
export type GetStats200Data = { [key: string]: unknown };

export type GetStats200 = {
	/**
	 * @type object
	 */
	data: GetStats200Data;
	/**
	 * @type string
	 */
	status: string;
};

export type GetTraceAggregationsPathParameters = {
	traceID: string;
};
export type GetTraceAggregations200 = {
	data: SpantypesGettableTraceAggregationsDTO;
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

export type DeleteUserDeprecatedPathParameters = {
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
export type ListDashboardViews200 = {
	data: DashboardtypesListableDashboardViewDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateDashboardView201 = {
	data: DashboardtypesDashboardViewDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteDashboardViewPathParameters = {
	id: string;
};
export type UpdateDashboardViewPathParameters = {
	id: string;
};
export type UpdateDashboardView200 = {
	data: DashboardtypesDashboardViewDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListDashboardsV2Params = {
	/**
	 * @type string
	 * @description undefined
	 */
	query?: string;
	/**
	 * @description undefined
	 */
	sort?: DashboardtypesListSortDTO;
	/**
	 * @description undefined
	 */
	order?: DashboardtypesListOrderDTO;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description undefined
	 */
	offset?: number;
};

export type ListDashboardsV2200 = {
	data: DashboardtypesListableDashboardV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateDashboardV2201 = {
	data: DashboardtypesGettableDashboardV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteDashboardV2PathParameters = {
	id: string;
};
export type GetDashboardV2PathParameters = {
	id: string;
};
export type GetDashboardV2200 = {
	data: DashboardtypesGettableDashboardV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type PatchDashboardV2PathParameters = {
	id: string;
};
export type PatchDashboardV2200 = {
	data: DashboardtypesGettableDashboardV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateDashboardV2PathParameters = {
	id: string;
};
export type UpdateDashboardV2200 = {
	data: DashboardtypesGettableDashboardV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CloneDashboardV2PathParameters = {
	id: string;
};
export type CloneDashboardV2201 = {
	data: DashboardtypesGettableDashboardV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UnlockDashboardV2PathParameters = {
	id: string;
};
export type LockDashboardV2PathParameters = {
	id: string;
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

export type GetChecksParams = {
	/**
	 * @description undefined
	 */
	type: InframonitoringtypesCheckTypeDTO;
};

export type GetChecks200 = {
	data: InframonitoringtypesChecksDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListClusters200 = {
	data: InframonitoringtypesClustersDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListDaemonSets200 = {
	data: InframonitoringtypesDaemonSetsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListDeployments200 = {
	data: InframonitoringtypesDeploymentsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListHosts200 = {
	data: InframonitoringtypesHostsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListJobs200 = {
	data: InframonitoringtypesJobsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListNamespaces200 = {
	data: InframonitoringtypesNamespacesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListNodes200 = {
	data: InframonitoringtypesNodesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListPods200 = {
	data: InframonitoringtypesPodsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListVolumes200 = {
	data: InframonitoringtypesVolumesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListStatefulSets200 = {
	data: InframonitoringtypesStatefulSetsDTO;
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

export type ListMetricReductionRulesParams = {
	/**
	 * @description undefined
	 */
	orderBy?: MetricreductionruletypesReductionRuleOrderByDTO;
	/**
	 * @description undefined
	 */
	order?: MetricreductionruletypesOrderDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	search?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	metricName?: string;
	/**
	 * @type integer
	 * @description undefined
	 */
	offset?: number;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
};

export type ListMetricReductionRules200 = {
	data: MetricreductionruletypesGettableReductionRulesDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateMetricReductionRule201 = {
	data: MetricreductionruletypesGettableReductionRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteMetricReductionRuleByIDPathParameters = {
	id: string;
};
export type GetMetricReductionRuleByIDPathParameters = {
	id: string;
};
export type GetMetricReductionRuleByID200 = {
	data: MetricreductionruletypesGettableReductionRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateMetricReductionRuleByIDPathParameters = {
	id: string;
};
export type UpdateMetricReductionRuleByID200 = {
	data: MetricreductionruletypesGettableReductionRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type PreviewMetricReductionRule200 = {
	data: MetricreductionruletypesGettableReductionRulePreviewDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricReductionRuleStats200 = {
	data: MetricreductionruletypesGettableReductionRuleStatsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricReductionRuleTimeseries200 = {
	data: Querybuildertypesv5QueryRangeResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListMetricsParams = {
	/**
	 * @type integer,null
	 * @description undefined
	 */
	start?: number | null;
	/**
	 * @type integer,null
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

export type GetMetricAlertsParams = {
	/**
	 * @type string
	 * @description The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies).
	 */
	metricName: string;
};

export type GetMetricAlerts200 = {
	data: MetricsexplorertypesMetricAlertsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricAttributesParams = {
	/**
	 * @type string
	 * @description The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies).
	 */
	metricName: string;
	/**
	 * @type integer,null
	 * @description Start of the time range as a Unix timestamp in milliseconds.
	 */
	start?: number | null;
	/**
	 * @type integer,null
	 * @description End of the time range as a Unix timestamp in milliseconds.
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

export type GetMetricDashboardsParams = {
	/**
	 * @type string
	 * @description The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies).
	 */
	metricName: string;
};

export type GetMetricDashboards200 = {
	data: MetricsexplorertypesMetricDashboardsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricHighlightsParams = {
	/**
	 * @type string
	 * @description The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies).
	 */
	metricName: string;
};

export type GetMetricHighlights200 = {
	data: MetricsexplorertypesMetricHighlightsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type InspectMetrics200 = {
	data: MetricsexplorertypesInspectMetricsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricMetadataParams = {
	/**
	 * @type string
	 * @description The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies).
	 */
	metricName: string;
};

export type GetMetricMetadata200 = {
	data: MetricsexplorertypesMetricMetadataDTO;
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

export type GetPublicDashboardDataV2PathParameters = {
	id: string;
};
export type GetPublicDashboardDataV2200 = {
	data: DashboardtypesGettablePublicDashboardDataV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetPublicDashboardPanelQueryRangeV2PathParameters = {
	id: string;
	key: string;
};
export type GetPublicDashboardPanelQueryRangeV2200 = {
	data: Querybuildertypesv5QueryRangeResponseDTO;
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
	 * @type array,null
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
	 * @type array,null
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

export type CreateUserRole201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteUserRolePathParameters = {
	id: string;
};
export type GetUserRolePathParameters = {
	id: string;
};
export type GetUserRole200 = {
	data: AuthtypesUserRoleDTO;
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

export type CreateUser201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteUserPathParameters = {
	id: string;
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

export type ListDashboardsForUserV2Params = {
	/**
	 * @type string
	 * @description undefined
	 */
	query?: string;
	/**
	 * @description undefined
	 */
	sort?: DashboardtypesListSortDTO;
	/**
	 * @description undefined
	 */
	order?: DashboardtypesListOrderDTO;
	/**
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description undefined
	 */
	offset?: number;
};

export type ListDashboardsForUserV2200 = {
	data: DashboardtypesListableDashboardForUserV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UnpinDashboardV2PathParameters = {
	id: string;
};
export type PinDashboardV2PathParameters = {
	id: string;
};
export type GetHosts200 = {
	data: ZeustypesGettableHostDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetMetricDashboardsV2Params = {
	/**
	 * @type string
	 * @description The name of the metric. May contain slashes (e.g. cloud-provider metrics like run.googleapis.com/request_latencies).
	 */
	metricName: string;
};

export type GetMetricDashboardsV2200 = {
	data: MetricsexplorertypesMetricDashboardPanelsResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetFlamegraphPathParameters = {
	traceID: string;
};
export type GetFlamegraph200 = {
	data: SpantypesGettableFlamegraphTraceDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetWaterfallV4PathParameters = {
	traceID: string;
};
export type GetWaterfallV4200 = {
	data: SpantypesGettableWaterfallTraceDTO;
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

export type QueryRangePreviewV5Params = {
	/**
	 * @type string
	 * @description undefined
	 */
	verbose?: string;
};

export type QueryRangePreviewV5200 = {
	data: Querybuildertypesv5QueryRangePreviewResponseDTO;
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
