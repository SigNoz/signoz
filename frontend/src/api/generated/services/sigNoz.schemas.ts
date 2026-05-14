/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 * OpenAPI spec version: 0.0.1
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
	 * @type array,null
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
	 * @type array,null
	 */
	channels: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: Date;
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
	updatedAt: Date;
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

export interface AuthtypesGettableAuthDomainDTO {
	authNProviderInfo?: AuthtypesAuthNProviderInfoDTO;
	config?: AuthtypesAuthDomainConfigDTO;
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
	name?: string;
	/**
	 * @type string
	 */
	orgId?: string;
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
	/**
	 * @type string
	 */
	kind: string;
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
	message?: string;
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

export interface CloudintegrationtypesAccountConfigDTO {
	aws?: CloudintegrationtypesAWSAccountConfigDTO;
	azure?: CloudintegrationtypesAzureAccountConfigDTO;
}

export interface CloudintegrationtypesAccountDTO {
	agentReport: CloudintegrationtypesAgentReportDTO | null;
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
	 * @type string,null
	 */
	providerAccountId: string | null;
	/**
	 * @type string,null
	 * @format date-time
	 */
	removedAt: Date | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: Date;
}

export interface DashboardtypesStorableDashboardDataDTO {
	[key: string]: unknown;
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

export interface CloudintegrationtypesAssetsDTO {
	/**
	 * @type array,null
	 */
	dashboards?: CloudintegrationtypesDashboardDTO[] | null;
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
	storageaccountsblob = 'storageaccountsblob',
	cdnprofile = 'cdnprofile',
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
	removed_at: Date | null;
	/**
	 * @type string,null
	 * @format date-time
	 */
	removedAt: Date | null;
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

export interface CloudintegrationtypesServiceDTO {
	assets: CloudintegrationtypesAssetsDTO;
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
	telemetryCollectionStrategy: CloudintegrationtypesTelemetryCollectionStrategyDTO;
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

export interface CloudintegrationtypesUpdatableAccountConfigDTO {
	aws?: CloudintegrationtypesAWSAccountConfigDTO;
	azure?: CloudintegrationtypesUpdatableAzureAccountConfigDTO;
}

export interface CloudintegrationtypesUpdatableAccountDTO {
	config: CloudintegrationtypesUpdatableAccountConfigDTO;
}

export interface CloudintegrationtypesUpdatableServiceDTO {
	config: CloudintegrationtypesServiceConfigDTO;
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

export interface CoretypesObjectGroupDTO {
	resource: CoretypesResourceRefDTO;
	/**
	 * @type array
	 */
	selectors: string[];
}

export interface CoretypesPatchableObjectsDTO {
	/**
	 * @type array,null
	 */
	additions: CoretypesObjectGroupDTO[] | null;
	/**
	 * @type array,null
	 */
	deletions: CoretypesObjectGroupDTO[] | null;
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
	 * @type array,null
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updated_at?: Date;
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
	expires_at?: Date;
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
}

export interface InframonitoringtypesRequiredMetricsCheckDTO {
	/**
	 * @type array,null
	 */
	missingMetrics: string[] | null;
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
	 * @type array,null
	 */
	records: InframonitoringtypesClusterRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
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
}

export interface InframonitoringtypesDeploymentsDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array,null
	 */
	records: InframonitoringtypesDeploymentRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
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
	 * @type array,null
	 */
	records: InframonitoringtypesHostRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
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
	 * @type array,null
	 */
	records: InframonitoringtypesJobRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
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
}

export interface InframonitoringtypesNamespacesDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array,null
	 */
	records: InframonitoringtypesNamespaceRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
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
}

export interface InframonitoringtypesNodesDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array,null
	 */
	records: InframonitoringtypesNodeRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
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
	 * @type array,null
	 */
	records: InframonitoringtypesPodRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export interface Querybuildertypesv5FilterDTO {
	/**
	 * @type string
	 */
	expression?: string;
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
	 * @type array,null
	 */
	records: InframonitoringtypesStatefulSetRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
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
	 * @type array,null
	 */
	records: InframonitoringtypesVolumeRecordDTO[] | null;
	requiredMetricsCheck: InframonitoringtypesRequiredMetricsCheckDTO;
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
	createdAt?: Date;
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
	syncedAt?: Date | null;
	unit: LlmpricingruletypesLLMPricingRuleUnitDTO;
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

export interface Querybuildertypesv5LabelDTO {
	key?: TelemetrytypesTelemetryFieldKeyDTO;
	value?: unknown;
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

export enum MetrictypesTemporalityDTO {
	delta = 'delta',
	cumulative = 'cumulative',
	unspecified = 'unspecified',
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
export interface Querybuildertypesv5FunctionDTO {
	/**
	 * @type array
	 */
	args?: Querybuildertypesv5FunctionArgDTO[];
	name?: Querybuildertypesv5FunctionNameDTO;
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

export enum TelemetrytypesSourceDTO {
	meter = 'meter',
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

export enum Querybuildertypesv5QueryTypeDTO {
	builder_query = 'builder_query',
	builder_formula = 'builder_formula',
	builder_trace_operator = 'builder_trace_operator',
	clickhouse_sql = 'clickhouse_sql',
	promql = 'promql',
}
export interface Querybuildertypesv5QueryEnvelopeBuilderTraceDTO {
	spec?: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
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

export interface Querybuildertypesv5QueryEnvelopeBuilderLogDTO {
	spec?: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
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

export interface Querybuildertypesv5QueryEnvelopeBuilderMetricDTO {
	spec?: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
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

export interface Querybuildertypesv5QueryEnvelopeFormulaDTO {
	spec?: Querybuildertypesv5QueryBuilderFormulaDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
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

export interface Querybuildertypesv5QueryEnvelopeTraceOperatorDTO {
	spec?: Querybuildertypesv5QueryBuilderTraceOperatorDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
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

export interface Querybuildertypesv5QueryEnvelopePromQLDTO {
	spec?: Querybuildertypesv5PromQueryDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

export interface Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO {
	spec?: Querybuildertypesv5ClickHouseQueryDTO;
	type?: Querybuildertypesv5QueryTypeDTO;
}

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

/**
 * Composite query containing one or more query envelopes. Each query envelope specifies its type and corresponding spec.
 */
export interface Querybuildertypesv5CompositeQueryDTO {
	/**
	 * @type array,null
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
	timestamp?: Date;
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

export enum Querybuildertypesv5VariableTypeDTO {
	query = 'query',
	dynamic = 'dynamic',
	custom = 'custom',
	text = 'text',
}
export interface Querybuildertypesv5VariableItemDTO {
	type?: Querybuildertypesv5VariableTypeDTO;
	value?: unknown;
}

export type Querybuildertypesv5QueryRangeRequestDTOVariables = {
	[key: string]: Querybuildertypesv5VariableItemDTO;
};

export enum Querybuildertypesv5RequestTypeDTO {
	scalar = 'scalar',
	time_series = 'time_series',
	raw = 'raw',
	raw_stream = 'raw_stream',
	trace = 'trace',
}
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

export enum RuletypesMaintenanceKindDTO {
	fixed = 'fixed',
	recurring = 'recurring',
}
export enum RuletypesMaintenanceStatusDTO {
	active = 'active',
	upcoming = 'upcoming',
	expired = 'expired',
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
export interface RuletypesRecurrenceDTO {
	/**
	 * @type string
	 */
	duration: string;
	/**
	 * @type string,null
	 * @format date-time
	 */
	endTime?: Date | null;
	/**
	 * @type array,null
	 */
	repeatOn?: RuletypesRepeatOnDTO[] | null;
	repeatType: RuletypesRepeatTypeDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	startTime: Date;
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

export interface RuletypesPlannedMaintenanceDTO {
	/**
	 * @type array,null
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
	schedule: RuletypesScheduleDTO;
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

export enum SpantypesFieldContextDTO {
	attribute = 'attribute',
	resource = 'resource',
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
	createdAt?: Date;
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
	updatedAt?: Date;
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

export interface SpantypesSpanMapperDTO {
	config: SpantypesSpanMapperConfigDTO;
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
	updatedAt?: Date;
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

export type TracedetailtypesEventDTOAttributeMap = { [key: string]: unknown };

export interface TracedetailtypesEventDTO {
	/**
	 * @type object
	 */
	attributeMap?: TracedetailtypesEventDTOAttributeMap;
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

export type TracedetailtypesGettableWaterfallTraceDTOServiceNameToTotalDurationMapAnyOf =
	{ [key: string]: number };

/**
 * @nullable
 */
export type TracedetailtypesGettableWaterfallTraceDTOServiceNameToTotalDurationMap =
	TracedetailtypesGettableWaterfallTraceDTOServiceNameToTotalDurationMapAnyOf | null;

export enum TracedetailtypesSpanAggregationTypeDTO {
	span_count = 'span_count',
	execution_time_percentage = 'execution_time_percentage',
	duration = 'duration',
}
export type TracedetailtypesSpanAggregationResultDTOValueAnyOf = {
	[key: string]: number;
};

/**
 * @nullable
 */
export type TracedetailtypesSpanAggregationResultDTOValue =
	TracedetailtypesSpanAggregationResultDTOValueAnyOf | null;

export interface TracedetailtypesSpanAggregationResultDTO {
	aggregation?: TracedetailtypesSpanAggregationTypeDTO;
	field?: TelemetrytypesTelemetryFieldKeyDTO;
	/**
	 * @type object,null
	 */
	value?: TracedetailtypesSpanAggregationResultDTOValue;
}

export type TracedetailtypesWaterfallSpanDTOAttributesAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type TracedetailtypesWaterfallSpanDTOAttributes =
	TracedetailtypesWaterfallSpanDTOAttributesAnyOf | null;

export type TracedetailtypesWaterfallSpanDTOResourceAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type TracedetailtypesWaterfallSpanDTOResource =
	TracedetailtypesWaterfallSpanDTOResourceAnyOf | null;

export interface TracedetailtypesWaterfallSpanDTO {
	/**
	 * @type object,null
	 */
	attributes?: TracedetailtypesWaterfallSpanDTOAttributes;
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
	events?: TracedetailtypesEventDTO[] | null;
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
	 * @type object,null
	 */
	resource?: TracedetailtypesWaterfallSpanDTOResource;
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

export interface TracedetailtypesGettableWaterfallTraceDTO {
	/**
	 * @type array,null
	 */
	aggregations?: TracedetailtypesSpanAggregationResultDTO[] | null;
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
	 * @type object,null
	 */
	serviceNameToTotalDurationMap?: TracedetailtypesGettableWaterfallTraceDTOServiceNameToTotalDurationMap;
	/**
	 * @type array,null
	 */
	spans?: TracedetailtypesWaterfallSpanDTO[] | null;
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

export interface TracedetailtypesSpanAggregationDTO {
	aggregation?: TracedetailtypesSpanAggregationTypeDTO;
	field?: TelemetrytypesTelemetryFieldKeyDTO;
}

export interface TracedetailtypesPostableWaterfallDTO {
	/**
	 * @type array,null
	 */
	aggregations?: TracedetailtypesSpanAggregationDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 */
	limit?: number;
	/**
	 * @type string
	 */
	selectedSpanId?: string;
	/**
	 * @type array,null
	 */
	uncollapsedSpans?: string[] | null;
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
	data: CoretypesObjectGroupDTO[];
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
	 * @type array,null
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

export type ListClusters200 = {
	data: InframonitoringtypesClustersDTO;
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
	 * @type integer,null
	 * @description undefined
	 */
	start?: number | null;
	/**
	 * @type integer,null
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

export type GetWaterfallPathParameters = {
	traceID: string;
};
export type GetWaterfall200 = {
	data: TracedetailtypesGettableWaterfallTraceDTO;
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
