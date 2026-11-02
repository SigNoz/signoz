/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
export enum AiobservabilitytypesBlobPartDTOType {
	blob = 'blob',
}
export interface AiobservabilitytypesBlobPartDTO {
	/**
	 * @type string
	 */
	content: string;
	/**
	 * @type string,null
	 */
	mime_type?: string | null;
	/**
	 * @type string
	 */
	modality: string;
	/**
	 * @type string
	 * @enum blob
	 */
	type: AiobservabilitytypesBlobPartDTOType;
}

export enum AiobservabilitytypesTextPartDTOType {
	text = 'text',
}
export interface AiobservabilitytypesTextPartDTO {
	/**
	 * @type string
	 */
	content: string;
	/**
	 * @type string
	 * @enum text
	 */
	type: AiobservabilitytypesTextPartDTOType;
}

export enum AiobservabilitytypesToolCallRequestPartDTOType {
	tool_call = 'tool_call',
}
export interface AiobservabilitytypesToolCallRequestPartDTO {
	arguments?: unknown;
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 * @enum tool_call
	 */
	type: AiobservabilitytypesToolCallRequestPartDTOType;
}

export enum AiobservabilitytypesToolCallResponsePartDTOType {
	tool_call_response = 'tool_call_response',
}
export type AiobservabilitytypesToolCallResponsePartDTOResponse =
	| unknown
	| null;

export interface AiobservabilitytypesToolCallResponsePartDTO {
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @nullable true
	 */
	response: AiobservabilitytypesToolCallResponsePartDTOResponse;
	/**
	 * @type string
	 * @enum tool_call_response
	 */
	type: AiobservabilitytypesToolCallResponsePartDTOType;
}

export interface AiobservabilitytypesGenericServerToolCallDTO {
	[key: string]: unknown;
}

export enum AiobservabilitytypesServerToolCallPartDTOType {
	server_tool_call = 'server_tool_call',
}
export interface AiobservabilitytypesServerToolCallPartDTO {
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @type string
	 */
	name: string;
	server_tool_call: AiobservabilitytypesGenericServerToolCallDTO;
	/**
	 * @type string
	 * @enum server_tool_call
	 */
	type: AiobservabilitytypesServerToolCallPartDTOType;
}

export interface AiobservabilitytypesGenericServerToolCallResponseDTO {
	[key: string]: unknown;
}

export enum AiobservabilitytypesServerToolCallResponsePartDTOType {
	server_tool_call_response = 'server_tool_call_response',
}
export interface AiobservabilitytypesServerToolCallResponsePartDTO {
	/**
	 * @type string,null
	 */
	id?: string | null;
	server_tool_call_response: AiobservabilitytypesGenericServerToolCallResponseDTO;
	/**
	 * @type string
	 * @enum server_tool_call_response
	 */
	type: AiobservabilitytypesServerToolCallResponsePartDTOType;
}

export enum AiobservabilitytypesFilePartDTOType {
	file = 'file',
}
export interface AiobservabilitytypesFilePartDTO {
	/**
	 * @type string
	 */
	file_id: string;
	/**
	 * @type string,null
	 */
	mime_type?: string | null;
	/**
	 * @type string
	 */
	modality: string;
	/**
	 * @type string
	 * @enum file
	 */
	type: AiobservabilitytypesFilePartDTOType;
}

export enum AiobservabilitytypesUriPartDTOType {
	uri = 'uri',
}
export interface AiobservabilitytypesUriPartDTO {
	/**
	 * @type string,null
	 */
	mime_type?: string | null;
	/**
	 * @type string
	 */
	modality: string;
	/**
	 * @type string
	 * @enum uri
	 */
	type: AiobservabilitytypesUriPartDTOType;
	/**
	 * @type string
	 */
	uri: string;
}

export enum AiobservabilitytypesReasoningPartDTOType {
	reasoning = 'reasoning',
}
export interface AiobservabilitytypesReasoningPartDTO {
	/**
	 * @type string
	 */
	content: string;
	/**
	 * @type string
	 * @enum reasoning
	 */
	type: AiobservabilitytypesReasoningPartDTOType;
}

export enum AiobservabilitytypesCompactionPartDTOType {
	compaction = 'compaction',
}
export interface AiobservabilitytypesCompactionPartDTO {
	/**
	 * @type string,null
	 */
	content?: string | null;
	/**
	 * @type string,null
	 */
	id?: string | null;
	/**
	 * @type string
	 * @enum compaction
	 */
	type: AiobservabilitytypesCompactionPartDTOType;
}

export interface AiobservabilitytypesGenericPartDTO {
	[key: string]: unknown;
}

export type AiobservabilitytypesPartDTO =
	| AiobservabilitytypesTextPartDTO
	| AiobservabilitytypesToolCallRequestPartDTO
	| AiobservabilitytypesToolCallResponsePartDTO
	| AiobservabilitytypesServerToolCallPartDTO
	| AiobservabilitytypesServerToolCallResponsePartDTO
	| AiobservabilitytypesBlobPartDTO
	| AiobservabilitytypesFilePartDTO
	| AiobservabilitytypesUriPartDTO
	| AiobservabilitytypesReasoningPartDTO
	| AiobservabilitytypesCompactionPartDTO
	| AiobservabilitytypesGenericPartDTO;

export type AiobservabilitytypesPartsDTO = AiobservabilitytypesPartDTO[];

export interface AiobservabilitytypesChatMessageDTO {
	/**
	 * @type string,null
	 */
	name?: string | null;
	parts: AiobservabilitytypesPartsDTO;
	/**
	 * @type string
	 */
	role: string;
}

export type AiobservabilitytypesInputMessagesDTO =
	AiobservabilitytypesChatMessageDTO[];

export interface AiobservabilitytypesOutputMessageDTO {
	/**
	 * @type string,null
	 */
	finish_reason?: string | null;
	/**
	 * @type string,null
	 */
	name?: string | null;
	parts: AiobservabilitytypesPartsDTO;
	/**
	 * @type string
	 */
	role: string;
}

export type AiobservabilitytypesOutputMessagesDTO =
	AiobservabilitytypesOutputMessageDTO[];

export interface AlertmanagertypesChannelDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 * @description The channel configuration as a JSON document.
	 */
	data: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 * @description The channel name. Alert rules and routing policies reference it.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization the channel belongs to.
	 */
	orgId: string;
	/**
	 * @type string
	 * @description The channel kind, such as slack.
	 */
	type: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelSlackConfigDTOKind {
	slack = 'slack',
}
export interface AlertmanagertypesChannelSlackConfirmationDTO {
	/**
	 * @type string
	 * @description The label of the cancel button.
	 */
	dismissText?: string;
	/**
	 * @type string
	 * @description The label of the confirm button.
	 */
	okText?: string;
	/**
	 * @type string
	 * @description The dialog body.
	 */
	text: string;
	/**
	 * @type string
	 * @description The dialog title.
	 */
	title?: string;
}

export interface AlertmanagertypesChannelSlackActionDTO {
	/**
	 * @description A confirmation dialog shown before the action runs.
	 */
	confirm?: AlertmanagertypesChannelSlackConfirmationDTO;
	/**
	 * @type string
	 * @description The action name Slack posts back for a message button; required unless url is set.
	 */
	name?: string;
	/**
	 * @type string
	 * @description The button style: default, primary or danger.
	 */
	style?: string;
	/**
	 * @type string
	 * @description The button label.
	 */
	text: string;
	/**
	 * @type string
	 * @description The Slack action type, normally button.
	 */
	type: string;
	/**
	 * @type string
	 * @description The link the button opens; required unless name is set.
	 */
	url?: string;
	/**
	 * @type string
	 * @description The value Slack posts back with a message button.
	 */
	value?: string;
}

export interface AlertmanagertypesChannelSlackFieldDTO {
	/**
	 * @type boolean,null
	 * @description Render the field side by side with other short fields.
	 */
	short?: boolean | null;
	/**
	 * @type string
	 * @description The field title.
	 */
	title: string;
	/**
	 * @type string
	 * @description The field value; an Alertmanager template.
	 */
	value: string;
}

export interface AlertmanagertypesChannelSlackConfigDTO {
	/**
	 * @type array,null
	 * @description Attachment buttons; each requires type and text plus url or name.
	 */
	actions?: AlertmanagertypesChannelSlackActionDTO[] | null;
	/**
	 * @type string
	 * @format password
	 * @description The Slack incoming webhook URL. A secret; returned by create, update and fetch by ID, never by list.
	 */
	apiUrl: string;
	/**
	 * @type string
	 * @description The channel or user to post to, such as #alerts; empty uses the webhook default.
	 */
	channel?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the attachment color; defaults to the Alertmanager Slack default.
	 */
	color?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the plain-text summary shown where attachments cannot render; defaults to the Alertmanager Slack default.
	 */
	fallback?: string;
	/**
	 * @type array,null
	 * @description Attachment fields appended to the message; each requires title and value.
	 */
	fields?: AlertmanagertypesChannelSlackFieldDTO[] | null;
	/**
	 * @type string
	 * @description Alertmanager template for the attachment footer; defaults to the Alertmanager Slack default.
	 */
	footer?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the text shown above the attachment; defaults to the Alertmanager Slack default.
	 */
	pretext?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the message body; defaults to the Alertmanager Slack default.
	 */
	text?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the message title; defaults to the Alertmanager Slack default.
	 */
	title?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the link the title opens; defaults to the Alertmanager Slack default.
	 */
	titleLink?: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelSlackConfigDTO {
	/**
	 * @enum slack
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelSlackConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelSlackConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelEmailConfigDTOKind {
	email = 'email',
}
/**
 * Extra SMTP headers keyed by canonical MIME header name, such as Subject.
 */
export type AlertmanagertypesChannelEmailConfigDTOHeadersAnyOf = {
	[key: string]: string;
};

/**
 * Extra SMTP headers keyed by canonical MIME header name, such as Subject.
 * @nullable
 */
export type AlertmanagertypesChannelEmailConfigDTOHeaders = AlertmanagertypesChannelEmailConfigDTOHeadersAnyOf | null;

export interface AlertmanagertypesChannelEmailConfigDTO {
	/**
	 * @type object,null
	 * @description Extra SMTP headers keyed by canonical MIME header name, such as Subject.
	 */
	headers?: AlertmanagertypesChannelEmailConfigDTOHeaders;
	/**
	 * @type string
	 * @description Alertmanager template for the HTML body; defaults to the Alertmanager email default.
	 */
	html?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description The recipient addresses, comma separated.
	 */
	to: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelEmailConfigDTO {
	/**
	 * @enum email
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelEmailConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelEmailConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelWebhookConfigDTOKind {
	webhook = 'webhook',
}
export interface AlertmanagertypesChannelWebhookConfigDTO {
	/**
	 * @type string
	 * @format password
	 * @description The bearer token sent in the Authorization header; cannot be combined with username or password.
	 */
	bearerToken?: string;
	/**
	 * @type string
	 * @format password
	 * @description The basic auth password; cannot be combined with bearerToken.
	 */
	password?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to true.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @format password
	 * @description The endpoint that receives the Alertmanager webhook payload. A secret; returned by create, update and fetch by ID, never by list.
	 */
	url: string;
	/**
	 * @type string
	 * @description The basic auth user; cannot be combined with bearerToken.
	 */
	username?: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelWebhookConfigDTO {
	/**
	 * @enum webhook
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelWebhookConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelWebhookConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelPagerdutyConfigDTOKind {
	pagerduty = 'pagerduty',
}
/**
 * Custom details keyed by name, each an Alertmanager template; defaults to the Alertmanager firing and resolved summary set.
 */
export type AlertmanagertypesChannelPagerdutyConfigDTODetailsAnyOf = {
	[key: string]: string;
};

/**
 * Custom details keyed by name, each an Alertmanager template; defaults to the Alertmanager firing and resolved summary set.
 * @nullable
 */
export type AlertmanagertypesChannelPagerdutyConfigDTODetails = AlertmanagertypesChannelPagerdutyConfigDTODetailsAnyOf | null;

export interface AlertmanagertypesChannelPagerdutyConfigDTO {
	/**
	 * @type string
	 * @description The class or type of the event.
	 */
	class?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the client identifier; defaults to the Alertmanager PagerDuty default.
	 */
	client?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the client URL; defaults to the Alertmanager PagerDuty default.
	 */
	clientUrl?: string;
	/**
	 * @type string
	 * @description The component of the source machine that is responsible for the event.
	 */
	component?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the incident summary; defaults to the Alertmanager PagerDuty default.
	 */
	description?: string;
	/**
	 * @type object,null
	 * @description Custom details keyed by name, each an Alertmanager template; defaults to the Alertmanager firing and resolved summary set.
	 */
	details?: AlertmanagertypesChannelPagerdutyConfigDTODetails;
	/**
	 * @type string
	 * @description The logical grouping of components the event belongs to.
	 */
	group?: string;
	/**
	 * @type string
	 * @format password
	 * @description The Events API v2 integration key. A secret; returned by create, update and fetch by ID, never by list.
	 */
	routingKey: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to true.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description The incident severity: critical, error, warning or info.
	 */
	severity?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the unique location of the affected system; defaults to client.
	 */
	source?: string;
	/**
	 * @type string
	 * @description The Events API endpoint; empty uses the PagerDuty default.
	 */
	url?: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelPagerdutyConfigDTO {
	/**
	 * @enum pagerduty
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelPagerdutyConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelPagerdutyConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelOpsgenieConfigDTOKind {
	opsgenie = 'opsgenie',
}
/**
 * Custom alert details keyed by name, each an Alertmanager template.
 */
export type AlertmanagertypesChannelOpsgenieConfigDTODetailsAnyOf = {
	[key: string]: string;
};

/**
 * Custom alert details keyed by name, each an Alertmanager template.
 * @nullable
 */
export type AlertmanagertypesChannelOpsgenieConfigDTODetails = AlertmanagertypesChannelOpsgenieConfigDTODetailsAnyOf | null;

export interface AlertmanagertypesChannelOpsgenieConfigDTO {
	/**
	 * @type string
	 * @format password
	 * @description The Opsgenie API integration key. A secret; returned by create, update and fetch by ID, never by list.
	 */
	apiKey: string;
	/**
	 * @type string
	 * @description The Opsgenie API host; empty uses the global Alertmanager default.
	 */
	apiUrl?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the alert description; defaults to the Alertmanager Opsgenie default.
	 */
	description?: string;
	/**
	 * @type object,null
	 * @description Custom alert details keyed by name, each an Alertmanager template.
	 */
	details?: AlertmanagertypesChannelOpsgenieConfigDTODetails;
	/**
	 * @type string
	 * @description Alertmanager template for the alert message; defaults to the Alertmanager Opsgenie default.
	 */
	message?: string;
	/**
	 * @type string
	 * @description The alert priority, P1 to P5.
	 */
	priority?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to true.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the alert source; defaults to the Alertmanager Opsgenie default.
	 */
	source?: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelOpsgenieConfigDTO {
	/**
	 * @enum opsgenie
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelOpsgenieConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelOpsgenieConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelMSTeamsConfigDTOKind {
	msteams = 'msteams',
}
export interface AlertmanagertypesChannelMSTeamsConfigDTO {
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to true.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the card body; defaults to the Alertmanager Teams default.
	 */
	text?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the card title; defaults to the Alertmanager Teams default.
	 */
	title?: string;
	/**
	 * @type string
	 * @format password
	 * @description The Teams incoming webhook URL. A secret; returned by create, update and fetch by ID, never by list.
	 */
	webhookUrl: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelMSTeamsConfigDTO {
	/**
	 * @enum msteams
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelMSTeamsConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelMSTeamsConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelGoogleChatConfigDTOKind {
	googlechat = 'googlechat',
}
export interface AlertmanagertypesChannelGoogleChatConfigDTO {
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the message body; defaults to the SigNoz Google Chat default.
	 */
	text?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the message title; defaults to the SigNoz Google Chat default.
	 */
	title?: string;
	/**
	 * @type string
	 * @format password
	 * @description The Google Chat space webhook URL. A secret; returned by create, update and fetch by ID, never by list.
	 */
	webhookUrl: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelGoogleChatConfigDTO {
	/**
	 * @enum googlechat
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelGoogleChatConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelGoogleChatConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJiraConfigDTOKind {
	jira = 'jira',
}
/**
 * Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives.
 */
export type AlertmanagertypesChannelJiraConfigDTOCustomFieldsAnyOf = {
	[key: string]: unknown;
};

/**
 * Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives.
 * @nullable
 */
export type AlertmanagertypesChannelJiraConfigDTOCustomFields = AlertmanagertypesChannelJiraConfigDTOCustomFieldsAnyOf | null;

export interface AlertmanagertypesChannelJiraConfigDTO {
	/**
	 * @type string
	 * @format password
	 * @description The Atlassian API token paired with email. A secret; returned by create, update and fetch by ID, never by list.
	 */
	apiToken: string;
	/**
	 * @type object,null
	 * @description Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives.
	 */
	customFields?: AlertmanagertypesChannelJiraConfigDTOCustomFields;
	/**
	 * @type string
	 * @description Alertmanager template for the issue description, rendered as markdown; defaults to the SigNoz Jira default.
	 */
	description?: string;
	/**
	 * @type string
	 * @description The Atlassian account email used for basic auth.
	 */
	email: string;
	/**
	 * @type string
	 * @description The issue type name, such as Bug.
	 */
	issueType: string;
	/**
	 * @type array,null
	 * @description Labels added to every issue.
	 */
	labels?: string[] | null;
	/**
	 * @type string
	 * @description The priority name assigned to new issues.
	 */
	priority?: string;
	/**
	 * @type string
	 * @description The key of the project issues are created in.
	 */
	project: string;
	/**
	 * @type string
	 * @description How long after resolution a firing alert reopens the issue instead of creating a new one, as a Prometheus duration in canonical form such as 3d; defaults to 3d.
	 */
	reopenDuration?: string;
	/**
	 * @type string
	 * @description The transition applied when an alert fires again on a resolved issue.
	 */
	reopenTransition?: string;
	/**
	 * @type string
	 * @description The transition applied to the issue when the alert resolves.
	 */
	resolveTransition?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description The base URL of the Jira Cloud site, for example https://example.atlassian.net. Only Jira Cloud is supported.
	 */
	site: string;
	/**
	 * @type string
	 * @description Alertmanager template for the issue summary; defaults to the SigNoz Jira default.
	 */
	summary?: string;
	/**
	 * @type string
	 * @description The resolution name that stops an issue from being reopened.
	 */
	wontFixResolution?: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJiraConfigDTO {
	/**
	 * @enum jira
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJiraConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelJiraConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJSMOpsConfigDTOKind {
	jsmops = 'jsmops',
}
export interface AlertmanagertypesChannelJSMOpsConfigDTO {
	/**
	 * @type string
	 * @format password
	 * @description The JSM Ops integration API key. A secret; returned by create, update and fetch by ID, never by list.
	 */
	apiKey: string;
	/**
	 * @type string
	 * @description Alertmanager template for the alert description; defaults to the SigNoz JSM Ops default.
	 */
	description?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the alert message; defaults to the SigNoz JSM Ops default.
	 */
	message?: string;
	/**
	 * @type string
	 * @description The alert priority, P1 to P5.
	 */
	priority?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Comma-separated tags attached to the alert; defaults to signoz.
	 */
	tags?: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJSMOpsConfigDTO {
	/**
	 * @enum jsmops
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJSMOpsConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelJSMOpsConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelIncidentIOConfigDTOKind {
	incidentio = 'incidentio',
}
/**
 * Extra event metadata keyed by name, merged over the group's common labels; values are Alertmanager templates.
 */
export type AlertmanagertypesChannelIncidentIOConfigDTOMetadataAnyOf = {
	[key: string]: string;
};

/**
 * Extra event metadata keyed by name, merged over the group's common labels; values are Alertmanager templates.
 * @nullable
 */
export type AlertmanagertypesChannelIncidentIOConfigDTOMetadata = AlertmanagertypesChannelIncidentIOConfigDTOMetadataAnyOf | null;

export interface AlertmanagertypesChannelIncidentIOConfigDTO {
	/**
	 * @type string
	 * @description Alertmanager template for the alert description, rendered as markdown; defaults to the SigNoz incident.io default.
	 */
	description?: string;
	/**
	 * @type object,null
	 * @description Extra event metadata keyed by name, merged over the group's common labels; values are Alertmanager templates.
	 */
	metadata?: AlertmanagertypesChannelIncidentIOConfigDTOMetadata;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the alert title; defaults to the SigNoz incident.io default.
	 */
	title?: string;
	/**
	 * @type string
	 * @format password
	 * @description The alert source secret token, without the Bearer prefix. A secret; returned by create, update and fetch by ID, never by list.
	 */
	token: string;
	/**
	 * @type string
	 * @description The alert source HTTP alert events endpoint copied from its setup page.
	 */
	url: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelIncidentIOConfigDTO {
	/**
	 * @enum incidentio
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelIncidentIOConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelIncidentIOConfigDTO;
}

/**
 * The channel provider kind this variant accepts.
 */
export enum AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelTelegramConfigDTOKind {
	telegram = 'telegram',
}
export interface AlertmanagertypesChannelTelegramConfigDTO {
	/**
	 * @type string
	 */
	apiUrl?: string;
	/**
	 * @type string
	 * @format password
	 */
	botToken: string;
	/**
	 * @type integer
	 * @format int64
	 */
	chatId: number;
	/**
	 * @type boolean
	 */
	disableNotifications?: boolean;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type integer
	 */
	messageThreadId?: number;
	/**
	 * @type boolean,null
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 */
	title?: string;
}

export interface AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelTelegramConfigDTO {
	/**
	 * @enum telegram
	 * @type string
	 * @description The channel provider kind this variant accepts.
	 */
	kind: AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelTelegramConfigDTOKind;
	/**
	 * @description The provider-specific configuration for this kind.
	 */
	spec: AlertmanagertypesChannelTelegramConfigDTO;
}

export type AlertmanagertypesChannelConfigDTO =
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelSlackConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelEmailConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelWebhookConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelPagerdutyConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelOpsgenieConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelMSTeamsConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelGoogleChatConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJiraConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelJSMOpsConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelIncidentIOConfigDTO
	| AlertmanagertypesChannelConfigVariantGithubComSigNozSignozPkgTypesAlertmanagertypesChannelTelegramConfigDTO;

export enum AlertmanagertypesChannelDefectDTO {
	none = 'none',
	missing_type = 'missing_type',
	multiple_notifiers = 'multiple_notifiers',
	unsupported_notifier = 'unsupported_notifier',
	unrepresentable = 'unrepresentable',
}
export enum AlertmanagertypesChannelKindDTO {
	slack = 'slack',
	email = 'email',
	webhook = 'webhook',
	pagerduty = 'pagerduty',
	opsgenie = 'opsgenie',
	msteams = 'msteams',
	googlechat = 'googlechat',
	jira = 'jira',
	jsmops = 'jsmops',
	incidentio = 'incidentio',
	telegram = 'telegram',
}
export enum AlertmanagertypesChannelListOrderDTO {
	asc = 'asc',
	desc = 'desc',
}
export enum AlertmanagertypesChannelListSortDTO {
	updated_at = 'updated_at',
	created_at = 'created_at',
	name = 'name',
}
export enum AlertmanagertypesChannelRepairActionDTO {
	none = 'none',
	retype = 'retype',
	split = 'split',
	delete = 'delete',
}
export interface AlertmanagertypesListedNotificationChannelDTO {
	/**
	 * @type string
	 * @format date-time
	 * @description When the channel was created, as an RFC 3339 timestamp.
	 */
	createdAt: string;
	/**
	 * @type string
	 * @description The label shown in the UI. Alert rules and routing policies reference it, not name.
	 */
	displayName: string;
	/**
	 * @type string
	 * @description The channel UUID.
	 */
	id: string;
	/**
	 * @description The channel provider kind.
	 */
	kind: AlertmanagertypesChannelKindDTO;
	/**
	 * @type string
	 * @description The immutable DNS-1123 identifier of the channel. Alert rules and routing policies reference displayName, not name.
	 */
	name: string;
	/**
	 * @type string
	 * @format date-time
	 * @description When the channel was last updated, as an RFC 3339 timestamp.
	 */
	updatedAt: string;
}

export interface AlertmanagertypesChannelRepairDTO {
	/**
	 * @description The repair that makes the channel readable: none, retype, split or delete.
	 */
	action: AlertmanagertypesChannelRepairActionDTO;
	/**
	 * @type boolean
	 * @description Whether the action was written; false on a dry run.
	 */
	applied: boolean;
	/**
	 * @type array
	 * @description Why the action was not, or would not be, applied.
	 */
	blockers?: string[];
	/**
	 * @type array,null
	 * @description The channels that exist once the action is applied.
	 */
	channels?: AlertmanagertypesListedNotificationChannelDTO[] | null;
	/**
	 * @description Why v2 cannot read the channel; none when it is readable.
	 */
	defect: AlertmanagertypesChannelDefectDTO;
	/**
	 * @type string
	 * @description A human-readable explanation of the defect.
	 */
	detail?: string;
	/**
	 * @type string
	 * @description The UUID of the diagnosed channel.
	 */
	id: string;
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
	 * @description The alert fingerprint, a hash of its label set.
	 */
	fingerprint?: string;
	/**
	 * @type string
	 */
	generatorURL?: string;
	labels?: ModelLabelSetDTO;
	/**
	 * @type array,null
	 * @description The display names of the channels the alert is routed to.
	 */
	receivers?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	startsAt?: string;
	/**
	 * @description The alert state and the silences and inhibitions suppressing it.
	 */
	status?: TypesAlertStatusDTO;
}

export enum AlertmanagertypesExpressionKindDTO {
	rule = 'rule',
	policy = 'policy',
}
export interface AlertmanagertypesGettableNotificationChannelDTO {
	/**
	 * @description The provider kind and spec, credentials included.
	 */
	config: AlertmanagertypesChannelConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 * @description When the channel was created, as an RFC 3339 timestamp.
	 */
	createdAt: string;
	/**
	 * @type string
	 * @description The label shown in the UI. Alert rules and routing policies reference it, not name.
	 */
	displayName: string;
	/**
	 * @type string
	 * @description The channel UUID.
	 */
	id: string;
	/**
	 * @type string
	 * @description The immutable DNS-1123 identifier of the channel. Alert rules and routing policies reference displayName, not name.
	 */
	name: string;
	/**
	 * @type string
	 * @format date-time
	 * @description When the channel was last updated, as an RFC 3339 timestamp.
	 */
	updatedAt: string;
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
	/**
	 * @description HTTP client settings for the webhook call.
	 */
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 * @description Alertmanager template for the message body.
	 */
	text?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the message title.
	 */
	title?: string;
	/**
	 * @description The Google Chat space webhook URL.
	 */
	webhook_url?: ConfigSecretURLDTO;
}

/**
 * Extra event metadata keyed by name, merged over the group's common labels; values are Alertmanager templates.
 */
export type AlertmanagertypesIncidentIOReceiverConfigDTOMetadata = {
	[key: string]: string;
};

export interface AlertmanagertypesIncidentIOReceiverConfigDTO {
	/**
	 * @type string
	 * @description Alertmanager template for the alert description.
	 */
	description?: string;
	/**
	 * @description HTTP client settings for the API call.
	 */
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type object
	 * @description Extra event metadata keyed by name, merged over the group's common labels; values are Alertmanager templates.
	 */
	metadata?: AlertmanagertypesIncidentIOReceiverConfigDTOMetadata;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 * @description Alertmanager template for the alert title.
	 */
	title?: string;
	/**
	 * @type string
	 * @description The alert source secret token, without the Bearer prefix.
	 */
	token?: string;
	/**
	 * @type string
	 * @description The alert source HTTP alert events endpoint.
	 */
	url?: string;
}

export interface AlertmanagertypesJSMOpsReceiverConfigDTO {
	/**
	 * @type string
	 * @description The JSM Ops integration API key.
	 */
	api_key?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the alert description.
	 */
	description?: string;
	/**
	 * @description HTTP client settings for the API call.
	 */
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 * @description Alertmanager template for the alert message.
	 */
	message?: string;
	/**
	 * @type string
	 * @description The alert priority, P1 to P5.
	 */
	priority?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 * @description Comma-separated tags attached to the alert.
	 */
	tags?: string;
}

/**
 * Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives.
 */
export type AlertmanagertypesJiraReceiverConfigDTOCustomFields = {
	[key: string]: unknown;
};

export type ModelDurationDTO = number;

export interface AlertmanagertypesJiraReceiverConfigDTO {
	/**
	 * @type object
	 * @description Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives.
	 */
	custom_fields?: AlertmanagertypesJiraReceiverConfigDTOCustomFields;
	/**
	 * @type string
	 * @description Alertmanager template for the issue description.
	 */
	description?: string;
	/**
	 * @description HTTP client settings; basic auth carries the account email and API token.
	 */
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 * @description The issue type name.
	 */
	issue_type?: string;
	/**
	 * @type array
	 * @description Labels added to every issue.
	 */
	labels?: string[];
	/**
	 * @type string
	 * @description The priority name assigned to new issues.
	 */
	priority?: string;
	/**
	 * @type string
	 * @description The key of the project issues are created in.
	 */
	project?: string;
	/**
	 * @description How long after resolution a firing alert reopens the issue; a Prometheus duration, at least 1m.
	 */
	reopen_duration?: ModelDurationDTO;
	/**
	 * @type string
	 * @description The transition applied when an alert fires again on a resolved issue.
	 */
	reopen_transition?: string;
	/**
	 * @type string
	 * @description The transition applied when the alert resolves.
	 */
	resolve_transition?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 * @description The Jira Cloud base URL.
	 */
	site?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the issue summary.
	 */
	summary?: string;
	/**
	 * @type string
	 * @description The resolution name that stops an issue from being reopened.
	 */
	wont_fix_resolution?: string;
}

export interface AlertmanagertypesListableNotificationChannelDTO {
	/**
	 * @type array
	 * @description The channels on this page, without their configuration; fetch a channel by ID for that.
	 */
	channels: AlertmanagertypesListedNotificationChannelDTO[];
	/**
	 * @type integer
	 * @format int64
	 * @description The number of channels the filter matches across all pages.
	 */
	total: number;
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

export interface ConfigURLType2DTO {
	[key: string]: unknown;
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

export type TimeDurationDTO = number;

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

export interface AlertmanagertypesTelegramReceiverConfigDTO {
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
	title?: string;
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
	incidentio_configs?: AlertmanagertypesIncidentIOReceiverConfigDTO[];
	/**
	 * @type array
	 */
	jira_configs?: AlertmanagertypesJiraReceiverConfigDTO[];
	/**
	 * @type array
	 */
	jsmops_configs?: AlertmanagertypesJSMOpsReceiverConfigDTO[];
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
	telegram_configs?: AlertmanagertypesTelegramReceiverConfigDTO[];
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

export interface AlertmanagertypesPostableNotificationChannelDTO {
	/**
	 * @description The provider kind and its spec.
	 */
	config: AlertmanagertypesChannelConfigDTO;
	/**
	 * @type string
	 * @description The label shown in the UI. Alert rules and routing policies reference it, not name. Defaults to name; required when generateName is true.
	 */
	displayName?: string;
	/**
	 * @type boolean
	 * @description Derive name from displayName plus a random suffix instead of supplying it. Defaults to false.
	 */
	generateName?: boolean;
	/**
	 * @type string
	 * @description The immutable DNS-1123 identifier of the channel (lowercase letters, digits and hyphens, at most 63 characters). Required unless generateName is true, in which case it must be empty. Alert rules and routing policies reference displayName, not name.
	 */
	name?: string;
}

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
	incidentio_configs?: AlertmanagertypesIncidentIOReceiverConfigDTO[];
	/**
	 * @type array
	 */
	jira_configs?: AlertmanagertypesJiraReceiverConfigDTO[];
	/**
	 * @type array
	 */
	jsmops_configs?: AlertmanagertypesJSMOpsReceiverConfigDTO[];
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
	telegram_configs?: AlertmanagertypesTelegramReceiverConfigDTO[];
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

export interface AlertmanagertypesRepairChannelParamsDTO {
	/**
	 * @type boolean
	 * @description Apply the diagnosed action; defaults to false, a dry run that only reports it.
	 */
	apply?: boolean;
}

export interface AlertmanagertypesTestableNotificationChannelDTO {
	/**
	 * @description The replacement provider kind and spec. Name and displayName are immutable and not part of the body.
	 */
	config: AlertmanagertypesChannelConfigDTO;
}

export interface AlertmanagertypesUpdatableNotificationChannelDTO {
	/**
	 * @description The replacement provider kind and spec. Name and displayName are immutable and not part of the body.
	 */
	config: AlertmanagertypesChannelConfigDTO;
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

/**
 * The kind of authn provider.
 */
export enum AuthtypesAuthDomainConfigSAMLDTOKind {
	saml = 'saml',
}
export interface AuthtypesSamlConfigDTO {
	attributeMapping?: AuthtypesAttributeMappingDTO;
	/**
	 * @type string
	 */
	certificate: string;
	/**
	 * @type string
	 */
	entityId: string;
	/**
	 * @type boolean
	 */
	insecureSkipAuthNRequestsSigned?: boolean;
	/**
	 * @type string
	 */
	location: string;
}

export interface AuthtypesAuthDomainConfigSAMLDTO {
	/**
	 * @type string
	 * @enum saml
	 * @description The kind of authn provider.
	 */
	kind: AuthtypesAuthDomainConfigSAMLDTOKind;
	/**
	 * @description The saml configuration.
	 */
	spec: AuthtypesSamlConfigDTO;
}

/**
 * The kind of authn provider.
 */
export enum AuthtypesAuthDomainConfigGoogleDTOKind {
	google = 'google',
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
	clientId: string;
	/**
	 * @type string
	 * @format password
	 */
	clientSecret: string;
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
	 * @format password
	 */
	serviceAccountJson?: string;
}

export interface AuthtypesAuthDomainConfigGoogleDTO {
	/**
	 * @type string
	 * @enum google
	 * @description The kind of authn provider.
	 */
	kind: AuthtypesAuthDomainConfigGoogleDTOKind;
	/**
	 * @description The google auth configuration.
	 */
	spec: AuthtypesGoogleConfigDTO;
}

/**
 * The kind of authn provider.
 */
export enum AuthtypesAuthDomainConfigOIDCDTOKind {
	oidc = 'oidc',
}
export interface AuthtypesOIDCConfigDTO {
	claimMapping?: AuthtypesAttributeMappingDTO;
	/**
	 * @type string
	 */
	clientId: string;
	/**
	 * @type string
	 * @format password
	 */
	clientSecret: string;
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
	issuer: string;
	/**
	 * @type string
	 */
	issuerAlias?: string;
}

export interface AuthtypesAuthDomainConfigOIDCDTO {
	/**
	 * @type string
	 * @enum oidc
	 * @description The kind of authn provider.
	 */
	kind: AuthtypesAuthDomainConfigOIDCDTOKind;
	/**
	 * @description The oidc configuration.
	 */
	spec: AuthtypesOIDCConfigDTO;
}

export type AuthtypesAuthDomainConfigDTO =
	| AuthtypesAuthDomainConfigSAMLDTO
	| AuthtypesAuthDomainConfigGoogleDTO
	| AuthtypesAuthDomainConfigOIDCDTO;

export enum AuthtypesAuthNProviderDTO {
	google = 'google',
	saml = 'saml',
	email_password = 'email_password',
	oidc = 'oidc',
}
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

export type AuthtypesRoleMappingDTOGroupMappingsAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type AuthtypesRoleMappingDTOGroupMappings = AuthtypesRoleMappingDTOGroupMappingsAnyOf | null;

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

export interface AuthtypesGettableAuthDomainDTO {
	authNProviderInfo?: AuthtypesAuthNProviderInfoDTO;
	config?: AuthtypesAuthDomainConfigDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
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
	roleMapping?: AuthtypesRoleMappingDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}

export interface AuthtypesGettableRoleDTO {
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
	'deployment-host' = 'deployment-host',
	logs = 'logs',
	traces = 'traces',
	metrics = 'metrics',
	'audit-logs' = 'audit-logs',
	'meter-metrics' = 'meter-metrics',
	'logs-field' = 'logs-field',
	'traces-field' = 'traces-field',
	'metrics-field' = 'metrics-field',
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
	config: AuthtypesAuthDomainConfigDTO;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type string
	 */
	name: string;
	roleMapping?: AuthtypesRoleMappingDTO;
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
	config: AuthtypesAuthDomainConfigDTO;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	roleMapping?: AuthtypesRoleMappingDTO;
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

export enum CloudintegrationtypesRegionStateDTO {
	enabled = 'enabled',
	disabled = 'disabled',
}
export interface CloudintegrationtypesRegionSyncStateDTO {
	state: CloudintegrationtypesRegionStateDTO;
}

export type CloudintegrationtypesSyncStateDTORegions = {
	[key: string]: CloudintegrationtypesRegionSyncStateDTO;
};

/**
 * @nullable
 */
export type CloudintegrationtypesSyncStateDTO = {
	/**
	 * @type boolean
	 */
	inSync: boolean;
	/**
	 * @type object
	 */
	regions: CloudintegrationtypesSyncStateDTORegions;
	/**
	 * @type integer
	 * @format int64
	 */
	version: number;
} | null;

export type CloudintegrationtypesAgentReportDTODataAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type CloudintegrationtypesAgentReportDTOData = CloudintegrationtypesAgentReportDTODataAnyOf | null;

/**
 * @nullable
 */
export type CloudintegrationtypesAgentReportDTO = {
	/**
	 * @type object,null
	 */
	data: CloudintegrationtypesAgentReportDTOData;
	syncState: CloudintegrationtypesSyncStateDTO | null;
	/**
	 * @type integer
	 * @format int64
	 */
	timestampMillis: number;
} | null;

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

export enum CloudintegrationtypesGCPConnectionMethodDTO {
	manual = 'manual',
	agent = 'agent',
}
export interface CloudintegrationtypesGCPAccountConfigDTO {
	connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO;
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
	cloudsql_postgres = 'cloudsql_postgres',
	memorystore_redis = 'memorystore_redis',
	computeengine = 'computeengine',
	gke = 'gke',
	cloudstorage = 'cloudstorage',
	cloudsql_mysql = 'cloudsql_mysql',
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

export interface CloudintegrationtypesGCPConnectionArtifactDTO {
	/**
	 * @type string
	 */
	cliCommand: string;
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

/**
 * @nullable
 */
export type CloudintegrationtypesGCPLogsCollectionStrategyDTO = {
	/**
	 * @type string
	 */
	sinkFilter: string;
} | null;

/**
 * @nullable
 */
export type CloudintegrationtypesGCPMetricsCollectionStrategyDTO = {
	/**
	 * @type array
	 */
	metricNames: string[];
} | null;

export interface CloudintegrationtypesGCPTelemetryCollectionStrategyDTO {
	logs: CloudintegrationtypesGCPLogsCollectionStrategyDTO | null;
	metrics: CloudintegrationtypesGCPMetricsCollectionStrategyDTO | null;
}

export interface CloudintegrationtypesGCPIntegrationConfigDTO {
	connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO;
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
	telemetryCollectionStrategy: CloudintegrationtypesGCPTelemetryCollectionStrategyDTO;
}

export interface CloudintegrationtypesGCPPostableAccountConfigDTO {
	connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO;
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
	syncState: CloudintegrationtypesSyncStateDTO | null;
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
	gcp?: CloudintegrationtypesGCPPostableAccountConfigDTO;
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
export type CloudintegrationtypesPostableAgentCheckInDTOData = CloudintegrationtypesPostableAgentCheckInDTODataAnyOf | null;

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
	/**
	 * @type integer,null
	 */
	syncedVersion?: number | null;
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
	 * @type array
	 */
	projectIds: string[];
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

export interface CommonJSONRefDTO {
	/**
	 * @type string
	 */
	$ref?: string;
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

/**
 * The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
 */
export enum DashboardtypesAIBuilderQuerySpecDTOSignal {
	traces = 'traces',
}
export interface Querybuildertypesv5TraceAggregationDTO {
	/**
	 * @type string
	 * @description The name the aggregation is reported under; when omitted, the result carries the alias __result_N, with N the zero-based index of the aggregation.
	 */
	alias?: string;
	/**
	 * @type string
	 * @description The aggregation over spans, such as count(), sum(item_price), p99(duration_nano) or countIf(day > 10).
	 */
	expression?: string;
}

/**
 * How the upper bounds are spaced.
 */
export enum Querybuildertypesv5BucketOptionsLinearDTOKind {
	linear = 'linear',
}
export interface Querybuildertypesv5LinearBucketsSpecDTO {
	/**
	 * @type number
	 * @format double
	 * @description The upper bound of the last regular band; values above it are counted in a trailing overflow band.
	 */
	maxValue: number;
	/**
	 * @type integer
	 * @description The number of evenly spaced bands between 0 and maxValue. A default applies when omitted or 0.
	 */
	numBuckets?: number;
}

export interface Querybuildertypesv5BucketOptionsLinearDTO {
	/**
	 * @type string
	 * @enum linear
	 * @description How the upper bounds are spaced.
	 */
	kind: Querybuildertypesv5BucketOptionsLinearDTOKind;
	/**
	 * @description The evenly spaced bucket specification.
	 */
	spec: Querybuildertypesv5LinearBucketsSpecDTO;
}

/**
 * How the upper bounds are spaced.
 */
export enum Querybuildertypesv5BucketOptionsLogDTOKind {
	log = 'log',
}
export interface Querybuildertypesv5LogBucketsSpecDTO {
	/**
	 * @type integer,null
	 * @description The exponential histogram scale: 2^scale bands per doubling of the value. The maximum supported scale applies when omitted.
	 */
	scale?: number | null;
}

export interface Querybuildertypesv5BucketOptionsLogDTO {
	/**
	 * @type string
	 * @enum log
	 * @description How the upper bounds are spaced.
	 */
	kind: Querybuildertypesv5BucketOptionsLogDTOKind;
	/**
	 * @description The logarithmic bucket specification.
	 */
	spec: Querybuildertypesv5LogBucketsSpecDTO;
}

export type Querybuildertypesv5BucketOptionsDTO =
	| Querybuildertypesv5BucketOptionsLinearDTO
	| Querybuildertypesv5BucketOptionsLogDTO;

export interface Querybuildertypesv5FilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
}

/**
 * The argument value as a number, string or boolean, for example the threshold for cutOffMin or the duration for timeShift.
 */
export type Querybuildertypesv5FunctionArgDTOValue = number | string;

export interface Querybuildertypesv5FunctionArgDTO {
	/**
	 * @type string
	 * @description The argument name for functions that take named arguments, such as z_score_threshold or seasonality for anomaly.
	 */
	name?: string;
	/**
	 * @description The argument value as a number, string or boolean, for example the threshold for cutOffMin or the duration for timeShift.
	 */
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
	 * @type array,null
	 * @description The function arguments; which ones are required depends on the function, for example a threshold for the cutOff and clamp functions.
	 */
	args?: Querybuildertypesv5FunctionArgDTO[] | null;
	/**
	 * @description The function to apply, such as cutOffMin, cutOffMax, clampMin, clampMax, absolute, runningDiff, log2, log10, cumulativeSum, ewma3, ewma5, ewma7, median3, median5, median7, timeShift, anomaly or fillZero.
	 */
	name?: Querybuildertypesv5FunctionNameDTO;
}

export enum TelemetrytypesFieldContextDTO {
	metric = 'metric',
	log = 'log',
	span = 'span',
	trace = 'trace',
	resource = 'resource',
	scope = 'scope',
	attribute = 'attribute',
	body = 'body',
	'' = '',
}
export enum TelemetrytypesFieldDataTypeDTO {
	string = 'string',
	bool = 'bool',
	float64 = 'float64',
	int64 = 'int64',
	number = 'number',
	'' = '',
}
export enum TelemetrytypesSignalDTO {
	traces = 'traces',
	logs = 'logs',
	metrics = 'metrics',
	'' = '',
}
export interface Querybuildertypesv5GroupByKeyDTO {
	/**
	 * @type string
	 * @description Human-readable summary of the field, present only for well-known fields.
	 */
	description?: string;
	/**
	 * @description Where the field lives: resource, attribute, scope, span, trace, log, body or metric. Empty means unspecified, so the server resolves it.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Data type of the field values: string, bool, int64, float64 or number. Empty means unspecified.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description The field name, such as service.name, k8s.pod.name or http.response.status_code. Dots are part of the name, and the names available depend on the signal and the data ingested.
	 */
	name: string;
	/**
	 * @description The signal the field belongs to: traces, logs or metrics. Empty means any signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 * @description Unit of the field values, present only for well-known fields.
	 */
	unit?: string;
}

export interface Querybuildertypesv5HavingDTO {
	/**
	 * @type string
	 * @description A condition on aggregation results in the filter syntax, referencing an alias or expression, for example count() > 100.
	 */
	expression?: string;
}

export interface Querybuildertypesv5LimitByDTO {
	/**
	 * @type array,null
	 * @description The group-by field names that partition the result before the limit is applied.
	 */
	keys?: string[] | null;
	/**
	 * @type string
	 * @description The aggregation alias or expression whose value ranks entries within each partition.
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
	 * @description Human-readable summary of the field, present only for well-known fields.
	 */
	description?: string;
	/**
	 * @description Where the field lives: resource, attribute, scope, span, trace, log, body or metric. Empty means unspecified, so the server resolves it.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Data type of the field values: string, bool, int64, float64 or number. Empty means unspecified.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description The field name, such as service.name, k8s.pod.name or http.response.status_code. Dots are part of the name, and the names available depend on the signal and the data ingested.
	 */
	name: string;
	/**
	 * @description The signal the field belongs to: traces, logs or metrics. Empty means any signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 * @description Unit of the field values, present only for well-known fields.
	 */
	unit?: string;
}

export interface Querybuildertypesv5OrderByDTO {
	/**
	 * @description The sort direction: asc or desc.
	 */
	direction?: Querybuildertypesv5OrderDirectionDTO;
	/**
	 * @description The sort key. For aggregation requests name is a group-by field such as service.name, an aggregation alias, or the aggregation expression: count() or p99(duration_nano) for traces and logs; for metrics the spaceAggregation(timeAggregation(metricName)) form such as sum(rate(signoz_calls_total)), p99(metricName) for histogram metrics, or __result. Raw requests sort by any field, such as timestamp.
	 */
	key?: Querybuildertypesv5OrderByKeyDTO;
}

/**
 * Step interval. Accepts a Go duration string (e.g., "60s", "1m", "1h") or a number representing seconds (e.g., 60).
 */
export type Querybuildertypesv5StepDTO = string | number;

export interface Querybuildertypesv5SecondaryAggregationDTO {
	/**
	 * @type string
	 * @description The name the aggregation is reported under; when omitted, the result carries the alias __result_N, with N the zero-based index of the aggregation.
	 */
	alias?: string;
	/**
	 * @type string
	 * @description The aggregation over the primary results, such as count(), sum(item_price) or countIf(day > 10).
	 */
	expression?: string;
	/**
	 * @type array,null
	 * @description The fields to group this aggregation by.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @type integer
	 * @description The maximum number of groups to return. Unlimited when 0.
	 */
	limit?: number;
	/**
	 * @description Applies limit within each distinct combination of the given keys.
	 */
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type array,null
	 * @description The sort order of this aggregation result.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @description The time bucket for this aggregation: seconds as a number or a Go duration string. Uses the primary aggregation step when omitted.
	 */
	stepInterval?: Querybuildertypesv5StepDTO;
}

export interface TelemetrytypesTelemetryFieldKeyDTO {
	/**
	 * @type string
	 * @description Human-readable summary of the field, present only for well-known fields.
	 */
	description?: string;
	/**
	 * @description Where the field lives: resource, attribute, scope, span, trace, log, body or metric. Empty means unspecified, so the server resolves it.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Data type of the field values: string, bool, int64, float64 or number. Empty means unspecified.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description The field name, such as service.name, k8s.pod.name or http.response.status_code. Dots are part of the name, and the names available depend on the signal and the data ingested.
	 */
	name: string;
	/**
	 * @description The signal the field belongs to: traces, logs or metrics. Empty means any signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 * @description Unit of the field values, present only for well-known fields.
	 */
	unit?: string;
}

export enum TelemetrytypesSourceDTO {
	meter = 'meter',
	'' = '',
}
export interface DashboardtypesAIBuilderQuerySpecDTO {
	/**
	 * @type array,null
	 * @description The aggregations to compute, one result per entry. Traces and logs take expressions such as count() or p99(duration_nano); metrics take a metricName with time and space aggregations. Omit for raw requests.
	 */
	aggregations?: Querybuildertypesv5TraceAggregationDTO[] | null;
	/**
	 * @description The value axis to count this query into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw.
	 */
	bucketOptions?: Querybuildertypesv5BucketOptionsDTO;
	/**
	 * @type string
	 * @description The opaque nextCursor value from a previous raw result, used to fetch the next page.
	 */
	cursor?: string;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response; the query may still run and can still feed a formula or trace operator. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @description The filter that selects spans, in the query filter syntax, for example service.name = 'frontend' AND http.response.status_code >= 500.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series, such as absolute, cumulativeSum, timeShift or anomaly.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to group aggregations by; each group becomes a series or a row with the field as a label or column.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @description A filter applied to aggregation results, referencing aliases or expressions, for example count() > 100.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by group-by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of rows for raw requests, or of series or rows for grouped aggregations, keeping the top entries by order. When 0, aggregations are unlimited while raw requests ordered by timestamp return a page of 10000 rows; follow nextCursor for the rest.
	 */
	limit?: number;
	/**
	 * @description Reserved for applying limit within each combination of the given group-by keys. Accepted but currently ignored.
	 */
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type string
	 * @description The unique name of the query, such as A or B; formulas, trace operators and selectedQueryName refer to it.
	 */
	name?: string;
	/**
	 * @type integer
	 * @description The number of rows to skip before returning results. Prefer cursor for raw requests.
	 */
	offset?: number;
	/**
	 * @type array,null
	 * @description The sort order of the result. Order by a group-by field, an aggregation alias, or for raw requests a selected field such as timestamp.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @type array,null
	 * @description Accepted but currently ignored, including their nested order, limit and limitBy.
	 */
	secondaryAggregations?: Querybuildertypesv5SecondaryAggregationDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to return for each row in raw requests, in addition to the columns always present: timestamp and id for logs, timestamp, trace_id and span_id for traces. Ignored by aggregating requests.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
	/**
	 * @enum traces
	 * @type string
	 * @description The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
	 */
	signal: DashboardtypesAIBuilderQuerySpecDTOSignal;
	/**
	 * @description The data source within the signal. Set to meter for Cost Meter metrics; leave empty for regular telemetry.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @description The time bucket for time_series aggregation: seconds as a number or a Go duration string such as 60s or 1m. Derived from the time range when omitted.
	 */
	stepInterval?: Querybuildertypesv5StepDTO;
}

/**
 * @minimum 0
 * @maximum 1
 * @nullable
 */
export type DashboardtypesFillOpacityDTO = number | null;

/**
 * The fill opacity from 0 (transparent) to 1 (opaque). Null uses the chart default.
 */
export type DashboardtypesAreaChartAppearanceDTOFillOpacity = DashboardtypesFillOpacityDTO | null;

export enum DashboardtypesAreaFillModeDTO {
	solid = 'solid',
	gradient = 'gradient',
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
	 * @description The largest gap still connected when fillOnlyBelow is true; longer gaps are left disconnected. Required in that case, as a positive Prometheus duration such as 30s, 5m or 1d.
	 */
	fillLessThan?: string;
	/**
	 * @type boolean
	 * @description Controls whether lines connect across null values. When false (default), all gaps are connected. When true, only gaps smaller than fillLessThan are connected.
	 */
	fillOnlyBelow?: boolean;
}

export interface DashboardtypesAreaChartAppearanceDTO {
	/**
	 * @description The fill under each line: solid (default) or gradient.
	 */
	fillMode?: DashboardtypesAreaFillModeDTO;
	/**
	 * @description The fill opacity from 0 (transparent) to 1 (opaque). Null uses the chart default.
	 */
	fillOpacity?: DashboardtypesAreaChartAppearanceDTOFillOpacity;
	/**
	 * @description How points are joined: linear, spline (default), step_after or step_before.
	 */
	lineInterpolation?: DashboardtypesLineInterpolationDTO;
	/**
	 * @description The line stroke: solid (default) or dashed.
	 */
	lineStyle?: DashboardtypesLineStyleDTO;
	/**
	 * @type boolean
	 * @description Whether each data point is marked on the line.
	 */
	showPoints?: boolean;
	/**
	 * @description Whether lines connect across missing points.
	 */
	spanGaps?: DashboardtypesSpanGapsDTO;
}

export interface DashboardtypesAxesDTO {
	/**
	 * @type boolean
	 * @description Whether the Y axis uses a logarithmic scale.
	 */
	isLogScale?: boolean;
	/**
	 * @type number,null
	 * @description The highest value the Y axis always shows; data above it still extends the axis. Null fits the data.
	 */
	softMax?: number | null;
	/**
	 * @type number,null
	 * @description The lowest value the Y axis always shows; data below it still extends the axis. Null fits the data.
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
	/**
	 * @description Decimal places shown: 0, 1, 2 (default), 3, 4 or full.
	 */
	decimalPrecision?: DashboardtypesPrecisionOptionDTO;
	/**
	 * @type string
	 * @description The display unit of the values, such as By, ms, s, percent or percentunit. Use percent for values already expressed as percentages (95 displays as 95%) and percentunit for fractions (0.95 displays as 95%). Empty shows plain numbers.
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
/**
 * Hex colors keyed by series label, overriding the automatic palette.
 */
export type DashboardtypesLegendDTOCustomColorsAnyOf = {
	[key: string]: string;
};

/**
 * Hex colors keyed by series label, overriding the automatic palette.
 * @nullable
 */
export type DashboardtypesLegendDTOCustomColors = DashboardtypesLegendDTOCustomColorsAnyOf | null;

export interface DashboardtypesLegendDTO {
	/**
	 * @type object,null
	 * @description Hex colors keyed by series label, overriding the automatic palette.
	 */
	customColors?: DashboardtypesLegendDTOCustomColors;
	/**
	 * @description The legend layout. Only list is supported.
	 */
	mode?: DashboardtypesLegendModeDTO;
	/**
	 * @description Where the legend sits: bottom (default) or right.
	 */
	position?: DashboardtypesLegendPositionDTO;
}

export interface DashboardtypesThresholdWithLabelDTO {
	/**
	 * @type string
	 * @description The CSS color of the line, for example #F1575F, which matches the SigNoz red preset; CSS named colors such as red also work.
	 */
	color: string;
	/**
	 * @type string
	 * @description The caption shown on the line.
	 */
	label?: string;
	/**
	 * @type string
	 * @description The unit id of value, such as ms or percent. Empty means the panel's unit, or the column's unit for a table threshold. Prefer the panel's unit; a different unit works only when it converts to it, such as s against a panel in ms.
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 * @description The value the line is drawn at, in unit.
	 */
	value: number;
}

export enum DashboardtypesStackModeDTO {
	none = 'none',
	normal = 'normal',
	percent = 'percent',
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
export interface DashboardtypesAreaChartVisualizationDTO {
	/**
	 * @type boolean
	 * @description Whether intervals with no data are drawn as zero instead of a gap.
	 */
	fillSpans?: boolean;
	/**
	 * @description How the areas combine: none (default) overlays them, normal stacks the values, percent stacks them as shares of the total.
	 */
	stack?: DashboardtypesStackModeDTO;
	/**
	 * @description The time range the panel queries: global_time (default) follows the dashboard range; last_5_min, last_15_min, last_30_min, last_1_hr, last_6_hr, last_1_day, last_3_days, last_1_week or last_1_month pin a fixed window.
	 */
	timePreference?: DashboardtypesTimePreferenceDTO;
}

export interface DashboardtypesAreaChartPanelSpecDTO {
	/**
	 * @description Y axis bounds and scale.
	 */
	axes?: DashboardtypesAxesDTO;
	/**
	 * @description Line and fill drawing options.
	 */
	chartAppearance?: DashboardtypesAreaChartAppearanceDTO;
	/**
	 * @description Unit and decimal precision of the values.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @description Legend placement and series colors.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @type array,null
	 * @description Horizontal reference lines drawn at fixed values.
	 */
	thresholds?: DashboardtypesThresholdWithLabelDTO[] | null;
	/**
	 * @description Time range, gap handling and stacking.
	 */
	visualization?: DashboardtypesAreaChartVisualizationDTO;
}

export interface DashboardtypesBarChartVisualizationDTO {
	/**
	 * @type boolean
	 * @description Whether intervals with no data are drawn as zero instead of a gap.
	 */
	fillSpans?: boolean;
	/**
	 * @type boolean
	 * @description Whether the series are stacked on top of each other.
	 */
	stackedBarChart?: boolean;
	/**
	 * @description The time range the panel queries: global_time (default) follows the dashboard range; last_5_min, last_15_min, last_30_min, last_1_hr, last_6_hr, last_1_day, last_3_days, last_1_week or last_1_month pin a fixed window.
	 */
	timePreference?: DashboardtypesTimePreferenceDTO;
}

export interface DashboardtypesBarChartPanelSpecDTO {
	/**
	 * @description Y axis bounds and scale.
	 */
	axes?: DashboardtypesAxesDTO;
	/**
	 * @description Unit and decimal precision of the values.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @description Legend placement and series colors.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @type array,null
	 * @description Horizontal reference lines drawn at fixed values.
	 */
	thresholds?: DashboardtypesThresholdWithLabelDTO[] | null;
	/**
	 * @description Time range, gap handling and stacking.
	 */
	visualization?: DashboardtypesBarChartVisualizationDTO;
}

export interface DashboardtypesBasicVisualizationDTO {
	/**
	 * @description The time range the panel queries: global_time (default) follows the dashboard range; last_5_min, last_15_min, last_30_min, last_1_hr, last_6_hr, last_1_day, last_3_days, last_1_week or last_1_month pin a fixed window.
	 */
	timePreference?: DashboardtypesTimePreferenceDTO;
}

export interface Querybuildertypesv5LogAggregationDTO {
	/**
	 * @type string
	 * @description The name the aggregation is reported under; when omitted, the result carries the alias __result_N, with N the zero-based index of the aggregation.
	 */
	alias?: string;
	/**
	 * @type string
	 * @description The aggregation over log records, such as count(), sum(item_price), count_distinct(user_id) or countIf(day > 10).
	 */
	expression?: string;
}

/**
 * The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
 */
export enum Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal {
	logs = 'logs',
}
export interface Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO {
	/**
	 * @type array,null
	 * @description The aggregations to compute, one result per entry. Traces and logs take expressions such as count() or p99(duration_nano); metrics take a metricName with time and space aggregations. Omit for raw requests.
	 */
	aggregations?: Querybuildertypesv5LogAggregationDTO[] | null;
	/**
	 * @description The value axis to count this query into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw.
	 */
	bucketOptions?: Querybuildertypesv5BucketOptionsDTO;
	/**
	 * @type string
	 * @description The opaque nextCursor value from a previous raw result, used to fetch the next page.
	 */
	cursor?: string;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response; the query may still run and can still feed a formula or trace operator. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @description The filter that selects log records, in the query filter syntax, for example severity_text = 'ERROR' AND body CONTAINS 'timeout'.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series, such as absolute, cumulativeSum, timeShift or anomaly.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to group aggregations by; each group becomes a series or a row with the field as a label or column.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @description A filter applied to aggregation results, referencing aliases or expressions, for example count() > 100.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by group-by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of rows for raw requests, or of series or rows for grouped aggregations, keeping the top entries by order. When 0, aggregations are unlimited while raw requests ordered by timestamp return a page of 10000 rows; follow nextCursor for the rest.
	 */
	limit?: number;
	/**
	 * @description Reserved for applying limit within each combination of the given group-by keys. Accepted but currently ignored.
	 */
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type string
	 * @description The unique name of the query, such as A or B; formulas, trace operators and selectedQueryName refer to it.
	 */
	name?: string;
	/**
	 * @type integer
	 * @description The number of rows to skip before returning results. Prefer cursor for raw requests.
	 */
	offset?: number;
	/**
	 * @type array,null
	 * @description The sort order of the result. Order by a group-by field, an aggregation alias, or for raw requests a selected field such as timestamp.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @type array,null
	 * @description Accepted but currently ignored, including their nested order, limit and limitBy.
	 */
	secondaryAggregations?: Querybuildertypesv5SecondaryAggregationDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to return for each row in raw requests, in addition to the columns always present: timestamp and id for logs, timestamp, trace_id and span_id for traces. Ignored by aggregating requests.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
	/**
	 * @enum logs
	 * @type string
	 * @description The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
	 */
	signal: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal;
	/**
	 * @description The data source within the signal. Set to meter for Cost Meter metrics; leave empty for regular telemetry.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @description The time bucket for time_series aggregation: seconds as a number or a Go duration string such as 60s or 1m. Derived from the time range when omitted.
	 */
	stepInterval?: Querybuildertypesv5StepDTO;
}

export interface MetrictypesComparisonSpaceAggregationParamDTO {
	/**
	 * @type string
	 * @description Comparison applied to histogram bucket bounds when spaceAggregation is count: <= gives the estimated count of observations at or below threshold, > the estimated count above it.
	 */
	operator: string;
	/**
	 * @type number
	 * @format double
	 * @description Bucket bound the comparison uses, in the unit of the histogram metric. The count is exact when threshold equals one of the metric's le bucket bounds, and otherwise an estimate interpolated linearly between the two nearest bounds.
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
	'' = '',
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
	'' = '',
}
export interface Querybuildertypesv5MetricAggregationDTO {
	/**
	 * @description Histogram metrics with spaceAggregation count only: the comparison operator and bucket bound used to estimate how many observations fall at or below, or above, the threshold. Ignored for other metric types and aggregations.
	 */
	comparisonSpaceAggregationParam?: MetrictypesComparisonSpaceAggregationParamDTO;
	/**
	 * @type string
	 * @description The name of the metric to query, for example k8s.pod.cpu_request_utilization.
	 */
	metricName?: string;
	/**
	 * @description How a series collapses to one number in scalar requests: sum, count, avg, min, max, last or median. Ignored by time_series requests.
	 */
	reduceTo?: Querybuildertypesv5ReduceToDTO;
	/**
	 * @description How series are combined across each group, such as sum, avg, min, max or count; histograms take percentiles such as p50, p90, p95 or p99.
	 */
	spaceAggregation?: MetrictypesSpaceAggregationDTO;
	/**
	 * @description The temporality of the metric: delta, cumulative or unspecified. Resolved from the metric metadata when omitted.
	 */
	temporality?: MetrictypesTemporalityDTO;
	/**
	 * @description How samples of one series are combined within each step, such as avg, sum, min, max, count, count_distinct, latest, rate or increase.
	 */
	timeAggregation?: MetrictypesTimeAggregationDTO;
}

/**
 * The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
 */
export enum Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal {
	metrics = 'metrics',
}
export interface Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO {
	/**
	 * @type array,null
	 * @description The aggregations to compute, one result per entry. Traces and logs take expressions such as count() or p99(duration_nano); metrics take a metricName with time and space aggregations. Omit for raw requests.
	 */
	aggregations?: Querybuildertypesv5MetricAggregationDTO[] | null;
	/**
	 * @description The value axis to count this query into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw.
	 */
	bucketOptions?: Querybuildertypesv5BucketOptionsDTO;
	/**
	 * @type string
	 * @description The opaque nextCursor value from a previous raw result, used to fetch the next page.
	 */
	cursor?: string;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response; the query may still run and can still feed a formula or trace operator. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @description The filter that selects series by their attributes, in the query filter syntax, for example k8s.namespace.name = 'prod' AND k8s.pod.name LIKE 'api%'.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series, such as absolute, cumulativeSum, timeShift or anomaly.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to group aggregations by; each group becomes a series or a row with the field as a label or column.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @description A filter applied to aggregation results, referencing aliases or expressions, for example count() > 100.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by group-by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of rows for raw requests, or of series or rows for grouped aggregations, keeping the top entries by order. When 0, aggregations are unlimited while raw requests ordered by timestamp return a page of 10000 rows; follow nextCursor for the rest.
	 */
	limit?: number;
	/**
	 * @description Reserved for applying limit within each combination of the given group-by keys. Accepted but currently ignored.
	 */
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type string
	 * @description The unique name of the query, such as A or B; formulas, trace operators and selectedQueryName refer to it.
	 */
	name?: string;
	/**
	 * @type integer
	 * @description The number of rows to skip before returning results. Prefer cursor for raw requests.
	 */
	offset?: number;
	/**
	 * @type array,null
	 * @description The sort order of the result. Order by a group-by field, an aggregation alias, or for raw requests a selected field such as timestamp.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @type array,null
	 * @description Accepted but currently ignored, including their nested order, limit and limitBy.
	 */
	secondaryAggregations?: Querybuildertypesv5SecondaryAggregationDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to return for each row in raw requests, in addition to the columns always present: timestamp and id for logs, timestamp, trace_id and span_id for traces. Ignored by aggregating requests.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
	/**
	 * @enum metrics
	 * @type string
	 * @description The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
	 */
	signal: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTOSignal;
	/**
	 * @description The data source within the signal. Set to meter for Cost Meter metrics; leave empty for regular telemetry.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @description The time bucket for time_series aggregation: seconds as a number or a Go duration string such as 60s or 1m. Derived from the time range when omitted.
	 */
	stepInterval?: Querybuildertypesv5StepDTO;
}

/**
 * The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
 */
export enum Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal {
	traces = 'traces',
}
export interface Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO {
	/**
	 * @type array,null
	 * @description The aggregations to compute, one result per entry. Traces and logs take expressions such as count() or p99(duration_nano); metrics take a metricName with time and space aggregations. Omit for raw requests.
	 */
	aggregations?: Querybuildertypesv5TraceAggregationDTO[] | null;
	/**
	 * @description The value axis to count this query into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw.
	 */
	bucketOptions?: Querybuildertypesv5BucketOptionsDTO;
	/**
	 * @type string
	 * @description The opaque nextCursor value from a previous raw result, used to fetch the next page.
	 */
	cursor?: string;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response; the query may still run and can still feed a formula or trace operator. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @description The filter that selects spans, in the query filter syntax, for example service.name = 'frontend' AND http.response.status_code >= 500.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series, such as absolute, cumulativeSum, timeShift or anomaly.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to group aggregations by; each group becomes a series or a row with the field as a label or column.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @description A filter applied to aggregation results, referencing aliases or expressions, for example count() > 100.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by group-by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of rows for raw requests, or of series or rows for grouped aggregations, keeping the top entries by order. When 0, aggregations are unlimited while raw requests ordered by timestamp return a page of 10000 rows; follow nextCursor for the rest.
	 */
	limit?: number;
	/**
	 * @description Reserved for applying limit within each combination of the given group-by keys. Accepted but currently ignored.
	 */
	limitBy?: Querybuildertypesv5LimitByDTO;
	/**
	 * @type string
	 * @description The unique name of the query, such as A or B; formulas, trace operators and selectedQueryName refer to it.
	 */
	name?: string;
	/**
	 * @type integer
	 * @description The number of rows to skip before returning results. Prefer cursor for raw requests.
	 */
	offset?: number;
	/**
	 * @type array,null
	 * @description The sort order of the result. Order by a group-by field, an aggregation alias, or for raw requests a selected field such as timestamp.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @type array,null
	 * @description Accepted but currently ignored, including their nested order, limit and limitBy.
	 */
	secondaryAggregations?: Querybuildertypesv5SecondaryAggregationDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to return for each row in raw requests, in addition to the columns always present: timestamp and id for logs, timestamp, trace_id and span_id for traces. Ignored by aggregating requests.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
	/**
	 * @enum traces
	 * @type string
	 * @description The telemetry signal to query: traces, logs or metrics. It selects the aggregation shape and is required for builder_query.
	 */
	signal: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal;
	/**
	 * @description The data source within the signal. Set to meter for Cost Meter metrics; leave empty for regular telemetry.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @description The time bucket for time_series aggregation: seconds as a number or a Go duration string such as 60s or 1m. Derived from the time range when omitted.
	 */
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
	 * @description The CSS color applied to the text or background, per format, while the threshold is active. For example #F1575F matches the SigNoz red preset; CSS named colors such as red also work.
	 */
	color: string;
	/**
	 * @description What the color is applied to: text (default) or background.
	 */
	format?: DashboardtypesThresholdFormatDTO;
	/**
	 * @description The comparison that activates the threshold: above (default), below, above_or_equal, below_or_equal, equal or not_equal.
	 */
	operator?: DashboardtypesComparisonOperatorDTO;
	/**
	 * @type string
	 * @description The unit id of value, such as ms or percent. Empty means the panel's unit, or the column's unit for a table threshold. Prefer the panel's unit; a different unit works only when it converts to it, such as s against a panel in ms.
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 * @description The value compared against, in unit.
	 */
	value: number;
}

export interface DashboardtypesCustomVariableSpecDTO {
	/**
	 * @type string
	 * @description The fixed values as a comma-separated list, such as 1,10,100.
	 */
	customValue: string;
}

export interface DashboardtypesDashboardPanelRefDTO {
	/**
	 * @type string
	 * @description The id of the dashboard containing the panel.
	 */
	dashboardId: string;
	/**
	 * @type string
	 * @description The dashboard name.
	 */
	dashboardName: string;
	/**
	 * @type array
	 * @description The metric labels the panel filters on.
	 */
	filterBy?: string[];
	/**
	 * @type array
	 * @description The metric labels the panel groups by.
	 */
	groupBy?: string[];
	/**
	 * @type string
	 * @description The panel id within the dashboard.
	 */
	panelId: string;
	/**
	 * @type string
	 * @description The panel title.
	 */
	panelName: string;
}

export enum DashboardtypesPanelKindDTO {
	Panel = 'Panel',
}
export interface DashboardtypesDisplayDTO {
	/**
	 * @type string
	 * @description A free-text description.
	 */
	description?: string;
	/**
	 * @type string
	 * @maxLength 128
	 * @description The human-readable title, at most 128 characters.
	 */
	name: string;
}

export interface DashboardtypesLinkDTO {
	/**
	 * @type string
	 * @description The link label.
	 */
	name?: string;
	/**
	 * @type boolean
	 * @description Whether dashboard variable values are substituted into url before opening it.
	 */
	renderVariables?: boolean;
	/**
	 * @type boolean
	 * @description Whether the link opens in a new tab.
	 */
	targetBlank?: boolean;
	/**
	 * @type string
	 * @description Hover text for the link. Stored, but not shown by the UI.
	 */
	tooltip?: string;
	/**
	 * @type string
	 * @description The link target. May reference dashboard variables as {{name}} when renderVariables is true.
	 */
	url?: string;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind {
	'signoz/TimeSeriesPanel' = 'signoz/TimeSeriesPanel',
}
export enum DashboardtypesFillModeDTO {
	solid = 'solid',
	gradient = 'gradient',
	none = 'none',
}
export interface DashboardtypesTimeSeriesChartAppearanceDTO {
	/**
	 * @description The fill under each line: none (default), solid or gradient.
	 */
	fillMode?: DashboardtypesFillModeDTO;
	/**
	 * @description How points are joined: linear, spline (default), step_after or step_before.
	 */
	lineInterpolation?: DashboardtypesLineInterpolationDTO;
	/**
	 * @description The line stroke: solid (default) or dashed.
	 */
	lineStyle?: DashboardtypesLineStyleDTO;
	/**
	 * @type boolean
	 * @description Whether each data point is marked on the line.
	 */
	showPoints?: boolean;
	/**
	 * @description Whether lines connect across missing points.
	 */
	spanGaps?: DashboardtypesSpanGapsDTO;
}

export interface DashboardtypesTimeSeriesVisualizationDTO {
	/**
	 * @type boolean
	 * @description Whether intervals with no data are drawn as zero instead of a gap.
	 */
	fillSpans?: boolean;
	/**
	 * @description The time range the panel queries: global_time (default) follows the dashboard range; last_5_min, last_15_min, last_30_min, last_1_hr, last_6_hr, last_1_day, last_3_days, last_1_week or last_1_month pin a fixed window.
	 */
	timePreference?: DashboardtypesTimePreferenceDTO;
}

export interface DashboardtypesTimeSeriesPanelSpecDTO {
	/**
	 * @description Y axis bounds and scale.
	 */
	axes?: DashboardtypesAxesDTO;
	/**
	 * @description Line drawing options.
	 */
	chartAppearance?: DashboardtypesTimeSeriesChartAppearanceDTO;
	/**
	 * @description Unit and decimal precision of the values.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @description Legend placement and series colors.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @type array,null
	 * @description Horizontal reference lines drawn at fixed values.
	 */
	thresholds?: DashboardtypesThresholdWithLabelDTO[] | null;
	/**
	 * @description Time range and gap handling.
	 */
	visualization?: DashboardtypesTimeSeriesVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTO {
	/**
	 * @enum signoz/TimeSeriesPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesTimeSeriesPanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind {
	'signoz/BarChartPanel' = 'signoz/BarChartPanel',
}
export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTO {
	/**
	 * @enum signoz/BarChartPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesBarChartPanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind {
	'signoz/AreaChartPanel' = 'signoz/AreaChartPanel',
}
export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTO {
	/**
	 * @enum signoz/AreaChartPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesAreaChartPanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind {
	'signoz/NumberPanel' = 'signoz/NumberPanel',
}
export interface DashboardtypesNumberPanelSpecDTO {
	/**
	 * @description Unit and decimal precision of the value.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @type array,null
	 * @description Rules that recolor the value when it compares to a threshold as specified.
	 */
	thresholds?: DashboardtypesComparisonThresholdDTO[] | null;
	/**
	 * @description The time range the value is computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTO {
	/**
	 * @enum signoz/NumberPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesNumberPanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind {
	'signoz/PieChartPanel' = 'signoz/PieChartPanel',
}
export interface DashboardtypesPieChartPanelSpecDTO {
	/**
	 * @description Unit and decimal precision of the slice values.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @description Legend placement and slice colors.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @description The time range the slices are computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTO {
	/**
	 * @enum signoz/PieChartPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesPieChartPanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind {
	'signoz/TablePanel' = 'signoz/TablePanel',
}
/**
 * Unit id per value column, keyed by the column key: the query name for a builder query with one aggregation (A), the query name dotted with the aggregation expression for several (A.count()), or the SQL alias for a ClickHouse SQL column. Aggregation aliases are display labels, not keys.
 */
export type DashboardtypesTableFormattingDTOColumnUnitsAnyOf = {
	[key: string]: string;
};

/**
 * Unit id per value column, keyed by the column key: the query name for a builder query with one aggregation (A), the query name dotted with the aggregation expression for several (A.count()), or the SQL alias for a ClickHouse SQL column. Aggregation aliases are display labels, not keys.
 * @nullable
 */
export type DashboardtypesTableFormattingDTOColumnUnits = DashboardtypesTableFormattingDTOColumnUnitsAnyOf | null;

export interface DashboardtypesTableFormattingDTO {
	/**
	 * @type object,null
	 * @description Unit id per value column, keyed by the column key: the query name for a builder query with one aggregation (A), the query name dotted with the aggregation expression for several (A.count()), or the SQL alias for a ClickHouse SQL column. Aggregation aliases are display labels, not keys.
	 */
	columnUnits?: DashboardtypesTableFormattingDTOColumnUnits;
	/**
	 * @description Decimal places shown: 0, 1, 2 (default), 3, 4 or full.
	 */
	decimalPrecision?: DashboardtypesPrecisionOptionDTO;
}

export interface DashboardtypesTableThresholdDTO {
	/**
	 * @type string
	 * @description The CSS color applied to the text or background, per format, while the threshold is active. For example #F1575F matches the SigNoz red preset; CSS named colors such as red also work.
	 */
	color: string;
	/**
	 * @type string
	 * @description The key of the value column the rule applies to: the query name for a builder query with one aggregation (A), the query name dotted with the aggregation expression for several (A.count()), or the SQL alias for a ClickHouse SQL column. Group-by columns are never colored, and aggregation aliases are display labels, not keys.
	 */
	columnName: string;
	/**
	 * @description What the color is applied to: text (default) or background.
	 */
	format?: DashboardtypesThresholdFormatDTO;
	/**
	 * @description The comparison that activates the threshold: above (default), below, above_or_equal, below_or_equal, equal or not_equal.
	 */
	operator?: DashboardtypesComparisonOperatorDTO;
	/**
	 * @type string
	 * @description The unit id of value, such as ms or percent. Empty means the panel's unit, or the column's unit for a table threshold. Prefer the panel's unit; a different unit works only when it converts to it, such as s against a panel in ms.
	 */
	unit?: string;
	/**
	 * @type number
	 * @format double
	 * @description The value compared against, in unit.
	 */
	value: number;
}

export interface DashboardtypesTablePanelSpecDTO {
	/**
	 * @description Per-column units and decimal precision.
	 */
	formatting?: DashboardtypesTableFormattingDTO;
	/**
	 * @type array,null
	 * @description Rules that recolor a cell when its column value compares to a threshold as specified.
	 */
	thresholds?: DashboardtypesTableThresholdDTO[] | null;
	/**
	 * @description The time range the rows are computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTO {
	/**
	 * @enum signoz/TablePanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesTablePanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTOKind {
	'signoz/HistogramPanel' = 'signoz/HistogramPanel',
}
export interface DashboardtypesHistogramBucketsDTO {
	/**
	 * @type number,null
	 * @description The approximate target number of buckets. Ignored when bucketWidth is positive. Null uses the chart default.
	 */
	bucketCount?: number | null;
	/**
	 * @type number,null
	 * @description The width of each bucket in the value unit. A positive value takes precedence over bucketCount; null or 0 lets the chart choose.
	 */
	bucketWidth?: number | null;
	/**
	 * @type boolean
	 * @description Whether every series is combined into a single histogram instead of one per series.
	 */
	mergeAllActiveQueries?: boolean;
}

export interface DashboardtypesHistogramPanelSpecDTO {
	/**
	 * @description How values are grouped into buckets.
	 */
	histogramBuckets?: DashboardtypesHistogramBucketsDTO;
	/**
	 * @description Legend placement and series colors.
	 */
	legend?: DashboardtypesLegendDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTO {
	/**
	 * @enum signoz/HistogramPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesHistogramPanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind {
	'signoz/ListPanel' = 'signoz/ListPanel',
}
export interface DashboardtypesListPanelSpecDTO {
	/**
	 * @type array,null
	 * @description The columns shown for each row, as field keys with name and optional fieldContext, fieldDataType and signal. Empty shows the default columns.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTO {
	/**
	 * @enum signoz/ListPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesListPanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind {
	'signoz/TextPanel' = 'signoz/TextPanel',
}
export interface DashboardtypesHeaderOptionsDTO {
	/**
	 * @type boolean
	 * @description Whether the title and description row above the content is hidden.
	 */
	hide?: boolean;
}

export enum DashboardtypesTextModeDTO {
	markdown = 'markdown',
}
export enum DashboardtypesTextAlignDTO {
	left = 'left',
	center = 'center',
	right = 'right',
}
export enum DashboardtypesVerticalAlignDTO {
	top = 'top',
	center = 'center',
	bottom = 'bottom',
}
export interface DashboardtypesTextPresentationDTO {
	/**
	 * @type string,null
	 * @description A hex background color such as #1f2937. Omit for the panel default.
	 */
	background?: string | null;
	/**
	 * @description Horizontal alignment: left (default), center or right.
	 */
	textAlign?: DashboardtypesTextAlignDTO;
	/**
	 * @description Vertical alignment: top (default), center or bottom.
	 */
	verticalAlign?: DashboardtypesVerticalAlignDTO;
}

export interface DashboardtypesTextPanelSpecDTO {
	/**
	 * @description Whether the panel header is shown.
	 */
	headerOptions?: DashboardtypesHeaderOptionsDTO;
	/**
	 * @description How text is interpreted. Only markdown is supported.
	 */
	mode?: DashboardtypesTextModeDTO;
	/**
	 * @description Alignment and background of the content.
	 */
	presentation?: DashboardtypesTextPresentationDTO;
	/**
	 * @type string
	 * @description The content to render.
	 */
	text?: string;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTO {
	/**
	 * @enum signoz/TextPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesTextPanelSpecDTO;
}

/**
 * The panel kind.
 */
export enum DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind {
	'signoz/HeatmapPanel' = 'signoz/HeatmapPanel',
}
export enum DashboardtypesHeatmapYScaleDTO {
	auto = 'auto',
	linear = 'linear',
	log = 'log',
	symlog = 'symlog',
}
export interface DashboardtypesHeatmapAxisDTO {
	/**
	 * @description How bucket bounds are spaced on the axis: auto (default), linear, log or symlog.
	 */
	scale?: DashboardtypesHeatmapYScaleDTO;
}

export interface DashboardtypesHeatmapAxesDTO {
	/**
	 * @description The bucket axis.
	 */
	y?: DashboardtypesHeatmapAxisDTO;
}

export enum DashboardtypesHeatmapColorModeDTO {
	palette = 'palette',
	opacity = 'opacity',
}
export enum DashboardtypesHeatmapPaletteDTO {
	ice = 'ice',
	moss = 'moss',
	rust = 'rust',
	graphite = 'graphite',
	ember = 'ember',
	lagoon = 'lagoon',
	orchid = 'orchid',
	verdant = 'verdant',
	lava = 'lava',
	beacon = 'beacon',
}
export enum DashboardtypesHeatmapColorScaleDTO {
	log = 'log',
	sqrt = 'sqrt',
	linear = 'linear',
}
export interface DashboardtypesHeatmapColorsDTO {
	/**
	 * @type string
	 * @description The hex color varied in opacity mode. Empty uses the series legend color.
	 */
	fill?: string;
	/**
	 * @type number,null
	 * @description The count mapped to the highest color. Null uses the highest count in the grid.
	 */
	maxCount?: number | null;
	/**
	 * @type number,null
	 * @description The count mapped to the lowest color. Null uses 0. Must not exceed maxCount.
	 */
	minCount?: number | null;
	/**
	 * @description How counts are colored: palette (default) picks a hue from palette, opacity varies the opacity of fill.
	 */
	mode?: DashboardtypesHeatmapColorModeDTO;
	/**
	 * @description The named color ramp used in palette mode, such as lava (default), ice or ember.
	 */
	palette?: DashboardtypesHeatmapPaletteDTO;
	/**
	 * @description How counts map onto the color range: log (default), sqrt or linear.
	 */
	scale?: DashboardtypesHeatmapColorScaleDTO;
	/**
	 * @type integer
	 * @description The number of distinct color steps, 2 to 128. 0 uses the chart default.
	 */
	steps?: number;
}

export interface DashboardtypesHeatmapChartAppearanceDTO {
	/**
	 * @description The color scale applied to bucket counts.
	 */
	colors?: DashboardtypesHeatmapColorsDTO;
}

export interface DashboardtypesHeatmapPanelSpecDTO {
	/**
	 * @description The Y axis scale.
	 */
	axes?: DashboardtypesHeatmapAxesDTO;
	/**
	 * @description How bucket counts map to colors.
	 */
	chartAppearance?: DashboardtypesHeatmapChartAppearanceDTO;
	/**
	 * @description Unit and decimal precision of the bucket bounds.
	 */
	formatting?: DashboardtypesPanelFormattingDTO;
	/**
	 * @description Legend placement and series colors.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @description The time range the heatmap covers.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}

export interface DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTO {
	/**
	 * @enum signoz/HeatmapPanel
	 * @type string
	 * @description The panel kind.
	 */
	kind: DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTOKind;
	/**
	 * @description The options for this panel kind. {} accepts every default.
	 */
	spec: DashboardtypesHeatmapPanelSpecDTO;
}

export type DashboardtypesPanelPluginDTO =
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTimeSeriesPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBarChartPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAreaChartPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesNumberPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesPieChartPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTablePanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHistogramPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesListPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesTextPanelSpecDTO
	| DashboardtypesPanelPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesHeatmapPanelSpecDTO;

export enum Querybuildertypesv5RequestTypeDTO {
	scalar = 'scalar',
	time_series = 'time_series',
	raw = 'raw',
	raw_stream = 'raw_stream',
	trace = 'trace',
	heatmap = 'heatmap',
}
/**
 * The query kind.
 */
export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind {
	'signoz/BuilderQuery' = 'signoz/BuilderQuery',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTO {
	/**
	 * @enum signoz/BuilderQuery
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: DashboardtypesBuilderQuerySpecDTO;
}

/**
 * The query kind.
 */
export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAIBuilderQuerySpecDTOKind {
	'signoz/AIBuilderQuery' = 'signoz/AIBuilderQuery',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAIBuilderQuerySpecDTO {
	/**
	 * @enum signoz/AIBuilderQuery
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAIBuilderQuerySpecDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: DashboardtypesAIBuilderQuerySpecDTO;
}

/**
 * The query kind.
 */
export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind {
	'signoz/CompositeQuery' = 'signoz/CompositeQuery',
}
export type Querybuildertypesv5BuilderQuerySpecDTO =
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTO
	| Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5MetricAggregationDTO;

/**
 * The type of the query.
 */
export enum Querybuildertypesv5QueryEnvelopeBuilderDTOType {
	builder_query = 'builder_query',
}
export interface Querybuildertypesv5QueryEnvelopeBuilderDTO {
	/**
	 * @description The builder query specification.
	 */
	spec?: Querybuildertypesv5BuilderQuerySpecDTO;
	/**
	 * @type string
	 * @enum builder_query
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeBuilderDTOType;
}

/**
 * The type of the query.
 */
export enum Querybuildertypesv5QueryEnvelopeBuilderAIDTOType {
	builder_ai_query = 'builder_ai_query',
}
export interface Querybuildertypesv5QueryEnvelopeBuilderAIDTO {
	/**
	 * @description The AI builder query specification.
	 */
	spec?: Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTO;
	/**
	 * @type string
	 * @enum builder_ai_query
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeBuilderAIDTOType;
}

export interface Querybuildertypesv5QueryBuilderFormulaDTO {
	/**
	 * @description The value axis to count the formula result into, as a kind-discriminated linear or log bucket spec. Read only by heatmap requests, and only from the query they draw.
	 */
	bucketOptions?: Querybuildertypesv5BucketOptionsDTO;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response; the formula may still be evaluated. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description An arithmetic expression over builder query names, for example A / B * 100. Reference queries, not other formulas.
	 */
	expression?: string;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @description Accepted but currently ignored; the computed values are returned unfiltered.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of series or rows to return. Unlimited when 0.
	 */
	limit?: number;
	/**
	 * @type string
	 * @description The unique name of the formula, such as F1, used by selectedQueryName and by panels. Referencing a formula from another formula is not reliable.
	 */
	name?: string;
	/**
	 * @type array,null
	 * @description The sort order of the formula result.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
}

/**
 * The type of the query.
 */
export enum Querybuildertypesv5QueryEnvelopeFormulaDTOType {
	builder_formula = 'builder_formula',
}
export interface Querybuildertypesv5QueryEnvelopeFormulaDTO {
	/**
	 * @description The formula specification.
	 */
	spec?: Querybuildertypesv5QueryBuilderFormulaDTO;
	/**
	 * @type string
	 * @enum builder_formula
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeFormulaDTOType;
}

export interface Querybuildertypesv5QueryBuilderTraceOperatorDTO {
	/**
	 * @type array,null
	 * @description The aggregations to compute over the matched traces for scalar and time_series requests.
	 */
	aggregations?: Querybuildertypesv5TraceAggregationDTO[] | null;
	/**
	 * @type string
	 * @description Accepted but currently ignored by the trace operator; page raw results with offset.
	 */
	cursor?: string;
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response but the query may still run. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description A trace-structure expression over traces builder query names using => for direct child, -> for descendant, && for both present, || for either present and NOT for absence, for example A => B && NOT C. At most 10 operators.
	 */
	expression?: string;
	/**
	 * @description Accepted but currently not applied to the matched traces. Put filters on the operand queries instead.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type array,null
	 * @description Post-processing functions applied in order to each result series.
	 */
	functions?: Querybuildertypesv5FunctionDTO[] | null;
	/**
	 * @type array,null
	 * @description The fields to group aggregations by.
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @description A condition on the aggregation results, for example count() > 10.
	 */
	having?: Querybuildertypesv5HavingDTO;
	/**
	 * @type string
	 * @description The display name template for each series; {{field}} placeholders are replaced by group-by label values.
	 */
	legend?: string;
	/**
	 * @type integer
	 * @description The maximum number of traces or groups to return. For raw requests 0 means 100 rows; for aggregations 0 means unlimited.
	 */
	limit?: number;
	/**
	 * @type string
	 * @description The unique name of the trace operator query.
	 */
	name?: string;
	/**
	 * @type integer
	 * @description The number of raw results to skip before returning. Aggregation requests ignore it.
	 */
	offset?: number;
	/**
	 * @type array,null
	 * @description The sort order of the matched traces; only span_count and trace_duration may be used as keys.
	 */
	order?: Querybuildertypesv5OrderByDTO[] | null;
	/**
	 * @type string
	 * @description The name of the operand query whose spans are returned; when empty, the spans matched by the whole expression are returned.
	 */
	returnSpansFrom?: string;
	/**
	 * @type array,null
	 * @description The span fields to return for each row in raw requests, in addition to the always-present timestamp, trace_id and span_id columns.
	 */
	selectFields?: TelemetrytypesTelemetryFieldKeyDTO[] | null;
	/**
	 * @description The time bucket for time_series aggregation: seconds as a number or a Go duration string such as 60s.
	 */
	stepInterval?: Querybuildertypesv5StepDTO;
}

/**
 * The type of the query.
 */
export enum Querybuildertypesv5QueryEnvelopeTraceOperatorDTOType {
	builder_trace_operator = 'builder_trace_operator',
}
export interface Querybuildertypesv5QueryEnvelopeTraceOperatorDTO {
	/**
	 * @description The trace operator specification.
	 */
	spec?: Querybuildertypesv5QueryBuilderTraceOperatorDTO;
	/**
	 * @type string
	 * @enum builder_trace_operator
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeTraceOperatorDTOType;
}

export interface Querybuildertypesv5PromQueryDTO {
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response but the query may still run. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description The display name template for each series; {{label}} placeholders are replaced by label values.
	 */
	legend?: string;
	/**
	 * @type string
	 * @description The unique name of the query, such as A.
	 */
	name?: string;
	/**
	 * @type string
	 * @description The PromQL expression. Dotted metric and label names must use the UTF-8 quoted selector form, for example {'http.server.duration'}.
	 */
	query?: string;
	/**
	 * @type boolean
	 * @description When true, start and end are evaluated as given instead of rounded down to the step, and the result is not cached. Defaults to false.
	 */
	skipStepAlignment?: boolean;
	/**
	 * @type boolean
	 * @description Reserved; currently has no effect.
	 */
	stats?: boolean;
	/**
	 * @description The evaluation step: seconds as a number or a Go duration string such as 60s. Derived from the time range when omitted.
	 */
	step?: Querybuildertypesv5StepDTO;
}

/**
 * The type of the query.
 */
export enum Querybuildertypesv5QueryEnvelopePromQLDTOType {
	promql = 'promql',
}
export interface Querybuildertypesv5QueryEnvelopePromQLDTO {
	/**
	 * @description The PromQL query specification.
	 */
	spec?: Querybuildertypesv5PromQueryDTO;
	/**
	 * @type string
	 * @enum promql
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopePromQLDTOType;
}

export interface Querybuildertypesv5ClickHouseQueryDTO {
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response but the query may still run. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description The display name template for each series; {{column}} placeholders are replaced by result column values.
	 */
	legend?: string;
	/**
	 * @type string
	 * @description The unique name of the query, such as A.
	 */
	name?: string;
	/**
	 * @type string
	 * @description The ClickHouse SQL statement. Reserved time placeholders such as {{.start_timestamp}}, {{.end_timestamp}}, {{.start_timestamp_ms}} and {{.start_datetime}} and dashboard variables written as {{name}}, [[name]] or $name are substituted before execution.
	 */
	query?: string;
}

/**
 * The type of the query.
 */
export enum Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType {
	clickhouse_sql = 'clickhouse_sql',
}
export interface Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO {
	/**
	 * @description The ClickHouse SQL query specification.
	 */
	spec?: Querybuildertypesv5ClickHouseQueryDTO;
	/**
	 * @type string
	 * @enum clickhouse_sql
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType;
}

export type Querybuildertypesv5QueryEnvelopeDTO =
	| Querybuildertypesv5QueryEnvelopeBuilderDTO
	| Querybuildertypesv5QueryEnvelopeBuilderAIDTO
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
	 * @description The queries to run, each wrapped in a type-discriminated envelope. Names must be unique; formulas and trace operators reference other queries by name.
	 */
	queries?: Querybuildertypesv5QueryEnvelopeDTO[] | null;
}

export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTO {
	/**
	 * @enum signoz/CompositeQuery
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5CompositeQueryDTO;
}

/**
 * The query kind.
 */
export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTOKind {
	'signoz/Formula' = 'signoz/Formula',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTO {
	/**
	 * @enum signoz/Formula
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5QueryBuilderFormulaDTO;
}

/**
 * The query kind.
 */
export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTOKind {
	'signoz/PromQLQuery' = 'signoz/PromQLQuery',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTO {
	/**
	 * @enum signoz/PromQLQuery
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5PromQueryDTO;
}

/**
 * The query kind.
 */
export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTOKind {
	'signoz/ClickHouseSQL' = 'signoz/ClickHouseSQL',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTO {
	/**
	 * @enum signoz/ClickHouseSQL
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5ClickHouseQueryDTO;
}

/**
 * The query kind.
 */
export enum DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTOKind {
	'signoz/TraceOperator' = 'signoz/TraceOperator',
}
export interface DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTO {
	/**
	 * @enum signoz/TraceOperator
	 * @type string
	 * @description The query kind.
	 */
	kind: DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTOKind;
	/**
	 * @description The kind-specific query spec.
	 */
	spec: Querybuildertypesv5QueryBuilderTraceOperatorDTO;
}

export type DashboardtypesQueryPluginDTO =
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesBuilderQuerySpecDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesDashboardtypesAIBuilderQuerySpecDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5CompositeQueryDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderFormulaDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5PromQueryDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5ClickHouseQueryDTO
	| DashboardtypesQueryPluginVariantGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5QueryBuilderTraceOperatorDTO;

export interface DashboardtypesQuerySpecDTO {
	/**
	 * @type string
	 * @description An optional label for the query. The name queries refer to each other by lives in the plugin spec.
	 */
	name?: string;
	/**
	 * @description The query: kind is one of signoz/BuilderQuery, signoz/AIBuilderQuery (builder query over AI observability traces), signoz/CompositeQuery (several named queries and formulas), signoz/Formula, signoz/PromQLQuery, signoz/ClickHouseSQL or signoz/TraceOperator, and spec holds that kind's query. Pie and table panels reject signoz/PromQLQuery; heatmap panels reject signoz/AIBuilderQuery and signoz/TraceOperator; list panels accept only signoz/BuilderQuery and signoz/AIBuilderQuery.
	 */
	plugin: DashboardtypesQueryPluginDTO;
}

export interface DashboardtypesQueryDTO {
	/**
	 * @description The result shape the panel requests: time_series for time series, bar, area and histogram panels, scalar for number, table and pie panels, raw for list panels, heatmap for heatmap panels, trace for trace panels.
	 */
	kind: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @description The query content: an optional name and the query plugin.
	 */
	spec: DashboardtypesQuerySpecDTO;
}

export interface DashboardtypesPanelSpecDTO {
	/**
	 * @description The panel title and description.
	 */
	display: DashboardtypesDisplayDTO;
	/**
	 * @type array,null
	 * @description Context links offered in the data point drilldown menu of the panel, with dashboard variables resolved in the URL.
	 */
	links?: DashboardtypesLinkDTO[] | null;
	/**
	 * @description The visualization: kind is one of signoz/TimeSeriesPanel, signoz/BarChartPanel, signoz/AreaChartPanel, signoz/NumberPanel, signoz/PieChartPanel, signoz/TablePanel, signoz/HistogramPanel, signoz/ListPanel, signoz/TextPanel or signoz/HeatmapPanel, and spec holds that kind's options ({} accepts every default).
	 */
	plugin: DashboardtypesPanelPluginDTO;
	/**
	 * @type array
	 * @description The queries the panel runs. Use exactly one entry for a data panel and [] for signoz/TextPanel. To run several named queries or formulas, use one entry whose spec.plugin.kind is signoz/CompositeQuery and put the constituent queries in its plugin spec.
	 */
	queries: DashboardtypesQueryDTO[];
}

export interface DashboardtypesPanelDTO {
	/**
	 * @description The panel envelope kind. Always Panel.
	 */
	kind: DashboardtypesPanelKindDTO;
	/**
	 * @description The panel content: display, plugin, queries and links.
	 */
	spec: DashboardtypesPanelSpecDTO;
}

/**
 * The panels keyed by panel id. An id has up to 75 characters from letters, digits, dot, underscore and hyphen. A panel is shown only where a layout item references it as #/spec/panels/<id>. Use {} for none.
 */
export type DashboardtypesDashboardSpecDTOPanels = {
	[key: string]: DashboardtypesPanelDTO;
};

/**
 * The layout kind.
 */
export enum DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind {
	Grid = 'Grid',
}
export interface DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTO {
	/**
	 * @enum Grid
	 * @type string
	 * @description The layout kind.
	 */
	kind: DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTOKind;
	/**
	 * @description The grid section: an optional display title and up to 100 items that place panels. Each item has a content.$ref of #/spec/panels/<id> plus x, y, width and height on a 12-column grid: x and y at least 0, width and height at least 1, x plus width at most 12, and no two items overlapping.
	 */
	spec: DashboardGridLayoutSpecDTO;
}

export type DashboardtypesLayoutDTO =
	DashboardtypesLayoutEnvelopeGithubComPersesSpecGoDashboardGridLayoutSpecDTO;

/**
 * The variable kind.
 */
export enum DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind {
	ListVariable = 'ListVariable',
}
export type DashboardtypesVariableDefaultValueDTO = string | string[];

/**
 * The value source kind.
 */
export enum DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind {
	'signoz/DynamicVariable' = 'signoz/DynamicVariable',
}
export enum DashboardtypesDynamicVariableSignalDTO {
	traces = 'traces',
	logs = 'logs',
	metrics = 'metrics',
	all = 'all',
}
export interface DashboardtypesDynamicVariableSpecDTO {
	/**
	 * @type string
	 * @description The attribute key whose observed values populate the variable, such as service.name.
	 */
	name: string;
	/**
	 * @description The signal the values are read from: traces, logs, metrics or all (default).
	 */
	signal: DashboardtypesDynamicVariableSignalDTO;
}

export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTO {
	/**
	 * @enum signoz/DynamicVariable
	 * @type string
	 * @description The value source kind.
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesDynamicVariableSpecDTOKind;
	/**
	 * @description The kind-specific value source spec.
	 */
	spec: DashboardtypesDynamicVariableSpecDTO;
}

/**
 * The value source kind.
 */
export enum DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind {
	'signoz/QueryVariable' = 'signoz/QueryVariable',
}
export interface DashboardtypesQueryVariableSpecDTO {
	/**
	 * @type string
	 * @description A ClickHouse SQL query returning one column of selectable values; every returned column is offered.
	 */
	queryValue: string;
}

export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTO {
	/**
	 * @enum signoz/QueryVariable
	 * @type string
	 * @description The value source kind.
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesQueryVariableSpecDTOKind;
	/**
	 * @description The kind-specific value source spec.
	 */
	spec: DashboardtypesQueryVariableSpecDTO;
}

/**
 * The value source kind.
 */
export enum DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind {
	'signoz/CustomVariable' = 'signoz/CustomVariable',
}
export interface DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTO {
	/**
	 * @enum signoz/CustomVariable
	 * @type string
	 * @description The value source kind.
	 */
	kind: DashboardtypesVariablePluginVariantGithubComSigNozSignozPkgTypesDashboardtypesCustomVariableSpecDTOKind;
	/**
	 * @description The kind-specific value source spec.
	 */
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
	 * @description Whether an all option is offered. Requires allowMultiple.
	 */
	allowAllValue?: boolean;
	/**
	 * @type boolean
	 * @description Whether several values can be selected at once.
	 */
	allowMultiple?: boolean;
	/**
	 * @type string
	 * @description A regular expression meant to keep only matching values, reduced to the capture group when one is present. Stored, but not applied by the UI.
	 */
	capturingRegexp?: string;
	/**
	 * @type string
	 * @description The value meant to replace every value when all is selected. Requires allowAllValue. Stored, but currently ignored by the UI.
	 */
	customAllValue?: string;
	/**
	 * @description The initially selected value: a string, or a list of strings when allowMultiple is true.
	 */
	defaultValue?: DashboardtypesVariableDefaultValueDTO;
	/**
	 * @description The label shown for the variable control.
	 */
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 * @minLength 1
	 * @description The handle queries reference as $name. Up to 75 characters from letters, digits, dot, underscore and hyphen, not all digits, unique within the dashboard.
	 */
	name: string;
	/**
	 * @description Where the values come from: kind is signoz/DynamicVariable (observed attribute values), signoz/QueryVariable (a ClickHouse query) or signoz/CustomVariable (a fixed list), and spec holds that kind's settings.
	 */
	plugin?: DashboardtypesVariablePluginDTO;
	/**
	 * @description How the values are ordered: none (default), alphabetical-asc, alphabetical-desc, numerical-asc, numerical-desc, alphabetical-ci-asc or alphabetical-ci-desc.
	 */
	sort?: DashboardtypesListVariableSpecSortDTO;
}

export interface DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTO {
	/**
	 * @enum ListVariable
	 * @type string
	 * @description The variable kind.
	 */
	kind: DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTOKind;
	/**
	 * @description The kind-specific variable spec.
	 */
	spec: DashboardtypesListVariableSpecDTO;
}

/**
 * The variable kind.
 */
export enum DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind {
	TextVariable = 'TextVariable',
}
export interface DashboardtypesTextVariableSpecDTO {
	/**
	 * @type boolean
	 * @description Whether the value is meant to be fixed. Stored, but not applied by the UI.
	 */
	constant?: boolean;
	/**
	 * @description The label shown for the variable control.
	 */
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 * @minLength 1
	 * @description The handle queries reference as $name. Up to 75 characters from letters, digits, dot, underscore and hyphen, not all digits, unique within the dashboard.
	 */
	name: string;
	/**
	 * @type string
	 * @description The default text. Must be non-empty when constant is true.
	 */
	value: string;
}

export interface DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTO {
	/**
	 * @enum TextVariable
	 * @type string
	 * @description The variable kind.
	 */
	kind: DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind;
	/**
	 * @description The kind-specific variable spec.
	 */
	spec: DashboardtypesTextVariableSpecDTO;
}

export type DashboardtypesVariableDTO =
	| DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesListVariableSpecDTO
	| DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTO;

export interface DashboardtypesDashboardSpecDTO {
	/**
	 * @description The dashboard title and description.
	 */
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 * @description The default time range, as a Prometheus duration such as 1h or 7d. Stored, but not applied by the UI.
	 */
	duration?: string;
	/**
	 * @type array
	 * @description The Grid layouts that place panels, at most 500. Each panel can be placed at most once. Use [] for none.
	 */
	layouts: DashboardtypesLayoutDTO[];
	/**
	 * @type array,null
	 * @description External links stored with the dashboard. Not shown by the UI.
	 */
	links?: DashboardtypesLinkDTO[] | null;
	/**
	 * @type object
	 * @description The panels keyed by panel id. An id has up to 75 characters from letters, digits, dot, underscore and hyphen. A panel is shown only where a layout item references it as #/spec/panels/<id>. Use {} for none.
	 */
	panels: DashboardtypesDashboardSpecDTOPanels;
	/**
	 * @type string
	 * @description The auto refresh interval, as a Prometheus duration such as 30s. Stored, but not applied by the UI.
	 */
	refreshInterval?: string;
	/**
	 * @type array
	 * @description The dashboard variables, each a ListVariable or TextVariable envelope, referenced in queries as $name. Names must be unique. Use [] for none.
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
	/**
	 * @description The sort direction: asc or desc (default).
	 */
	order?: DashboardtypesListOrderDTO;
	/**
	 * @type string
	 * @description A filter expression over the reserved keys name, description, created_at, updated_at, created_by and locked, and over tag keys, using the SigNoz filter grammar: comparisons such as =, !=, CONTAINS, LIKE, IN, < and >, single-quoted strings, RFC3339 timestamps in quotes for created_at and updated_at, combined with AND, OR and NOT, for example name CONTAINS 'overview' AND created_at >= '2026-10-21T00:00:00Z'. At most 1024 characters. Empty matches every dashboard.
	 */
	query?: string;
	/**
	 * @description The sort field: updated_at (default), created_at or name.
	 */
	sort?: DashboardtypesListSortDTO;
	/**
	 * @type string
	 * @description The view data schema version. Must be v1.
	 */
	version: string;
}

export interface DashboardtypesDashboardViewDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @description The saved list filter and sort.
	 */
	data: DashboardtypesDashboardViewDataDTO;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 * @description The view name.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization that owns the view.
	 */
	orgId: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}

export enum DashboardtypesSourceDTO {
	user = 'user',
	system = 'system',
	integration = 'integration',
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
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/ (only the prefix is validated), or a base64 image data URI for png, jpeg, gif, webp, avif or svg. Empty for none.
	 */
	image?: string;
	/**
	 * @type boolean
	 * @description Whether the dashboard is locked. A locked dashboard rejects update and patch until it is unlocked.
	 */
	locked: boolean;
	/**
	 * @type string
	 * @description The dashboard's unique, immutable name, a DNS-1123 label.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization that owns the dashboard.
	 */
	orgId: string;
	/**
	 * @type string
	 * @pattern ^v6$
	 * @description The dashboard schema version. Must be v6.
	 */
	schemaVersion: string;
	/**
	 * @description Where the dashboard came from: user, integration or system. Only user dashboards can be modified.
	 */
	source: DashboardtypesSourceDTO;
	/**
	 * @description The dashboard content: display, variables, panels, layouts and links.
	 */
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 * @description The key/value tags attached to the dashboard, for example key team with value payments.
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
	 * @description The time range shown to anonymous viewers by default, as a Go duration such as 30m, 1h or 24h. Accepted units are ns, us, ms, s, m and h; write a day as 24h.
	 */
	defaultTimeRange?: string;
	/**
	 * @type string
	 * @description The path segment of the public URL.
	 */
	publicPath?: string;
	/**
	 * @type boolean
	 * @description Whether anonymous viewers may change the time range.
	 */
	timeRangeEnabled?: boolean;
}

export interface DashboardtypesGettablePublicDashboardDataV2DTO {
	/**
	 * @description The dashboard with panel and variable queries redacted.
	 */
	dashboard?: DashboardtypesGettableDashboardV2DTO;
	/**
	 * @description The sharing settings.
	 */
	publicDashboard?: DashboardtypesGettablePublicDasbhboardDTO;
}

export interface DashboardtypesGettableSystemDashboardDTO {
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
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/ (only the prefix is validated), or a base64 image data URI for png, jpeg, gif, webp, avif or svg. Empty for none.
	 */
	image?: string;
	/**
	 * @type boolean
	 * @description Whether the dashboard is locked. A locked dashboard rejects update and patch until it is unlocked.
	 */
	locked: boolean;
	/**
	 * @type string
	 * @description The dashboard's unique, immutable name, a DNS-1123 label.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization that owns the dashboard.
	 */
	orgId: string;
	/**
	 * @type string
	 * @pattern ^v6$
	 * @description The dashboard schema version. Must be v6.
	 */
	schemaVersion: string;
	/**
	 * @description Where the dashboard came from: user, integration or system. Only user dashboards can be modified.
	 */
	source: DashboardtypesSourceDTO;
	/**
	 * @description The dashboard content: display, variables, panels, layouts and links.
	 */
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 * @description The key/value tags attached to the dashboard, for example key team with value payments.
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
	/**
	 * @description The RFC 6902 verb: add, remove, replace, move, copy or test. remove on a missing path is a no-op and add creates missing parents.
	 */
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
	/**
	 * @description The dashboard name and description.
	 */
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
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/, or a base64 image data URI. Omitted when none is set.
	 */
	image?: string;
	/**
	 * @type boolean
	 * @description Whether the dashboard is still in the v1 schema. It is listed but cannot be fetched or edited through the v2 endpoints.
	 */
	legacy: boolean;
	/**
	 * @type boolean
	 * @description Whether the dashboard is locked against update and patch.
	 */
	locked: boolean;
	/**
	 * @type string
	 * @description The dashboard's unique, immutable name.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization that owns the dashboard.
	 */
	orgId: string;
	/**
	 * @type boolean
	 * @description Whether the calling user has pinned the dashboard.
	 */
	pinned: boolean;
	/**
	 * @type string
	 * @description The dashboard schema version, v6 for v2 dashboards.
	 */
	schemaVersion: string;
	/**
	 * @description Where the dashboard came from: user or integration. System dashboards are not listed.
	 */
	source: DashboardtypesSourceDTO;
	/**
	 * @description The display part of the dashboard spec. Panels, variables and layouts are not included in list rows.
	 */
	spec: DashboardtypesListedDashboardV2SpecDTO;
	/**
	 * @type array
	 * @description The tags attached to the dashboard.
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
	 * @description The dashboards on this page, each with the calling user's pin state.
	 */
	dashboards: DashboardtypesListedDashboardForUserV2DTO[];
	/**
	 * @type array
	 * @description The filter keys that address dashboard columns rather than tags.
	 */
	reservedKeywords: string[];
	/**
	 * @type array
	 * @description Every dashboard tag in the organization, for building filters.
	 */
	tags: TagtypesGettableTagDTO[];
	/**
	 * @type integer
	 * @format int64
	 * @description The number of dashboards matching the filter across every page.
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
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/, or a base64 image data URI. Omitted when none is set.
	 */
	image?: string;
	/**
	 * @type boolean
	 * @description Whether the dashboard is still in the v1 schema. It is listed but cannot be fetched or edited through the v2 endpoints.
	 */
	legacy: boolean;
	/**
	 * @type boolean
	 * @description Whether the dashboard is locked against update and patch.
	 */
	locked: boolean;
	/**
	 * @type string
	 * @description The dashboard's unique, immutable name.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization that owns the dashboard.
	 */
	orgId: string;
	/**
	 * @type string
	 * @description The dashboard schema version, v6 for v2 dashboards.
	 */
	schemaVersion: string;
	/**
	 * @description Where the dashboard came from: user or integration. System dashboards are not listed.
	 */
	source: DashboardtypesSourceDTO;
	/**
	 * @description The display part of the dashboard spec. Panels, variables and layouts are not included in list rows.
	 */
	spec: DashboardtypesListedDashboardV2SpecDTO;
	/**
	 * @type array
	 * @description The tags attached to the dashboard.
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
	 * @description The dashboards on this page.
	 */
	dashboards: DashboardtypesListedDashboardV2DTO[];
	/**
	 * @type array
	 * @description The filter keys that address dashboard columns rather than tags.
	 */
	reservedKeywords: string[];
	/**
	 * @type array
	 * @description Every dashboard tag in the organization, for building filters.
	 */
	tags: TagtypesGettableTagDTO[];
	/**
	 * @type integer
	 * @format int64
	 * @description The number of dashboards matching the filter across every page.
	 */
	total: number;
}

export interface DashboardtypesListableDashboardViewDTO {
	/**
	 * @type array
	 * @description The saved dashboard list views.
	 */
	views: DashboardtypesDashboardViewDTO[];
}

export enum DashboardtypesPanelPluginKindDTO {
	'signoz/TimeSeriesPanel' = 'signoz/TimeSeriesPanel',
	'signoz/BarChartPanel' = 'signoz/BarChartPanel',
	'signoz/AreaChartPanel' = 'signoz/AreaChartPanel',
	'signoz/NumberPanel' = 'signoz/NumberPanel',
	'signoz/PieChartPanel' = 'signoz/PieChartPanel',
	'signoz/TablePanel' = 'signoz/TablePanel',
	'signoz/HistogramPanel' = 'signoz/HistogramPanel',
	'signoz/ListPanel' = 'signoz/ListPanel',
	'signoz/TextPanel' = 'signoz/TextPanel',
	'signoz/HeatmapPanel' = 'signoz/HeatmapPanel',
}
/**
 * The RFC 6902 operations, applied in order against the dashboard's postable shape.
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
	 * @description When true the server derives name from spec.display.name plus a random suffix. Requires an empty name and a non-empty spec.display.name.
	 */
	generateName?: boolean;
	/**
	 * @type string
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/ (only the prefix is validated), or a base64 image data URI for png, jpeg, gif, webp, avif or svg. Empty for none.
	 */
	image?: string;
	/**
	 * @type string
	 * @description The dashboard's unique name, a DNS-1123 label (lowercase letters, digits and hyphens, at most 63 characters). Immutable after creation. Must be empty when generateName is true.
	 */
	name?: string;
	/**
	 * @type string
	 * @pattern ^v6$
	 * @description The dashboard schema version. Must be v6.
	 */
	schemaVersion: string;
	/**
	 * @description The dashboard content: display, variables, panels, layouts and links.
	 */
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 * @description Up to 10 key/value tags, for example key team with value payments. Keys must not be one of the reserved list filter keys: name, description, created_at, updated_at, created_by, locked, source. Use [] for none.
	 */
	tags: TagtypesPostableTagDTO[] | null;
}

export interface DashboardtypesPostableDashboardViewDTO {
	/**
	 * @description The list filter and sort to save.
	 */
	data: DashboardtypesDashboardViewDataDTO;
	/**
	 * @type string
	 * @maxLength 64
	 * @description The view name, at most 64 characters.
	 */
	name: string;
}

export interface DashboardtypesPostablePublicDashboardDTO {
	/**
	 * @type string
	 * @description The time range shown to anonymous viewers by default, as a Go duration such as 30m, 1h or 24h. Accepted units are ns, us, ms, s, m and h; write a day as 24h.
	 */
	defaultTimeRange?: string;
	/**
	 * @type boolean
	 * @description Whether anonymous viewers may change the time range.
	 */
	timeRangeEnabled?: boolean;
}

export enum DashboardtypesQueryPluginKindDTO {
	'signoz/BuilderQuery' = 'signoz/BuilderQuery',
	'signoz/AIBuilderQuery' = 'signoz/AIBuilderQuery',
	'signoz/CompositeQuery' = 'signoz/CompositeQuery',
	'signoz/Formula' = 'signoz/Formula',
	'signoz/PromQLQuery' = 'signoz/PromQLQuery',
	'signoz/ClickHouseSQL' = 'signoz/ClickHouseSQL',
	'signoz/TraceOperator' = 'signoz/TraceOperator',
}
export interface DashboardtypesUpdatableDashboardV2DTO {
	/**
	 * @type string
	 * @description Icon or logo shown in the dashboard list: the path of an icon or logo bundled with the UI under /assets/Icons/ or /assets/Logos/ (only the prefix is validated), or a base64 image data URI for png, jpeg, gif, webp, avif or svg. Empty for none.
	 */
	image?: string;
	/**
	 * @type string
	 * @description The dashboard's current name. The name is immutable, so a different value is rejected.
	 */
	name: string;
	/**
	 * @type string
	 * @pattern ^v6$
	 * @description The dashboard schema version. Must be v6.
	 */
	schemaVersion: string;
	/**
	 * @description The full replacement dashboard content: display, variables, panels, layouts and links.
	 */
	spec: DashboardtypesDashboardSpecDTO;
	/**
	 * @type array,null
	 * @description The full replacement tag set, up to 10 key/value tags, for example key team with value payments. Keys must not be one of the reserved list filter keys: name, description, created_at, updated_at, created_by, locked, source.
	 */
	tags: TagtypesPostableTagDTO[] | null;
}

export interface DashboardtypesUpdatablePublicDashboardDTO {
	/**
	 * @type string
	 * @description The time range shown to anonymous viewers by default, as a Go duration such as 30m, 1h or 24h. Accepted units are ns, us, ms, s, m and h; write a day as 24h.
	 */
	defaultTimeRange?: string;
	/**
	 * @type boolean
	 * @description Whether anonymous viewers may change the time range.
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
export type FeaturetypesGettableFeatureDTOVariants = FeaturetypesGettableFeatureDTOVariantsAnyOf | null;

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

export interface GatewaytypesDeprecatedPostableIngestionKeyLimitDTO {
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
	keyId: string;
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
	kube_containers = 'kube_containers',
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

export enum InframonitoringtypesNodeConditionDTO {
	ready = 'ready',
	not_ready = 'not_ready',
	no_data = 'no_data',
}
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
export interface InframonitoringtypesClusterFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByNodeReadiness?: InframonitoringtypesNodeConditionDTO[] | null;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}

export type InframonitoringtypesClusterRecordDTOCounts = {
	/**
	 * @type integer
	 * @format int64
	 */
	daemonSets: number;
	/**
	 * @type integer
	 * @format int64
	 */
	deployments: number;
	/**
	 * @type integer
	 * @format int64
	 */
	jobs: number;
	/**
	 * @type integer
	 * @format int64
	 */
	namespaces: number;
	/**
	 * @type integer
	 * @format int64
	 */
	nodes: number;
	/**
	 * @type integer
	 * @format int64
	 */
	statefulSets: number;
};

export type InframonitoringtypesClusterRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesClusterRecordDTOMeta = InframonitoringtypesClusterRecordDTOMetaAnyOf | null;

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
	 * @type object
	 */
	counts: InframonitoringtypesClusterRecordDTOCounts;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesClusterRecordDTOMeta;
	nodeCountsByReadiness: InframonitoringtypesNodeCountsByReadinessDTO;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
}

export enum InframonitoringtypesResponseTypeDTO {
	list = 'list',
	grouped_list = 'grouped_list',
}
export interface Querybuildertypesv5QueryWarnDataAdditionalDTO {
	/**
	 * @type string
	 * @description The warning text.
	 */
	message?: string;
}

export interface Querybuildertypesv5QueryWarnDataDTO {
	/**
	 * @type string
	 * @description A summary of the warnings raised while executing the request.
	 */
	message?: string;
	/**
	 * @type string
	 * @description A documentation link explaining the warnings.
	 */
	url?: string;
	/**
	 * @type array
	 * @description The individual warnings.
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

export interface InframonitoringtypesContainerCountsByReadyDTO {
	/**
	 * @type integer
	 */
	notReady: number;
	/**
	 * @type integer
	 */
	ready: number;
}

export interface InframonitoringtypesContainerCountsByStatusDTO {
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
	imagePullBackOff: number;
	/**
	 * @type integer
	 */
	oomKilled: number;
	/**
	 * @type integer
	 */
	running: number;
	/**
	 * @type integer
	 */
	terminated: number;
	/**
	 * @type integer
	 */
	unknown: number;
	/**
	 * @type integer
	 */
	waiting: number;
}

export enum InframonitoringtypesContainerStatusDTO {
	running = 'running',
	waiting = 'waiting',
	terminated = 'terminated',
	crashloopbackoff = 'crashloopbackoff',
	imagepullbackoff = 'imagepullbackoff',
	errimagepull = 'errimagepull',
	createcontainerconfigerror = 'createcontainerconfigerror',
	containercreating = 'containercreating',
	oomkilled = 'oomkilled',
	completed = 'completed',
	error = 'error',
	containercannotrun = 'containercannotrun',
	unknown = 'unknown',
	no_data = 'no_data',
}
export interface InframonitoringtypesContainerFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByContainerStatus?: InframonitoringtypesContainerStatusDTO[] | null;
}

export enum InframonitoringtypesContainerReadyDTO {
	ready = 'ready',
	not_ready = 'not_ready',
	no_data = 'no_data',
}
export type InframonitoringtypesContainerRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesContainerRecordDTOMeta = InframonitoringtypesContainerRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesContainerRecordDTO {
	containerCountsByReady: InframonitoringtypesContainerCountsByReadyDTO;
	containerCountsByStatus: InframonitoringtypesContainerCountsByStatusDTO;
	/**
	 * @type string
	 */
	containerName: string;
	/**
	 * @type number
	 * @format double
	 */
	cpu: number;
	/**
	 * @type number
	 * @format double
	 */
	cpuLimitUtilization: number;
	/**
	 * @type number
	 * @format double
	 */
	cpuRequestUtilization: number;
	/**
	 * @type number
	 * @format double
	 */
	memory: number;
	/**
	 * @type number
	 * @format double
	 */
	memoryLimitUtilization: number;
	/**
	 * @type number
	 * @format double
	 */
	memoryRequestUtilization: number;
	/**
	 * @type object,null
	 */
	meta: InframonitoringtypesContainerRecordDTOMeta;
	/**
	 * @type string
	 */
	podUID: string;
	ready: InframonitoringtypesContainerReadyDTO;
	/**
	 * @type integer
	 * @format int64
	 */
	restarts: number;
	status: InframonitoringtypesContainerStatusDTO;
}

export interface InframonitoringtypesContainersDTO {
	/**
	 * @type boolean
	 */
	endTimeBeforeRetention: boolean;
	/**
	 * @type array
	 */
	records: InframonitoringtypesContainerRecordDTO[];
	/**
	 * @type integer
	 */
	total: number;
	type: InframonitoringtypesResponseTypeDTO;
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export interface InframonitoringtypesDaemonSetFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}

export type InframonitoringtypesDaemonSetRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesDaemonSetRecordDTOMeta = InframonitoringtypesDaemonSetRecordDTOMetaAnyOf | null;

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
	/**
	 * @type integer
	 */
	misscheduledNodes: number;
	podCountsByStatus: InframonitoringtypesPodCountsByStatusDTO;
	/**
	 * @type integer
	 */
	readyNodes: number;
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

export interface InframonitoringtypesDeploymentFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}

export type InframonitoringtypesDeploymentRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesDeploymentRecordDTOMeta = InframonitoringtypesDeploymentRecordDTOMetaAnyOf | null;

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
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
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
export type InframonitoringtypesHostRecordDTOMeta = InframonitoringtypesHostRecordDTOMetaAnyOf | null;

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

export interface InframonitoringtypesJobFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}

export type InframonitoringtypesJobRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesJobRecordDTOMeta = InframonitoringtypesJobRecordDTOMetaAnyOf | null;

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

export interface InframonitoringtypesNamespaceFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}

export type InframonitoringtypesNamespaceRecordDTOCounts = {
	/**
	 * @type integer
	 * @format int64
	 */
	daemonSets: number;
	/**
	 * @type integer
	 * @format int64
	 */
	deployments: number;
	/**
	 * @type integer
	 * @format int64
	 */
	jobs: number;
	/**
	 * @type integer
	 * @format int64
	 */
	statefulSets: number;
};

export type InframonitoringtypesNamespaceRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesNamespaceRecordDTOMeta = InframonitoringtypesNamespaceRecordDTOMetaAnyOf | null;

export interface InframonitoringtypesNamespaceRecordDTO {
	/**
	 * @type object
	 */
	counts: InframonitoringtypesNamespaceRecordDTOCounts;
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

export interface InframonitoringtypesNodeFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByNodeReadiness?: InframonitoringtypesNodeConditionDTO[] | null;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}

export type InframonitoringtypesNodeRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesNodeRecordDTOMeta = InframonitoringtypesNodeRecordDTOMetaAnyOf | null;

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

export interface InframonitoringtypesPodFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}

export type InframonitoringtypesPodRecordDTOMetaAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type InframonitoringtypesPodRecordDTOMeta = InframonitoringtypesPodRecordDTOMetaAnyOf | null;

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
	filter?: InframonitoringtypesClusterFilterDTO;
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

export interface InframonitoringtypesPostableContainersDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: InframonitoringtypesContainerFilterDTO;
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
	filter?: InframonitoringtypesDaemonSetFilterDTO;
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
	filter?: InframonitoringtypesDeploymentFilterDTO;
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
	filter?: InframonitoringtypesJobFilterDTO;
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
	filter?: InframonitoringtypesNamespaceFilterDTO;
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
	filter?: InframonitoringtypesNodeFilterDTO;
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
	filter?: InframonitoringtypesPodFilterDTO;
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

export interface InframonitoringtypesStatefulSetFilterDTO {
	/**
	 * @type string
	 * @description A filter in the query filter syntax: comparisons such as =, !=, <, >, IN, LIKE, CONTAINS and EXISTS on field names, combined with AND, OR and NOT, with string values in single quotes, for example key = 'value' AND other_key > 10. Which fields exist depends on the signal or endpoint the filter is used with.
	 */
	expression?: string;
	/**
	 * @type array,null
	 */
	filterByPodStatus?: InframonitoringtypesPodStatusDTO[] | null;
}

export interface InframonitoringtypesPostableStatefulSetsDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: InframonitoringtypesStatefulSetFilterDTO;
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
export type InframonitoringtypesStatefulSetRecordDTOMeta = InframonitoringtypesStatefulSetRecordDTOMetaAnyOf | null;

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
export type InframonitoringtypesVolumeRecordDTOMeta = InframonitoringtypesVolumeRecordDTOMetaAnyOf | null;

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

export interface LicensetypesFeatureDTO {
	/**
	 * @type boolean
	 */
	active?: boolean;
	/**
	 * @type string
	 */
	name?: string;
	/**
	 * @type string
	 */
	route?: string;
	/**
	 * @type integer
	 * @format int64
	 */
	usage?: number;
	/**
	 * @type integer
	 * @format int64
	 */
	usage_limit?: number;
}

export interface LicensetypesLicenseEventQueueDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string
	 */
	event: string;
	/**
	 * @type string
	 * @format date-time
	 */
	scheduledAt: string;
	/**
	 * @type string
	 */
	status: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
}

export interface LicensetypesLicensePlanDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string
	 */
	description: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type boolean
	 */
	isActive: boolean;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
}

export interface LicensetypesGettableActiveLicenseDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	eventQueue: LicensetypesLicenseEventQueueDTO;
	/**
	 * @type array
	 */
	features: LicensetypesFeatureDTO[];
	/**
	 * @type string
	 * @format date-time
	 */
	freeUntil: string;
	/**
	 * @type string
	 */
	id: string;
	plan: LicensetypesLicensePlanDTO;
	/**
	 * @type string
	 */
	platform: string;
	/**
	 * @type string
	 */
	state: string;
	/**
	 * @type string
	 */
	status: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
	/**
	 * @type integer
	 * @format int64
	 */
	validFrom: number;
	/**
	 * @type integer
	 * @format int64
	 */
	validUntil: number;
}

export interface LicensetypesGettableLicenseDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	eventQueue: LicensetypesLicenseEventQueueDTO;
	/**
	 * @type array
	 */
	features: LicensetypesFeatureDTO[];
	/**
	 * @type string
	 * @format date-time
	 */
	freeUntil: string;
	/**
	 * @type string
	 */
	id: string;
	plan: LicensetypesLicensePlanDTO;
	/**
	 * @type string
	 */
	platform: string;
	/**
	 * @type string
	 */
	state: string;
	/**
	 * @type string
	 */
	status: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
	/**
	 * @type integer
	 * @format int64
	 */
	validFrom: number;
	/**
	 * @type integer
	 * @format int64
	 */
	validUntil: number;
}

export interface LicensetypesGettableLicenseWithKeyDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	eventQueue: LicensetypesLicenseEventQueueDTO;
	/**
	 * @type array
	 */
	features: LicensetypesFeatureDTO[];
	/**
	 * @type string
	 * @format date-time
	 */
	freeUntil: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 * @format password
	 */
	key: string;
	plan: LicensetypesLicensePlanDTO;
	/**
	 * @type string
	 */
	platform: string;
	/**
	 * @type string
	 */
	state: string;
	/**
	 * @type string
	 */
	status: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
	/**
	 * @type integer
	 * @format int64
	 */
	validFrom: number;
	/**
	 * @type integer
	 * @format int64
	 */
	validUntil: number;
}

export interface LicensetypesPostableLicenseDTO {
	/**
	 * @type string
	 * @format password
	 */
	key?: string;
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
	 * @description End of the time range as a Unix timestamp in milliseconds. At most 30 minutes after start.
	 */
	end: number;
	/**
	 * @description Query builder filter over the metric attributes, for example host.name = 'web-1'. Omitting it applies no attribute restriction; inspection returns at most 50 series either way.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type string
	 * @description The name of the metric to inspect.
	 */
	metricName: string;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end.
	 */
	start: number;
}

/**
 * The label value as a string, number or boolean.
 */
export type Querybuildertypesv5LabelDTOValue = string | number | boolean;

export interface Querybuildertypesv5LabelDTO {
	/**
	 * @description The group-by field this label value belongs to.
	 */
	key?: TelemetrytypesTelemetryFieldKeyDTO;
	/**
	 * @description The label value as a string, number or boolean.
	 */
	value?: Querybuildertypesv5LabelDTOValue;
}

export interface Querybuildertypesv5TimeSeriesValueDTO {
	/**
	 * @type boolean
	 * @description True when the step is only partly covered by the requested time range, so the value is incomplete.
	 */
	partial?: boolean;
	/**
	 * @type integer
	 * @format int64
	 * @description The start of the step as a Unix timestamp in milliseconds.
	 */
	timestamp?: number;
	/**
	 * @type number
	 * @format double
	 * @description The aggregated value for the step; omitted for heatmap results, which use values.
	 */
	value?: number;
	/**
	 * @type array
	 * @description The per-band counts for heatmap results, in the order of meta.buckets plus a trailing overflow count.
	 */
	values?: number[];
}

export interface Querybuildertypesv5TimeSeriesDTO {
	/**
	 * @type array
	 * @description The group-by field values that identify this series.
	 */
	labels?: Querybuildertypesv5LabelDTO[];
	/**
	 * @type array,null
	 * @description The data points of the series in ascending timestamp order.
	 */
	values?: Querybuildertypesv5TimeSeriesValueDTO[] | null;
}

export interface MetricsexplorertypesInspectMetricsResponseDTO {
	/**
	 * @type array,null
	 * @description Raw time series, at most 50, each with its labels and timestamp-value pairs.
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
	 * @description Human-readable description from the metric metadata; empty when none was reported.
	 */
	description: string;
	/**
	 * @type boolean
	 * @description True when the metric is a monotonically increasing Sum (a counter).
	 */
	isMonotonic: boolean;
	/**
	 * @type string
	 * @description The name of the metric.
	 */
	metricName: string;
	/**
	 * @description Aggregation temporality of the metric: cumulative, delta or unspecified.
	 */
	temporality: MetrictypesTemporalityDTO;
	/**
	 * @description The metric type, such as gauge, sum, histogram, summary or exponentialhistogram.
	 */
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 * @description The unit reported in the metric metadata, for example ms or By; empty when none was reported.
	 */
	unit: string;
}

export interface MetricsexplorertypesListMetricsResponseDTO {
	/**
	 * @type array,null
	 * @description Matching metrics with their metadata, ordered by name.
	 */
	metrics: MetricsexplorertypesListMetricDTO[] | null;
}

export interface MetricsexplorertypesMetricAlertDTO {
	/**
	 * @type string
	 * @description The id of the alert rule.
	 */
	alertId: string;
	/**
	 * @type string
	 * @description The name of the alert rule that queries the metric.
	 */
	alertName: string;
}

export interface MetricsexplorertypesMetricAlertsResponseDTO {
	/**
	 * @type array,null
	 * @description Alert rules whose queries reference the metric.
	 */
	alerts: MetricsexplorertypesMetricAlertDTO[] | null;
}

export interface MetricsexplorertypesMetricAttributeDTO {
	/**
	 * @type string
	 * @description The attribute (label) name.
	 */
	key: string;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Total number of distinct values observed, which can exceed the length of values.
	 */
	valueCount: number;
	/**
	 * @type array,null
	 * @description Distinct values observed for the attribute, capped at 1000.
	 */
	values: string[] | null;
}

export interface MetricsexplorertypesMetricAttributesResponseDTO {
	/**
	 * @type array,null
	 * @description Attributes of the metric, ordered by distinct value count descending.
	 */
	attributes: MetricsexplorertypesMetricAttributeDTO[] | null;
	/**
	 * @type integer
	 * @format int64
	 * @description Number of attributes returned.
	 */
	totalKeys: number;
}

export interface MetricsexplorertypesMetricDashboardPanelsResponseDTO {
	/**
	 * @type array,null
	 * @description One entry per dashboard panel whose query references the metric.
	 */
	dashboards: DashboardtypesDashboardPanelRefDTO[] | null;
}

export interface MetricsexplorertypesMetricHighlightsResponseDTO {
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of distinct time series active in the last 120 minutes, approximate: a series that last reported early in that window can be missed.
	 */
	activeTimeSeries: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of samples ingested for the metric over retained data.
	 */
	dataPoints: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Unix timestamp in milliseconds of the most recently received sample.
	 */
	lastReceived: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of distinct time series for the metric over retained data.
	 */
	totalTimeSeries: number;
}

export interface MetricsexplorertypesMetricMetadataDTO {
	/**
	 * @type string
	 * @description Human-readable description of the metric; empty when none was reported.
	 */
	description: string;
	/**
	 * @type boolean
	 * @description True when the metric is a monotonically increasing Sum (a counter).
	 */
	isMonotonic: boolean;
	/**
	 * @description Aggregation temporality of the metric: cumulative, delta or unspecified.
	 */
	temporality: MetrictypesTemporalityDTO;
	/**
	 * @description The metric type, such as gauge, sum, histogram, summary or exponentialhistogram.
	 */
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 * @description The unit of the metric values, for example ms or By; empty when none was reported.
	 */
	unit: string;
}

export interface MetricsexplorertypesMetricsOnboardingResponseDTO {
	/**
	 * @type boolean
	 * @description True when at least one metric not emitted by SigNoz itself has been ingested.
	 */
	hasMetrics: boolean;
}

export interface MetricsexplorertypesStatDTO {
	/**
	 * @type string
	 * @description Human-readable description from the metric metadata; empty when none was reported.
	 */
	description: string;
	/**
	 * @type string
	 * @description The name of the metric.
	 */
	metricName: string;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of samples (data points) ingested for the metric in the requested time range.
	 */
	samples: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Number of distinct time series active in the time range, approximate: it can include series last active shortly before start.
	 */
	timeseries: number;
	/**
	 * @description The metric type, such as gauge, sum, histogram, summary or exponentialhistogram.
	 */
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 * @description The unit reported in the metric metadata, for example ms or By; empty when none was reported.
	 */
	unit: string;
}

export interface MetricsexplorertypesStatsRequestDTO {
	/**
	 * @type integer
	 * @format int64
	 * @description End of the time range as a Unix timestamp in milliseconds. Must be greater than start.
	 */
	end: number;
	/**
	 * @description Query builder filter over metric attributes, for example host.name = 'web-1'. A bare word matches the metric name. Omitting it applies no restriction, but metrics whose name starts with signoz are always excluded.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type integer
	 * @description Maximum number of metrics to return, between 1 and 5000.
	 */
	limit: number;
	/**
	 * @type integer
	 * @description Number of metrics to skip for pagination. Must not be negative; defaults to 0.
	 */
	offset?: number;
	/**
	 * @description Sort order; key.name is timeseries or samples, direction is asc or desc. Defaults to samples descending.
	 */
	orderBy?: Querybuildertypesv5OrderByDTO;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end.
	 */
	start: number;
}

export interface MetricsexplorertypesStatsResponseDTO {
	/**
	 * @type array,null
	 * @description One entry per metric on the requested page, in the requested order.
	 */
	metrics: MetricsexplorertypesStatDTO[] | null;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Total number of metrics matching the filter across all pages.
	 */
	total: number;
}

export interface MetricsexplorertypesTreemapEntryDTO {
	/**
	 * @type string
	 * @description The name of the metric.
	 */
	metricName: string;
	/**
	 * @type number
	 * @format double
	 * @description Share of the total across all metrics in the time range, from 0 to 100.
	 */
	percentage: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Time series count or sample count for the metric, depending on the requested mode.
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
	 * @description End of the time range as a Unix timestamp in milliseconds. Must be greater than start.
	 */
	end: number;
	/**
	 * @description Query builder filter over metric attributes, for example host.name = 'web-1'. A bare word matches the metric name. Omitting it applies no restriction, but metrics whose name starts with signoz are always excluded.
	 */
	filter?: Querybuildertypesv5FilterDTO;
	/**
	 * @type integer
	 * @description Maximum number of metrics to return, between 1 and 5000, ordered by percentage descending.
	 */
	limit: number;
	/**
	 * @description What each metric is sized by: timeseries counts distinct time series; samples counts ingested data points, ranked among a shortlist of the metrics with the most time series. Only the matching response array is populated.
	 */
	mode: MetricsexplorertypesTreemapModeDTO;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0 and less than end.
	 */
	start: number;
}

export interface MetricsexplorertypesTreemapResponseDTO {
	/**
	 * @type array,null
	 * @description Entries sized by sample count, chosen among the metrics with the most time series; populated only when mode is samples.
	 */
	samples: MetricsexplorertypesTreemapEntryDTO[] | null;
	/**
	 * @type array,null
	 * @description Entries sized by time series count; populated only when mode is timeseries.
	 */
	timeseries: MetricsexplorertypesTreemapEntryDTO[] | null;
}

export interface MetricsexplorertypesUpdateMetricMetadataRequestDTO {
	/**
	 * @type string
	 * @description Human-readable description of the metric.
	 */
	description: string;
	/**
	 * @type boolean
	 * @description Whether the metric is a monotonically increasing Sum (a counter).
	 */
	isMonotonic: boolean;
	/**
	 * @type string
	 * @description The name of the metric whose metadata to replace.
	 */
	metricName: string;
	/**
	 * @description Aggregation temporality to store. Required as delta or cumulative when type is sum, histogram or exponentialhistogram; gauges are stored as unspecified and summaries as cumulative whatever is sent. A non-monotonic cumulative sum is stored as a gauge.
	 */
	temporality: MetrictypesTemporalityDTO;
	/**
	 * @description The metric type to store, such as gauge, sum, histogram, summary or exponentialhistogram.
	 */
	type: MetrictypesTypeDTO;
	/**
	 * @type string
	 * @description The unit of the metric values, for example ms or By.
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

export enum PrometheusErrorResponseSchemaDTOErrorType {
	bad_data = 'bad_data',
	execution = 'execution',
	canceled = 'canceled',
	timeout = 'timeout',
	internal = 'internal',
}
export enum PrometheusErrorResponseSchemaDTOStatus {
	error = 'error',
}
export interface PrometheusErrorResponseSchemaDTO {
	/**
	 * @type string
	 */
	error: string;
	/**
	 * @enum bad_data,execution,canceled,timeout,internal
	 * @type string
	 */
	errorType: PrometheusErrorResponseSchemaDTOErrorType;
	/**
	 * @enum error
	 * @type string
	 */
	status: PrometheusErrorResponseSchemaDTOStatus;
}

export enum PrometheusMatrixDataSchemaDTOResultType {
	matrix = 'matrix',
}
export type PrometheusSamplePairSchemaDTOItem = number | string;

/**
 * A [timestamp, value] pair: float unix seconds, then the string-encoded sample value ("NaN", "+Inf", "-Inf" included).
 * @minItems 2
 * @maxItems 2
 * @nullable
 */
export type PrometheusSamplePairSchemaDTO =
	| PrometheusSamplePairSchemaDTOItem[]
	| null;

export type PrometheusMatrixSeriesSchemaDTOMetricAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type PrometheusMatrixSeriesSchemaDTOMetric = PrometheusMatrixSeriesSchemaDTOMetricAnyOf | null;

export interface PrometheusMatrixSeriesSchemaDTO {
	/**
	 * @type object,null
	 */
	metric: PrometheusMatrixSeriesSchemaDTOMetric;
	/**
	 * @type array,null
	 */
	values: (PrometheusSamplePairSchemaDTO | null)[] | null;
}

export interface PrometheusMatrixDataSchemaDTO {
	/**
	 * @type array,null
	 */
	result: PrometheusMatrixSeriesSchemaDTO[] | null;
	/**
	 * @enum matrix
	 * @type string
	 */
	resultType: PrometheusMatrixDataSchemaDTOResultType;
}

export type PrometheusVectorSampleSchemaDTOMetricAnyOf = {
	[key: string]: string;
};

/**
 * @nullable
 */
export type PrometheusVectorSampleSchemaDTOMetric = PrometheusVectorSampleSchemaDTOMetricAnyOf | null;

export interface PrometheusVectorSampleSchemaDTO {
	/**
	 * @type object,null
	 */
	metric: PrometheusVectorSampleSchemaDTOMetric;
	value: PrometheusSamplePairSchemaDTO | null;
}

export enum PrometheusVectorDataSchemaDTOResultType {
	vector = 'vector',
}
export interface PrometheusVectorDataSchemaDTO {
	/**
	 * @type array,null
	 */
	result: PrometheusVectorSampleSchemaDTO[] | null;
	/**
	 * @enum vector
	 * @type string
	 */
	resultType: PrometheusVectorDataSchemaDTOResultType;
}

export enum PrometheusScalarDataSchemaDTOResultType {
	scalar = 'scalar',
}
export interface PrometheusScalarDataSchemaDTO {
	result: PrometheusSamplePairSchemaDTO | null;
	/**
	 * @enum scalar
	 * @type string
	 */
	resultType: PrometheusScalarDataSchemaDTOResultType;
}

export enum PrometheusStringDataSchemaDTOResultType {
	string = 'string',
}
export interface PrometheusStringDataSchemaDTO {
	result: PrometheusSamplePairSchemaDTO | null;
	/**
	 * @enum string
	 * @type string
	 */
	resultType: PrometheusStringDataSchemaDTOResultType;
}

export type PrometheusQueryDataSchemaDTO =
	| PrometheusMatrixDataSchemaDTO
	| PrometheusVectorDataSchemaDTO
	| PrometheusScalarDataSchemaDTO
	| PrometheusStringDataSchemaDTO;

export enum PrometheusSuccessResponseSchemaDTOStatus {
	success = 'success',
}
export interface PrometheusSuccessResponseSchemaDTO {
	data: PrometheusQueryDataSchemaDTO;
	/**
	 * @type array
	 */
	infos?: string[];
	/**
	 * @enum success
	 * @type string
	 */
	status: PrometheusSuccessResponseSchemaDTOStatus;
	/**
	 * @type array
	 */
	warnings?: string[];
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
	 * @type string
	 */
	context: string;
	/**
	 * @type array
	 */
	indexes?: PromotetypesWrappedIndexDTO[];
	/**
	 * @type string
	 */
	path: string;
	/**
	 * @type boolean
	 */
	promote?: boolean;
	/**
	 * @type string
	 */
	signal: string;
}

export interface PromotetypesIndexMaterializedPathsResultDTO {
	/**
	 * @type array,null
	 */
	indexed: PromotetypesPromotePathDTO[] | null;
	/**
	 * @type array,null
	 */
	skipped: PromotetypesPromotePathDTO[] | null;
}

export interface PromotetypesPostableIndexMaterializedPathsDTO {
	/**
	 * @type boolean
	 */
	dryRun?: boolean;
	/**
	 * @type string
	 */
	signal: string;
}

export interface Querybuildertypesv5AggregationMetaDTO {
	/**
	 * @type array
	 * @description The ascending upper bounds of the value bands, set only for heatmap results; each point then carries one count per bound plus a trailing overflow count in values.
	 */
	buckets?: number[];
	/**
	 * @type string
	 * @description The unit of the aggregated values, taken from metric metadata when known.
	 */
	unit?: string;
}

export interface Querybuildertypesv5AggregationBucketDTO {
	/**
	 * @type string
	 * @description The alias of the aggregation, or the internal name __result_N, with N its index, when no alias was given.
	 */
	alias?: string;
	/**
	 * @type array
	 * @description The anomaly score per series; present only when the anomaly function is applied.
	 */
	anomalyScores?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @type integer
	 * @description The zero-based position of the aggregation in the query.
	 */
	index?: number;
	/**
	 * @type array
	 * @description The lower bound of the expected range per series; present only when the anomaly function is applied.
	 */
	lowerBoundSeries?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @description Display metadata for the aggregation.
	 */
	meta?: Querybuildertypesv5AggregationMetaDTO;
	/**
	 * @type array
	 * @description The predicted values per series; present only when the anomaly function is applied.
	 */
	predictedSeries?: Querybuildertypesv5TimeSeriesDTO[];
	/**
	 * @type array,null
	 * @description One series per group-by combination.
	 */
	series?: Querybuildertypesv5TimeSeriesDTO[] | null;
	/**
	 * @type array
	 * @description The upper bound of the expected range per series; present only when the anomaly function is applied.
	 */
	upperBoundSeries?: Querybuildertypesv5TimeSeriesDTO[];
}

export enum Querybuildertypesv5BucketsKindDTO {
	linear = 'linear',
	log = 'log',
}
/**
 * Display metadata for the column.
 */
export type Querybuildertypesv5ColumnDescriptorDTOMeta = {
	/**
	 * @type string
	 * @description The unit of the column values when known.
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
	 * @description The zero-based position of the aggregation in the query for aggregation columns.
	 */
	aggregationIndex?: number;
	/**
	 * @description Whether the column is a group-by field (group) or an aggregated value (aggregation).
	 */
	columnType?: Querybuildertypesv5ColumnTypeDTO;
	/**
	 * @type string
	 * @description Human-readable summary of the field, present only for well-known fields.
	 */
	description?: string;
	/**
	 * @description Where the field lives: resource, attribute, scope, span, trace, log, body or metric. Empty means unspecified, so the server resolves it.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Data type of the field values: string, bool, int64, float64 or number. Empty means unspecified.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type object
	 * @description Display metadata for the column.
	 */
	meta?: Querybuildertypesv5ColumnDescriptorDTOMeta;
	/**
	 * @type string
	 * @description The field name, such as service.name, k8s.pod.name or http.response.status_code. Dots are part of the name, and the names available depend on the signal and the data ingested.
	 */
	name: string;
	/**
	 * @type string
	 * @description The name of the query that produced the column.
	 */
	queryName?: string;
	/**
	 * @description The signal the field belongs to: traces, logs or metrics. Empty means any signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @type string
	 * @description Unit of the field values, present only for well-known fields.
	 */
	unit?: string;
}

/**
 * The step interval in seconds that was used for each query, keyed by query name.
 */
export type Querybuildertypesv5ExecStatsDTOStepIntervals = {
	[key: string]: number;
};

/**
 * Execution cost of the request: rows and bytes scanned and execution time. A measure of cost, not of whether data exists.
 */
export interface Querybuildertypesv5ExecStatsDTO {
	/**
	 * @type integer
	 * @minimum 0
	 * @description Bytes scanned to answer every query in the request. A cost indicator only; it does not indicate whether any data matched.
	 */
	bytesScanned?: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Total execution time across the queries in the request, in milliseconds. A cost indicator only, not the request latency and not a sign that data exists.
	 */
	durationMs?: number;
	/**
	 * @type integer
	 * @minimum 0
	 * @description Rows scanned to answer every query in the request. A cost indicator only: rows are scanned whether or not any matched, so it says nothing about whether data exists.
	 */
	rowsScanned?: number;
	/**
	 * @type object
	 * @description The step interval in seconds that was used for each query, keyed by query name.
	 */
	stepIntervals?: Querybuildertypesv5ExecStatsDTOStepIntervals;
}

export interface Querybuildertypesv5FormatOptionsDTO {
	/**
	 * @type boolean
	 * @description When true, every builder query and formula in a time_series result gets a zero value for each missing step, whatever its aggregation, so averages and percentiles read as zero where no data exists. PromQL and ClickHouse SQL queries keep their gaps. Defaults to false.
	 */
	fillGaps?: boolean;
	/**
	 * @type boolean
	 * @description When true, scalar results from several queries are merged into one table keyed by their group-by columns. Defaults to false.
	 */
	formatTableResultForUI?: boolean;
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

/**
 * @nullable
 */
export type TelemetrystoretypesGranulesDTO = {
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
} | null;

/**
 * The granule analysis for the statement; null unless verbose was requested.
 */
export type Querybuildertypesv5PreviewStatementDTOGranules = TelemetrystoretypesGranulesDTO | null;

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

export interface Querybuildertypesv5PreviewStatementDTO {
	/**
	 * @type array
	 * @description The values bound to the statement placeholders, in order.
	 */
	'db.statement.args': unknown[];
	/**
	 * @type string
	 * @description The ClickHouse SQL statement with positional parameter placeholders.
	 */
	'db.statement.query': string;
	/**
	 * @type array
	 * @description The EXPLAIN ESTIMATE rows for the statement; empty unless verbose was requested.
	 */
	estimate: TelemetrystoretypesEstimateEntryDTO[];
	/**
	 * @description The granule analysis for the statement; null unless verbose was requested.
	 */
	granules: Querybuildertypesv5PreviewStatementDTOGranules;
}

export interface Querybuildertypesv5TimeSeriesDataDTO {
	/**
	 * @type array,null
	 * @description One bucket per aggregation of the query. The order is not guaranteed; match buckets to aggregations by index.
	 */
	aggregations?: Querybuildertypesv5AggregationBucketDTO[] | null;
	/**
	 * @type string
	 * @description The name of the query that produced this result.
	 */
	queryName?: string;
}

export interface Querybuildertypesv5ScalarDataDTO {
	/**
	 * @type array,null
	 * @description The column definitions, in the same order as the values in each data row.
	 */
	columns?: Querybuildertypesv5ColumnDescriptorDTO[] | null;
	/**
	 * @type array,null
	 * @description The rows, each a list of values aligned with columns.
	 */
	data?: unknown[][] | null;
	/**
	 * @type string
	 * @description The name of the query that produced this table.
	 */
	queryName?: string;
}

/**
 * The selected field values keyed by field name.
 */
export type Querybuildertypesv5RawRowDTODataAnyOf = { [key: string]: unknown };

/**
 * The selected field values keyed by field name.
 * @nullable
 */
export type Querybuildertypesv5RawRowDTOData = Querybuildertypesv5RawRowDTODataAnyOf | null;

export interface Querybuildertypesv5RawRowDTO {
	/**
	 * @type object,null
	 * @description The selected field values keyed by field name.
	 */
	data?: Querybuildertypesv5RawRowDTOData;
	/**
	 * @type string
	 * @format date-time
	 * @description The record timestamp in RFC 3339 format.
	 */
	timestamp?: string;
}

export interface Querybuildertypesv5RawDataDTO {
	/**
	 * @type string
	 * @description The cursor to pass in the next request to continue from the last row; empty when there are no more rows.
	 */
	nextCursor?: string;
	/**
	 * @type string
	 * @description The name of the query that produced these rows.
	 */
	queryName?: string;
	/**
	 * @type array,null
	 * @description The matching records in the requested order.
	 */
	rows?: Querybuildertypesv5RawRowDTO[] | null;
}

export type Querybuildertypesv5QueryDataDTO =
	| (Querybuildertypesv5TimeSeriesDataDTO & {
			/**
			 * @type array,null
			 * @description One result per enabled query, typed by the request type: TimeSeriesData for time_series, ScalarData for scalar and RawData for raw requests.
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5ScalarDataDTO & {
			/**
			 * @type array,null
			 * @description One result per enabled query, typed by the request type: TimeSeriesData for time_series, ScalarData for scalar and RawData for raw requests.
			 */
			results?: unknown[] | null;
	  })
	| (Querybuildertypesv5RawDataDTO & {
			/**
			 * @type array,null
			 * @description One result per enabled query, typed by the request type: TimeSeriesData for time_series, ScalarData for scalar and RawData for raw requests.
			 */
			results?: unknown[] | null;
	  });

export interface Querybuildertypesv5QueryPreviewDTO {
	/**
	 * @description The rendering error when valid is false, otherwise null.
	 */
	error: unknown;
	/**
	 * @type array
	 * @description The rendered statements, returned only when verbose is true: one per PromQL metric selector, one for builder, ClickHouse SQL and trace operator queries, none for formulas. Empty otherwise.
	 */
	statements: Querybuildertypesv5PreviewStatementDTO[];
	/**
	 * @type boolean
	 * @description Whether the query rendered without error.
	 */
	valid: boolean;
	/**
	 * @type array
	 * @description Warnings raised while rendering the query.
	 */
	warnings: string[];
}

/**
 * The rendered statements for each query, keyed by query name.
 */
export type Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQueryAnyOf =
	{ [key: string]: Querybuildertypesv5QueryPreviewDTO };

/**
 * The rendered statements for each query, keyed by query name.
 * @nullable
 */
export type Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQuery = Querybuildertypesv5QueryRangePreviewResponseDTOCompositeQueryAnyOf | null;

/**
 * Response from the v5 query range preview (dry-run) endpoint. For each query in the composite query, returns the underlying ClickHouse statement(s) it renders to without executing them (one per PromQL metric selector; exactly one for builder/ClickHouse/trace-operator queries), with the optional EXPLAIN ESTIMATE and granule analysis attached per statement when requested.
 */
export interface Querybuildertypesv5QueryRangePreviewResponseDTO {
	/**
	 * @type object,null
	 * @description The rendered statements for each query, keyed by query name.
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

/**
 * The selected value: a string, number or boolean, or a list of them for multi-select variables. The string __all__ is special only for dynamic variables in builder filters and PromQL, where it removes the condition that references the variable; query, custom and text variables, and ClickHouse SQL for every type, substitute it literally.
 */
export type Querybuildertypesv5VariableItemDTOValue =
	| string
	| number
	| boolean
	| Querybuildertypesv5VariableItemDTOValueOneOfItem[];

export interface Querybuildertypesv5VariableItemDTO {
	/**
	 * @description The kind of dashboard variable: query, dynamic, custom or text.
	 */
	type?: Querybuildertypesv5VariableTypeDTO;
	/**
	 * @description The selected value: a string, number or boolean, or a list of them for multi-select variables. The string __all__ is special only for dynamic variables in builder filters and PromQL, where it removes the condition that references the variable; query, custom and text variables, and ClickHouse SQL for every type, substitute it literally.
	 */
	value?: Querybuildertypesv5VariableItemDTOValue;
}

/**
 * Dashboard variable values keyed by variable name. Builder filters substitute only the $name form and leave a quoted {{name}} unchanged; PromQL and ClickHouse SQL substitute $name, {{name}}, [[name]] and the Go template form {{.name}}.
 */
export type Querybuildertypesv5QueryRangeRequestDTOVariables = {
	[key: string]: Querybuildertypesv5VariableItemDTO;
};

/**
 * Request body for the v5 query range endpoint. Supports builder queries (traces, logs, metrics), formulas, trace operators, PromQL, and ClickHouse SQL queries.
 */
export interface Querybuildertypesv5QueryRangeRequestDTO {
	/**
	 * @description The queries to execute together; at least one is required and formulas may reference the others by name.
	 */
	compositeQuery?: Querybuildertypesv5CompositeQueryDTO;
	/**
	 * @type integer
	 * @minimum 0
	 * @description The end of the time range as a Unix timestamp in milliseconds; must be greater than start except for raw_stream requests.
	 */
	end?: number;
	/**
	 * @description Post-processing applied to the result before it is returned.
	 */
	formatOptions?: Querybuildertypesv5FormatOptionsDTO;
	/**
	 * @type boolean
	 * @description When true, results are computed fresh instead of being served from the query result cache. Defaults to false.
	 */
	noCache?: boolean;
	/**
	 * @description The shape of the result: scalar, time_series, raw, raw_stream, trace, distribution or heatmap. It decides which result type data.results carries.
	 */
	requestType?: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @type string
	 * @description The version of the request payload schema, currently v1.
	 */
	schemaVersion?: string;
	/**
	 * @type integer
	 * @minimum 0
	 * @description The inclusive start of the time range as a Unix timestamp in milliseconds.
	 */
	start?: number;
	/**
	 * @type object
	 * @description Dashboard variable values keyed by variable name. Builder filters substitute only the $name form and leave a quoted {{name}} unchanged; PromQL and ClickHouse SQL substitute $name, {{name}}, [[name]] and the Go template form {{.name}}.
	 */
	variables?: Querybuildertypesv5QueryRangeRequestDTOVariables;
}

/**
 * Response from the v5 query range endpoint. The data.results array contains typed results depending on the requestType: TimeSeriesData for time_series, ScalarData for scalar, or RawData for raw requests.
 */
export interface Querybuildertypesv5QueryRangeResponseDTO {
	/**
	 * @description The query results.
	 */
	data?: Querybuildertypesv5QueryDataDTO;
	/**
	 * @description Execution statistics for the whole request: a rough measure of how expensive the query was. Use the results, not these numbers, to decide whether data exists; an empty result can still scan many rows.
	 */
	meta?: Querybuildertypesv5ExecStatsDTO;
	/**
	 * @description The request type the results are shaped for, echoed from the request.
	 */
	type?: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @description Warnings raised while executing the request, if any.
	 */
	warning?: Querybuildertypesv5QueryWarnDataDTO;
}

export enum Querybuildertypesv5QueryTypeDTO {
	builder_query = 'builder_query',
	builder_ai_query = 'builder_ai_query',
	builder_formula = 'builder_formula',
	builder_trace_operator = 'builder_trace_operator',
	clickhouse_sql = 'clickhouse_sql',
	promql = 'promql',
}
export enum QuickfiltertypesSourceDTO {
	traces = 'traces',
	logs = 'logs',
	api_monitoring = 'api_monitoring',
	exceptions = 'exceptions',
	meter = 'meter',
	ai_observability = 'ai_observability',
}
export interface QuickfiltertypesSourceFiltersDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type array
	 */
	filters: TelemetrytypesTelemetryFieldKeyDTO[];
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	orgId: string;
	source: QuickfiltertypesSourceDTO;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}

export interface QuickfiltertypesUpdatableQuickFiltersDTO {
	/**
	 * @type array
	 */
	filters: TelemetrytypesTelemetryFieldKeyDTO[];
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
	relatedAITracesLink?: string;
	/**
	 * @type string
	 */
	relatedLogsLink?: string;
	/**
	 * @type string
	 */
	relatedTracesLink?: string;
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
	relatedAITracesLink?: string;
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
	/**
	 * @description The panel the UI renders the queries with: graph, table or value. Use graph for alerts.
	 */
	panelType: RuletypesPanelTypeDTO;
	/**
	 * @type array,null
	 * @description The queries to evaluate, at least one. Every envelope type must match queryType: builder_query and builder_formula for builder, promql for promql, clickhouse_sql for clickhouse_sql.
	 */
	queries: Querybuildertypesv5QueryEnvelopeDTO[] | null;
	/**
	 * @description The query language of every query: builder, promql or clickhouse_sql.
	 */
	queryType: RuletypesQueryTypeDTO;
	/**
	 * @type string
	 * @description The unit of the query result, such as percent, ms or bytes. Used to format values in notifications and to convert thresholds given in a different targetUnit.
	 */
	unit?: string;
}

export enum RuletypesAlertTypeDTO {
	METRIC_BASED_ALERT = 'METRIC_BASED_ALERT',
	TRACES_BASED_ALERT = 'TRACES_BASED_ALERT',
	LOGS_BASED_ALERT = 'LOGS_BASED_ALERT',
	EXCEPTIONS_BASED_ALERT = 'EXCEPTIONS_BASED_ALERT',
	AI_TRACES_BASED_ALERT = 'AI_TRACES_BASED_ALERT',
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
	above_or_equal = 'above_or_equal',
	below_or_equal = 'below_or_equal',
	outside_bounds = 'outside_bounds',
}
export interface RuletypesBasicRuleThresholdDTO {
	/**
	 * @type array,null
	 * @description The displayName of each notification channel alerts crossing this threshold are sent to. Ignored when notificationSettings.usePolicy is true.
	 */
	channels?: string[] | null;
	/**
	 * @description Which points in the window must satisfy op. Accepted as at_least_once, all_the_times, on_average, in_total or last, their aliases avg and sum, or the legacy codes as strings, '1' to '5'.
	 */
	matchType: RuletypesMatchTypeDTO;
	/**
	 * @type string
	 * @description The threshold name, conventionally critical, error, warning or info. Alerts carry it as the threshold.name label and, lowercased, as the severity label; templates can read it as $threshold.name.
	 */
	name: string;
	/**
	 * @description How the value is compared with target. Accepted as above, below, equal, not_equal, above_or_equal, below_or_equal or outside_bounds, their symbols, or the legacy codes as strings, '1' to '7'.
	 */
	op: RuletypesCompareOperatorDTO;
	/**
	 * @type number,null
	 * @format double
	 * @description The value at which a firing alert resolves, in targetUnit. Keeps an alert firing between target and recoveryTarget to avoid flapping; null resolves at target.
	 */
	recoveryTarget?: number | null;
	/**
	 * @type number,null
	 * @format double
	 * @description The value the query result is compared against, in targetUnit.
	 */
	target: number | null;
	/**
	 * @type string
	 * @description The unit of target and recoveryTarget, such as percent or ms. Converted to the query unit before comparison when the two differ; empty means the query unit.
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
	 * @description The day of the month of the reset boundary, 1 to 31. Required for monthly.
	 */
	day?: number | null;
	/**
	 * @type integer,null
	 * @description The hour of the reset boundary, 0 to 23. Required for daily, weekly and monthly.
	 */
	hour?: number | null;
	/**
	 * @type integer,null
	 * @description The minute of the reset boundary, 0 to 59. Required for every type.
	 */
	minute?: number | null;
	/**
	 * @description How often the window resets: hourly, daily, weekly or monthly.
	 */
	type: RuletypesScheduleTypeDTO;
	/**
	 * @type integer,null
	 * @description The weekday of the reset boundary, 0 (Sunday) to 6 (Saturday). Required for weekly.
	 */
	weekday?: number | null;
}

export interface RuletypesCumulativeWindowDTO {
	/**
	 * @type string
	 * @description How often the rule is evaluated, as a Go duration such as 1m. Must be positive.
	 */
	frequency: string;
	/**
	 * @description The boundary the accumulation window starts from. Each evaluation queries from the most recent boundary to now.
	 */
	schedule: RuletypesCumulativeScheduleDTO;
	/**
	 * @type string
	 * @description The IANA time zone the schedule is resolved in, such as UTC or Asia/Kolkata.
	 */
	timezone: string;
}

/**
 * The kind of evaluation.
 */
export enum RuletypesEvaluationCumulativeDTOKind {
	cumulative = 'cumulative',
}
export interface RuletypesEvaluationCumulativeDTO {
	/**
	 * @type string
	 * @enum cumulative
	 * @description The kind of evaluation.
	 */
	kind: RuletypesEvaluationCumulativeDTOKind;
	/**
	 * @description The cumulative window evaluation specification.
	 */
	spec: RuletypesCumulativeWindowDTO;
}

/**
 * The kind of evaluation.
 */
export enum RuletypesEvaluationRollingDTOKind {
	rolling = 'rolling',
}
export interface RuletypesRollingWindowDTO {
	/**
	 * @type string
	 * @description The sliding lookback window each evaluation queries, as a Go duration such as 5m.
	 */
	evalWindow: string;
	/**
	 * @type string
	 * @description How often the rule is evaluated, as a Go duration such as 1m. Must be positive.
	 */
	frequency: string;
}

export interface RuletypesEvaluationRollingDTO {
	/**
	 * @type string
	 * @enum rolling
	 * @description The kind of evaluation.
	 */
	kind: RuletypesEvaluationRollingDTOKind;
	/**
	 * @description The rolling window evaluation specification.
	 */
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
	 * @description The number of alerts the test notification produced. Counts every evaluated series, including those that did not cross the threshold.
	 */
	alertCount?: number;
	/**
	 * @type string
	 * @description A human readable summary of the test evaluation.
	 */
	message?: string;
}

export interface RuletypesLabelPairDTO {
	/**
	 * @type string
	 * @description The label name.
	 */
	key: string;
	/**
	 * @type string
	 * @description The label value.
	 */
	value: string;
}

export enum RuletypesListOrderDTO {
	asc = 'asc',
	desc = 'desc',
}
export enum RuletypesListSortDTO {
	updated_at = 'updated_at',
	created_at = 'created_at',
	name = 'name',
	state = 'state',
	severity = 'severity',
}
/**
 * The labels attached to alerts the rule fires.
 */
export type RuletypesListableRuleDTOLabels = { [key: string]: string };

export enum RuletypesRuleTypeDTO {
	threshold_rule = 'threshold_rule',
	promql_rule = 'promql_rule',
	anomaly_rule = 'anomaly_rule',
}
export interface RuletypesListableRuleDTO {
	/**
	 * @type string
	 * @description The display name of the alert rule.
	 */
	alert: string;
	/**
	 * @description The signal the rule evaluates: METRIC_BASED_ALERT, TRACES_BASED_ALERT, LOGS_BASED_ALERT, EXCEPTIONS_BASED_ALERT or AI_TRACES_BASED_ALERT.
	 */
	alertType: RuletypesAlertTypeDTO;
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
	 * @description A human readable description of what the rule monitors.
	 */
	description?: string;
	/**
	 * @type boolean
	 * @description Whether the rule is paused.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description The unique identifier of the rule.
	 */
	id: string;
	/**
	 * @type object
	 * @description The labels attached to alerts the rule fires.
	 */
	labels?: RuletypesListableRuleDTOLabels;
	/**
	 * @description The evaluation strategy: threshold_rule, promql_rule or anomaly_rule.
	 */
	ruleType: RuletypesRuleTypeDTO;
	/**
	 * @description The current evaluation state: inactive, pending, recovering, firing, nodata or disabled.
	 */
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
}

export interface RuletypesRuleViewDataDTO {
	/**
	 * @description The sort direction: asc or desc (the default).
	 */
	order?: RuletypesListOrderDTO;
	/**
	 * @type string
	 * @description A filter expression over rule name, description, labels and other fields, at most 1024 characters. Empty matches every rule.
	 */
	query?: string;
	/**
	 * @description The field to sort by: updated_at (the default), created_at, name, state or severity.
	 */
	sort?: RuletypesListSortDTO;
	/**
	 * @type array
	 * @description Only return rules in these states: firing, pending, recovering, inactive, nodata or disabled. Empty means every state.
	 */
	states?: string[];
	/**
	 * @type string
	 */
	version: string;
}

export interface RuletypesRuleViewDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	data: RuletypesRuleViewDataDTO;
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

export interface RuletypesListableRuleViewsDTO {
	/**
	 * @type array
	 */
	views: RuletypesRuleViewDTO[];
}

export interface RuletypesListableRulesDTO {
	/**
	 * @type array
	 * @description Organization-wide label key and value pair suggestions for building filters, independent of the current filter and page, capped at 1000 distinct pairs.
	 */
	labels: RuletypesLabelPairDTO[];
	/**
	 * @type array
	 * @description The keys the query filter language reserves, which cannot be used as label names in a query.
	 */
	reservedKeywords: string[];
	/**
	 * @type array
	 * @description The page of rules matching the filter.
	 */
	rules: RuletypesListableRuleDTO[];
	/**
	 * @type integer
	 * @format int64
	 * @description The number of rules matching the filter across all pages.
	 */
	total: number;
}

export interface RuletypesRenotifyDTO {
	/**
	 * @type array,null
	 * @description The alert states that are re-notified: firing, nodata or both.
	 */
	alertStates?: RuletypesAlertStateDTO[] | null;
	/**
	 * @type boolean
	 * @description Whether an active alert is re-sent after interval elapses. When false an alert notifies once per firing.
	 */
	enabled?: boolean;
	/**
	 * @type string
	 * @description The time between repeat notifications, as a Go duration such as 4h. Must be positive when enabled is true.
	 */
	interval?: string;
}

export interface RuletypesNotificationSettingsDTO {
	/**
	 * @type array,null
	 * @description Label names whose values group alerts into one notification, such as service.name.
	 */
	groupBy?: string[] | null;
	/**
	 * @type string
	 * @description A grace period, as a Go duration such as 2m, during which a newly seen label group is excluded from evaluation. Applies to metric rules only; log and trace rules are never delayed. A group whose values are not yet known is evaluated immediately.
	 */
	newGroupEvalDelay?: string;
	/**
	 * @description Whether and how often to re-send a notification for an alert that stays active.
	 */
	renotify?: RuletypesRenotifyDTO;
	/**
	 * @type boolean
	 * @description When true, alerts are routed by the organisation level notification policies instead of the channels named on the thresholds. Defaults to false.
	 */
	usePolicy?: boolean;
}

/**
 * Free text attached to every alert, conventionally summary and description. Values may use Go templates with $value, $threshold and $labels.
 */
export type RuletypesPostableRuleDTOAnnotations = { [key: string]: string };

/**
 * Labels attached to every alert the rule fires. Keys match [a-zA-Z_.][a-zA-Z0-9_.]*; values may use Go templates such as {{$labels.service_name}}. severity is the conventional routing label.
 */
export type RuletypesPostableRuleDTOLabels = { [key: string]: string };

/**
 * The rule payload schema.
 */
export enum RuletypesPostableRuleDTOSchemaVersion {
	v2alpha1 = 'v2alpha1',
}
export enum RuletypesSeasonalityDTO {
	hourly = 'hourly',
	daily = 'daily',
	weekly = 'weekly',
}
/**
 * The kind of threshold.
 */
export enum RuletypesThresholdBasicDTOKind {
	basic = 'basic',
}
/**
 * The basic threshold specification (array of thresholds).
 */
export type RuletypesThresholdBasicDTOSpec = RuletypesBasicRuleThresholdsDTO | null;

export interface RuletypesThresholdBasicDTO {
	/**
	 * @type string
	 * @enum basic
	 * @description The kind of threshold.
	 */
	kind: RuletypesThresholdBasicDTOKind;
	/**
	 * @description The basic threshold specification (array of thresholds).
	 */
	spec: RuletypesThresholdBasicDTOSpec;
}

export type RuletypesRuleThresholdDataDTO = RuletypesThresholdBasicDTO;

export interface RuletypesRuleConditionDTO {
	/**
	 * @type integer
	 * @minimum 0
	 * @description How many minutes without data pass before the nodata alert fires. Ignored unless alertOnAbsent is true.
	 */
	absentFor?: number;
	/**
	 * @type boolean
	 * @description Whether to fire a nodata alert when the query returns no data. Defaults to false.
	 */
	alertOnAbsent?: boolean;
	/**
	 * @type string
	 * @description anomaly_rule only: the anomaly detection algorithm. The supported value is standard.
	 */
	algorithm?: string;
	/**
	 * @description The queries whose result is compared against the thresholds.
	 */
	compositeQuery: RuletypesAlertCompositeQueryDTO;
	/**
	 * @description schemaVersion v1 only: which points in the window must satisfy op. Accepted as at_least_once, all_the_times, on_average, in_total or last, their aliases avg and sum, or the legacy codes as strings, '1' to '5'. Required for v1; v2alpha1 sets matchType on each threshold.
	 */
	matchType?: RuletypesMatchTypeDTO;
	/**
	 * @description schemaVersion v1 only: how the value is compared with target. Accepted as above, below, equal, not_equal, above_or_equal, below_or_equal or outside_bounds, their symbols, or the legacy codes as strings, '1' to '7'. Required for v1; v2alpha1 sets op on each threshold.
	 */
	op?: RuletypesCompareOperatorDTO;
	/**
	 * @type boolean
	 * @description Whether a series is skipped until it has at least requiredNumPoints points in the window. Defaults to false.
	 */
	requireMinPoints?: boolean;
	/**
	 * @type integer
	 * @description The minimum number of points a series needs before it is evaluated. Must be greater than 0 when requireMinPoints is true.
	 */
	requiredNumPoints?: number;
	/**
	 * @description anomaly_rule only: the seasonal period the history is compared against, hourly, daily or weekly.
	 */
	seasonality?: RuletypesSeasonalityDTO;
	/**
	 * @type string
	 * @description The name of the query whose result is evaluated, such as A or F1. Must match a query in compositeQuery.
	 */
	selectedQueryName: string;
	/**
	 * @type number,null
	 * @format double
	 * @description schemaVersion v1 only: the value compared against, in targetUnit. Required for v1; v2alpha1 sets target on each threshold.
	 */
	target?: number | null;
	/**
	 * @type string
	 * @description schemaVersion v1 only: the unit of target, such as percent or ms. Converted to compositeQuery.unit before comparison when the two differ.
	 */
	targetUnit?: string;
	/**
	 * @description The thresholds to evaluate, as a kind and spec.
	 */
	thresholds: RuletypesRuleThresholdDataDTO;
}

export interface RuletypesPostableRuleDTO {
	/**
	 * @type string
	 * @description The display name of the alert rule.
	 */
	alert: string;
	/**
	 * @description The signal the rule evaluates: METRIC_BASED_ALERT, TRACES_BASED_ALERT, LOGS_BASED_ALERT, EXCEPTIONS_BASED_ALERT or AI_TRACES_BASED_ALERT.
	 */
	alertType: RuletypesAlertTypeDTO;
	/**
	 * @type object
	 * @description Free text attached to every alert, conventionally summary and description. Values may use Go templates with $value, $threshold and $labels.
	 */
	annotations?: RuletypesPostableRuleDTOAnnotations;
	/**
	 * @description The query to evaluate and the thresholds applied to its result.
	 */
	condition: RuletypesRuleConditionDTO;
	/**
	 * @type string
	 * @description A human readable description of what the rule monitors.
	 */
	description?: string;
	/**
	 * @type boolean
	 * @description Whether the rule is paused. A disabled rule is neither evaluated nor notifies. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description The lookback window as a Go duration such as 5m. Only read when schemaVersion is v1, defaulting to 5m; v2alpha1 rules set it in evaluation.spec instead.
	 */
	evalWindow?: string;
	/**
	 * @description The evaluation window, as a kind and spec.
	 */
	evaluation: RuletypesEvaluationEnvelopeDTO;
	/**
	 * @type string
	 * @description How often the rule is evaluated, as a Go duration such as 1m. Only read when schemaVersion is v1, defaulting to 1m; v2alpha1 rules set it in evaluation.spec instead.
	 */
	frequency?: string;
	/**
	 * @type object
	 * @description Labels attached to every alert the rule fires. Keys match [a-zA-Z_.][a-zA-Z0-9_.]*; values may use Go templates such as {{$labels.service_name}}. severity is the conventional routing label.
	 */
	labels?: RuletypesPostableRuleDTOLabels;
	/**
	 * @description Grouping, re-notification and routing behaviour.
	 */
	notificationSettings: RuletypesNotificationSettingsDTO;
	/**
	 * @type array
	 * @description The displayName of each notification channel to notify, for schemaVersion v1 rules. Ignored for v2alpha1, where each threshold carries its own channels.
	 */
	preferredChannels?: string[];
	/**
	 * @description The evaluation strategy: threshold_rule compares against thresholds, promql_rule evaluates a PromQL expression, anomaly_rule scores deviation from seasonal history. Defaults to threshold_rule for builder and clickhouse_sql queries and is forced to promql_rule for promql queries.
	 */
	ruleType: RuletypesRuleTypeDTO;
	/**
	 * @enum v2alpha1
	 * @type string
	 * @description The rule payload schema.
	 */
	schemaVersion: RuletypesPostableRuleDTOSchemaVersion;
	/**
	 * @type string
	 * @description The URL of the page the rule was created from. Informational; it is not used for evaluation.
	 */
	source?: string;
	/**
	 * @type string
	 * @description The query payload version. Nothing reads it.
	 */
	version?: string;
}

export interface RuletypesPostableRuleViewDTO {
	data: RuletypesRuleViewDataDTO;
	/**
	 * @type string
	 */
	name: string;
}

/**
 * Free text attached to every alert, conventionally summary and description. Values may use Go templates with $value, $threshold and $labels.
 */
export type RuletypesRuleDTOAnnotations = { [key: string]: string };

/**
 * Labels attached to every alert the rule fires. Keys match [a-zA-Z_.][a-zA-Z0-9_.]*; values may use Go templates such as {{$labels.service_name}}. severity is the conventional routing label.
 */
export type RuletypesRuleDTOLabels = { [key: string]: string };

/**
 * The rule payload schema.
 */
export enum RuletypesRuleDTOSchemaVersion {
	v2alpha1 = 'v2alpha1',
}
export interface RuletypesRuleDTO {
	/**
	 * @type string
	 * @description The display name of the alert rule.
	 */
	alert: string;
	/**
	 * @description The signal the rule evaluates: METRIC_BASED_ALERT, TRACES_BASED_ALERT, LOGS_BASED_ALERT, EXCEPTIONS_BASED_ALERT or AI_TRACES_BASED_ALERT.
	 */
	alertType: RuletypesAlertTypeDTO;
	/**
	 * @type object
	 * @description Free text attached to every alert, conventionally summary and description. Values may use Go templates with $value, $threshold and $labels.
	 */
	annotations?: RuletypesRuleDTOAnnotations;
	/**
	 * @description The query to evaluate and the thresholds applied to its result.
	 */
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
	 * @description A human readable description of what the rule monitors.
	 */
	description?: string;
	/**
	 * @type boolean
	 * @description Whether the rule is paused. A disabled rule is neither evaluated nor notifies. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description The lookback window as a Go duration such as 5m. Only read when schemaVersion is v1, defaulting to 5m; v2alpha1 rules set it in evaluation.spec instead.
	 */
	evalWindow?: string;
	/**
	 * @description The evaluation window, as a kind and spec.
	 */
	evaluation: RuletypesEvaluationEnvelopeDTO;
	/**
	 * @type string
	 * @description How often the rule is evaluated, as a Go duration such as 1m. Only read when schemaVersion is v1, defaulting to 1m; v2alpha1 rules set it in evaluation.spec instead.
	 */
	frequency?: string;
	/**
	 * @type string
	 * @description The unique identifier of the rule.
	 */
	id: string;
	/**
	 * @type object
	 * @description Labels attached to every alert the rule fires. Keys match [a-zA-Z_.][a-zA-Z0-9_.]*; values may use Go templates such as {{$labels.service_name}}. severity is the conventional routing label.
	 */
	labels?: RuletypesRuleDTOLabels;
	/**
	 * @description Grouping, re-notification and routing behaviour.
	 */
	notificationSettings: RuletypesNotificationSettingsDTO;
	/**
	 * @type array
	 * @description The displayName of each notification channel to notify, for schemaVersion v1 rules. Ignored for v2alpha1, where each threshold carries its own channels.
	 */
	preferredChannels?: string[];
	/**
	 * @description The evaluation strategy: threshold_rule compares against thresholds, promql_rule evaluates a PromQL expression, anomaly_rule scores deviation from seasonal history. Defaults to threshold_rule for builder and clickhouse_sql queries and is forced to promql_rule for promql queries.
	 */
	ruleType: RuletypesRuleTypeDTO;
	/**
	 * @enum v2alpha1
	 * @type string
	 * @description The rule payload schema.
	 */
	schemaVersion: RuletypesRuleDTOSchemaVersion;
	/**
	 * @type string
	 * @description The URL of the page the rule was created from. Informational; it is not used for evaluation.
	 */
	source?: string;
	/**
	 * @description The current evaluation state: inactive, pending, recovering, firing, nodata or disabled.
	 */
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
	 * @description The query payload version. Nothing reads it.
	 */
	version?: string;
}

export enum RuletypesThresholdKindDTO {
	basic = 'basic',
}
export interface SavedviewtypesDisplayDTO {
	/**
	 * @type string
	 * @description A CSS color such as a hex code, shown as the view's color in the explorer view picker; the saved views panel does not use it. Empty leaves the default.
	 */
	color?: string;
	/**
	 * @type string
	 * @description The row font size in list views: small, medium or large. Empty leaves the explorer default.
	 */
	fontSize?: string;
	/**
	 * @type string
	 * @description The list rendering mode in the logs explorer: raw, table or list. Empty leaves the explorer default.
	 */
	format?: string;
	/**
	 * @type integer
	 * @description The number of lines shown per row before the body is truncated in logs list views. 0 leaves the explorer default.
	 */
	maxLines?: number;
}

export enum SavedviewtypesPanelTypeDTO {
	value = 'value',
	graph = 'graph',
	table = 'table',
	list = 'list',
	trace = 'trace',
}
export enum SavedviewtypesSchemaVersionDTO {
	v2 = 'v2',
}
export enum SavedviewtypesSourceDTO {
	traces = 'traces',
	logs = 'logs',
	metrics = 'metrics',
	meter = 'meter',
	ai_observability = 'ai_observability',
}
export interface SavedviewtypesSavedViewSpecDTO {
	/**
	 * @description Rendering preferences for list panels. All fields are optional.
	 */
	display?: SavedviewtypesDisplayDTO;
	/**
	 * @type string
	 * @description The human readable title shown in the explorer. It may differ from the machine name and need not be unique.
	 */
	displayName: string;
	/**
	 * @description The explorer panel the view renders as: list, graph, table, value or trace.
	 */
	panelType: SavedviewtypesPanelTypeDTO;
	/**
	 * @type array
	 * @description The query envelopes the view runs, in the v5 query builder shape. At least one is required and the set is validated for the requestType.
	 */
	queries: Querybuildertypesv5QueryEnvelopeDTO[];
	/**
	 * @description The query_range request type the panel issues: raw for list panels, time_series for graphs, scalar for table and value panels, trace for trace panels.
	 */
	requestType: Querybuildertypesv5RequestTypeDTO;
	/**
	 * @type array
	 * @description The columns shown in list panels, each a field key with name and optionally signal, fieldContext and fieldDataType. Send explicit columns for list views: an empty array yields no trace columns and only the required log columns. Use an empty array for graph views.
	 */
	selectedFields?: TelemetrytypesTelemetryFieldKeyDTO[];
}

export interface SavedviewtypesPostableSavedViewDTO {
	/**
	 * @type boolean
	 * @description When true the server derives name from spec.displayName and appends a random suffix. Defaults to false.
	 */
	generateName?: boolean;
	/**
	 * @type string
	 * @description The machine name of the view, a DNS-1123 label (lowercase letters, digits and hyphens, at most 63 characters) unique within the organization. Required unless generateName is true, in which case it must be empty.
	 */
	name?: string;
	/**
	 * @description The version of the spec shape. The only accepted value is v2.
	 */
	schemaVersion: SavedviewtypesSchemaVersionDTO;
	/**
	 * @description The explorer page the view belongs to: traces, logs, metrics, meter or ai_observability. Builder queries inside spec must use the matching signal; meter views use signal metrics with source meter.
	 */
	source: SavedviewtypesSourceDTO;
	/**
	 * @description The display name, panel type, request type, queries and column selection of the view.
	 */
	spec: SavedviewtypesSavedViewSpecDTO;
}

export interface SavedviewtypesSavedViewDTO {
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
	 * @description The machine name of the view, a DNS-1123 label unique within the organization. Immutable after creation.
	 */
	name?: string;
	/**
	 * @description The version of the spec shape. The only accepted value is v2.
	 */
	schemaVersion: SavedviewtypesSchemaVersionDTO;
	/**
	 * @description The explorer page the view belongs to: traces, logs, metrics, meter or ai_observability.
	 */
	source?: SavedviewtypesSourceDTO;
	/**
	 * @description The display name, panel type, request type, queries and column selection of the view.
	 */
	spec: SavedviewtypesSavedViewSpecDTO;
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

export interface SavedviewtypesUpdatableSavedViewDTO {
	/**
	 * @description The version of the spec shape. The only accepted value is v2.
	 */
	schemaVersion: SavedviewtypesSchemaVersionDTO;
	/**
	 * @description The explorer page the view belongs to: traces, logs, metrics, meter or ai_observability. The machine name cannot be changed; it is identified by the id in the path.
	 */
	source: SavedviewtypesSourceDTO;
	/**
	 * @description The full replacement spec. Fields left out are reset, not preserved.
	 */
	spec: SavedviewtypesSavedViewSpecDTO;
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

export enum SpantypesSpanMapperOriginDTO {
	user = 'user',
	system = 'system',
}
export interface SpantypesSpanMapperGroupConditionKeyDTO {
	/**
	 * @type boolean
	 */
	enabled: boolean;
	origin?: SpantypesSpanMapperOriginDTO;
	/**
	 * @type string
	 */
	value: string;
}

/**
 * @nullable
 */
export type SpantypesSpanMapperGroupConditionDTO = {
	/**
	 * @type array,null
	 */
	attributes: SpantypesSpanMapperGroupConditionKeyDTO[] | null;
	/**
	 * @type array,null
	 */
	resource: SpantypesSpanMapperGroupConditionKeyDTO[] | null;
} | null;

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
	origin: SpantypesSpanMapperOriginDTO;
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
	 * @type integer
	 */
	version: number;
}

export interface SpantypesGettableSpanMapperGroupsDTO {
	/**
	 * @type array
	 */
	items: SpantypesSpanMapperGroupDTO[];
}

export type SpantypesSpanMapperTestSpanDTOAttributesAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type SpantypesSpanMapperTestSpanDTOAttributes = SpantypesSpanMapperTestSpanDTOAttributesAnyOf | null;

export type SpantypesSpanMapperTestSpanDTOResourceAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type SpantypesSpanMapperTestSpanDTOResource = SpantypesSpanMapperTestSpanDTOResourceAnyOf | null;

export interface SpantypesSpanMapperTestSpanDTO {
	/**
	 * @type object,null
	 */
	attributes?: SpantypesSpanMapperTestSpanDTOAttributes;
	/**
	 * @type object,null
	 */
	resource?: SpantypesSpanMapperTestSpanDTOResource;
}

export interface SpantypesGettableSpanMapperTestDTO {
	/**
	 * @type array,null
	 */
	collectorLogs?: string[] | null;
	/**
	 * @type array,null
	 */
	spans?: SpantypesSpanMapperTestSpanDTO[] | null;
}

export enum SpantypesSpanMapperOperationDTO {
	move = 'move',
	copy = 'copy',
}
export interface SpantypesSpanMapperSourceDTO {
	context: SpantypesFieldContextDTO;
	/**
	 * @type boolean
	 */
	enabled: boolean;
	/**
	 * @type string
	 */
	key: string;
	operation: SpantypesSpanMapperOperationDTO;
	origin?: SpantypesSpanMapperOriginDTO;
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
	groupId: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 */
	name: string;
	origin: SpantypesSpanMapperOriginDTO;
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

export interface SpantypesGettableSpanMappersDTO {
	/**
	 * @type array
	 */
	items: SpantypesSpanMapperDTO[];
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
export type SpantypesSpanAggregationResultDTOValue = SpantypesSpanAggregationResultDTOValueAnyOf | null;

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

export interface SpantypesTraceAITokensDTO {
	/**
	 * @type integer
	 * @minimum 0
	 */
	cacheRead: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	cacheWrite: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	input: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	output: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	reasoning: number;
}

export interface SpantypesTraceAISummaryDTO {
	tokens: SpantypesTraceAITokensDTO;
	/**
	 * @type number
	 */
	totalCost?: number;
}

export interface SpantypesGettableTraceSummaryDTO {
	ai?: SpantypesTraceAISummaryDTO;
	/**
	 * @type integer
	 * @minimum 0
	 */
	endTimestampMillis: number;
	/**
	 * @type boolean
	 */
	hasMissingSpans: boolean;
	/**
	 * @type string
	 */
	rootServiceEntryPoint: string;
	/**
	 * @type string
	 */
	rootServiceName: string;
	/**
	 * @type string
	 */
	rootSpanStatusCode: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	startTimestampMillis: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalErrorSpansCount: number;
	/**
	 * @type integer
	 * @minimum 0
	 */
	totalSpansCount: number;
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

export type SpantypesThreadSpanDTOAttributes = { [key: string]: unknown };

export type SpantypesThreadSpanDTOResource = { [key: string]: string };

export interface SpantypesThreadSpanDTO {
	/**
	 * @type object
	 */
	attributes: SpantypesThreadSpanDTOAttributes;
	/**
	 * @type integer
	 * @minimum 0
	 */
	duration_nano: number;
	/**
	 * @type array
	 */
	events: SpantypesEventDTO[];
	formattedInput: AiobservabilitytypesInputMessagesDTO;
	formattedOutput: AiobservabilitytypesOutputMessagesDTO;
	/**
	 * @type array
	 */
	formatterWarnings: string[];
	/**
	 * @type boolean
	 */
	has_error: boolean;
	/**
	 * @type string
	 */
	kind_string: string;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type string
	 */
	parent_span_id: string;
	/**
	 * @type array
	 */
	references: SpantypesOtelSpanRefDTO[];
	/**
	 * @type object
	 */
	resource: SpantypesThreadSpanDTOResource;
	/**
	 * @type string
	 */
	span_id: string;
	/**
	 * @type string
	 */
	status_code_string: string;
	/**
	 * @type string
	 */
	status_message: string;
	/**
	 * @type integer
	 * @minimum 0
	 */
	time_unix: number;
	/**
	 * @type string
	 */
	trace_id: string;
}

export interface SpantypesGettableTraceThreadDTO {
	/**
	 * @type string
	 */
	nextCursor?: string;
	/**
	 * @type string
	 */
	prevCursor?: string;
	/**
	 * @type array
	 */
	spans: SpantypesThreadSpanDTO[];
}

export type SpantypesWaterfallSpanDTOAttributesAnyOf = {
	[key: string]: unknown;
};

/**
 * @nullable
 */
export type SpantypesWaterfallSpanDTOAttributes = SpantypesWaterfallSpanDTOAttributesAnyOf | null;

export type SpantypesWaterfallSpanDTOResourceAnyOf = { [key: string]: string };

/**
 * @nullable
 */
export type SpantypesWaterfallSpanDTOResource = SpantypesWaterfallSpanDTOResourceAnyOf | null;

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
	formattedInput?: AiobservabilitytypesInputMessagesDTO;
	formattedOutput?: AiobservabilitytypesOutputMessagesDTO;
	/**
	 * @type array
	 */
	formatterWarnings?: string[];
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

export interface SpantypesPostableSpanMapperTestGroupDTO {
	condition: SpantypesSpanMapperGroupConditionDTO | null;
	/**
	 * @type boolean
	 */
	enabled?: boolean;
	/**
	 * @type array,null
	 */
	mappers?: SpantypesPostableSpanMapperDTO[] | null;
	/**
	 * @type string
	 */
	name: string;
}

export interface SpantypesPostableSpanMapperTestDTO {
	/**
	 * @type array,null
	 */
	groups: SpantypesPostableSpanMapperTestGroupDTO[] | null;
	/**
	 * @type array,null
	 */
	spans: SpantypesSpanMapperTestSpanDTO[] | null;
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

export interface SubscriptiontypesGettableSubscriptionDTO {
	/**
	 * @type string
	 */
	redirectURL: string;
}

export interface SubscriptiontypesSubscriptionUsageDayWiseDataDTO {
	/**
	 * @type number
	 * @format double
	 */
	count?: number;
	/**
	 * @type number
	 * @format double
	 */
	quantity?: number;
	/**
	 * @type number
	 * @format double
	 */
	size?: number;
	/**
	 * @type integer
	 * @format int64
	 */
	timestamp?: number;
	/**
	 * @type number
	 * @format double
	 */
	total?: number;
	/**
	 * @type number
	 * @format double
	 */
	unitPrice?: number;
}

export interface SubscriptiontypesSubscriptionUsageDayWiseBreakdownDTO {
	/**
	 * @type array,null
	 */
	breakdown?: SubscriptiontypesSubscriptionUsageDayWiseDataDTO[] | null;
	/**
	 * @type string
	 */
	type?: string;
}

export interface SubscriptiontypesSubscriptionUsageTierDTO {
	/**
	 * @type number
	 * @format double
	 */
	quantity?: number;
	/**
	 * @type number
	 * @format double
	 */
	tierCost?: number;
	/**
	 * @type integer
	 * @format int64
	 */
	tierEnd?: number;
	/**
	 * @type integer
	 * @format int64
	 */
	tierStart?: number;
	/**
	 * @type number
	 * @format double
	 */
	unitPrice?: number;
}

export interface SubscriptiontypesSubscriptionUsageBreakdownDTO {
	dayWiseBreakdown?: SubscriptiontypesSubscriptionUsageDayWiseBreakdownDTO;
	/**
	 * @type array,null
	 */
	tiers?: SubscriptiontypesSubscriptionUsageTierDTO[] | null;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	unit?: string;
}

export interface SubscriptiontypesSubscriptionUsageDetailsDTO {
	/**
	 * @type number
	 * @format double
	 */
	baseFee?: number;
	/**
	 * @type number
	 * @format double
	 */
	billTotal?: number;
	/**
	 * @type array,null
	 */
	breakdown?: SubscriptiontypesSubscriptionUsageBreakdownDTO[] | null;
	/**
	 * @type number
	 * @format double
	 */
	total?: number;
}

export interface SubscriptiontypesGettableSubscriptionUsageDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	billingPeriodEnd?: number;
	/**
	 * @type integer
	 * @format int64
	 */
	billingPeriodStart?: number;
	details?: SubscriptiontypesSubscriptionUsageDetailsDTO;
	/**
	 * @type number
	 * @format double
	 */
	discount?: number;
	/**
	 * @type string
	 */
	subscriptionStatus?: string;
}

export interface SubscriptiontypesPostableSubscriptionDTO {
	/**
	 * @type string
	 */
	url: string;
}

/**
 * Matching keys grouped by name. A name maps to several entries when it exists in more than one context or data type.
 */
export type TelemetrytypesGettableFieldKeysDTOKeysAnyOf = {
	[key: string]: TelemetrytypesTelemetryFieldKeyDTO[];
};

/**
 * Matching keys grouped by name. A name maps to several entries when it exists in more than one context or data type.
 * @nullable
 */
export type TelemetrytypesGettableFieldKeysDTOKeys = TelemetrytypesGettableFieldKeysDTOKeysAnyOf | null;

export interface TelemetrytypesGettableFieldKeysDTO {
	/**
	 * @type boolean
	 * @description True when every matching key was returned; false when the result was cut off by limit.
	 */
	complete: boolean;
	/**
	 * @type object,null
	 * @description Matching keys grouped by name. A name maps to several entries when it exists in more than one context or data type.
	 */
	keys: TelemetrytypesGettableFieldKeysDTOKeys;
}

export interface TelemetrytypesTelemetryFieldValuesDTO {
	/**
	 * @type array
	 * @description Distinct boolean values of the field.
	 */
	boolValues?: boolean[];
	/**
	 * @type array
	 * @description Distinct numeric values of the field, up to limit.
	 */
	numberValues?: number[];
	/**
	 * @type array
	 * @description Values of the field seen on data that also matches existingQuery, within the startUnixMilli and endUnixMilli bounds. Empty when existingQuery is not set.
	 */
	relatedValues?: string[];
	/**
	 * @type array
	 * @description Distinct string values of the field, up to limit.
	 */
	stringValues?: string[];
}

export interface TelemetrytypesGettableFieldValuesDTO {
	/**
	 * @type boolean
	 * @description True when every matching value was returned; false when the result was cut off by limit.
	 */
	complete: boolean;
	/**
	 * @description Distinct values of the key, split by data type.
	 */
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

export interface TypesIdentifiableDTO {
	/**
	 * @type string
	 */
	id: string;
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

export type GetAIObservabilityFieldsKeysParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	searchText?: string;
	/**
	 * @description undefined
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description undefined
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
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
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
};

export type GetAIObservabilityFieldsKeys200 = {
	data: TelemetrytypesGettableFieldKeysDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetAIObservabilityFieldsValuesParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	searchText?: string;
	/**
	 * @description undefined
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description undefined
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
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
	 * @type integer
	 * @description undefined
	 */
	limit?: number;
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

export type GetAIObservabilityFieldsValues200 = {
	data: TelemetrytypesGettableFieldValuesDTO;
	/**
	 * @type string
	 */
	status: string;
};

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
	 * @description The signal to look up keys in: traces, logs or metrics. Empty searches every signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description The data source within the signal. Use meter for Cost Meter metrics; empty means the default source.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description Maximum number of results per signal. Defaults to 1000 for keys and 50 for values. For keys, intrinsic and materialized fields are added on top, and an empty signal applies the limit to traces, logs and metrics separately, so the response can exceed it.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the lookup window in Unix milliseconds, rounded down to a 6 hour boundary. Ignored for key lookups and meter lookups; trace and log values apply it at calendar-day granularity; metric attribute values and relatedValues apply it. Omit for no lower bound.
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description End of the lookup window in Unix milliseconds. Ignored for key lookups, trace and log value lookups and meter lookups; applied to metric attribute values and relatedValues. Omit for no upper bound.
	 */
	endUnixMilli?: number;
	/**
	 * @description Restricts keys to one context: resource, attribute, scope, span, trace, log, body or metric. Applied to trace and log keys; metric attribute keys ignore it. Empty means any context.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Restricts keys to one data type: string, bool, int64, float64 or number. Applied to trace and log keys; metric attribute keys ignore it. Empty means any type.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description Restricts keys to those seen on this metric. Metrics signal only.
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description Restricts keys to metrics in this namespace. Metrics signal only.
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description Substring to match: against key names for keys, against the values of name for values. Case-insensitive except for the meter source, where it is case-sensitive and % and _ act as wildcards. For keys, a context prefix such as resource.service.name sets fieldContext when it is empty.
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
	 * @description The signal to look up keys in: traces, logs or metrics. Empty searches every signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description The data source within the signal. Use meter for Cost Meter metrics; empty means the default source.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description Maximum number of results per signal. Defaults to 1000 for keys and 50 for values. For keys, intrinsic and materialized fields are added on top, and an empty signal applies the limit to traces, logs and metrics separately, so the response can exceed it.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the lookup window in Unix milliseconds, rounded down to a 6 hour boundary. Ignored for key lookups and meter lookups; trace and log values apply it at calendar-day granularity; metric attribute values and relatedValues apply it. Omit for no lower bound.
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description End of the lookup window in Unix milliseconds. Ignored for key lookups, trace and log value lookups and meter lookups; applied to metric attribute values and relatedValues. Omit for no upper bound.
	 */
	endUnixMilli?: number;
	/**
	 * @description Restricts keys to one context: resource, attribute, scope, span, trace, log, body or metric. Applied to trace and log keys; metric attribute keys ignore it. Empty means any context.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Restricts keys to one data type: string, bool, int64, float64 or number. Applied to trace and log keys; metric attribute keys ignore it. Empty means any type.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description Restricts keys to those seen on this metric. Metrics signal only.
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description Restricts keys to metrics in this namespace. Metrics signal only.
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description Substring to match: against key names for keys, against the values of name for values. Case-insensitive except for the meter source, where it is case-sensitive and % and _ act as wildcards. For keys, a context prefix such as resource.service.name sets fieldContext when it is empty.
	 */
	searchText?: string;
	/**
	 * @type string
	 * @description The key whose values to return, such as service.name. A context prefix such as resource.service.name sets fieldContext when it is empty.
	 */
	name?: string;
	/**
	 * @type string
	 * @description Filter expression already applied in the explorer. When set, relatedValues lists the values seen on data matching it.
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

export type GetGlobalConfig200 = {
	data: GlobaltypesConfigDTO;
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
export type ListPromotedPathsParams = {
	/**
	 * @type string
	 * @description undefined
	 */
	signal?: string;
	/**
	 * @type string
	 * @description undefined
	 */
	context?: string;
	/**
	 * @type boolean,null
	 * @description undefined
	 */
	promoted?: boolean | null;
	/**
	 * @type boolean,null
	 * @description undefined
	 */
	indexes?: boolean | null;
};

export type ListPromotedPaths200 = {
	/**
	 * @type array,null
	 */
	data: PromotetypesPromotePathDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
};

export type IndexMaterializedPaths200 = {
	data: PromotetypesIndexMaterializedPathsResultDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListRoles200 = {
	/**
	 * @type array
	 */
	data: AuthtypesGettableRoleDTO[];
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
	data: SpantypesGettableSpanMappersDTO;
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
export type TestSpanMappers200 = {
	data: SpantypesGettableSpanMapperTestDTO;
	/**
	 * @type string
	 */
	status: string;
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

export type GetSubscription200 = {
	data: SubscriptiontypesGettableSubscriptionUsageDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateSubscription201 = {
	data: SubscriptiontypesGettableSubscriptionDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateSubscription200 = {
	data: SubscriptiontypesGettableSubscriptionDTO;
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

export type GetTraceSummaryPathParameters = {
	traceID: string;
};
export type GetTraceSummary200 = {
	data: SpantypesGettableTraceSummaryDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetTraceThreadPathParameters = {
	traceID: string;
};
export type GetTraceThreadParams = {
	/**
	 * @type integer
	 * @description Page size, at most 100. 0 means 20.
	 */
	limit?: number;
	/**
	 * @type string
	 * @description The nextCursor of a page; returns the spans after it. Set only one of after, before and spanId.
	 */
	after?: string;
	/**
	 * @type string
	 * @description The prevCursor of a page; returns the spans before it. Set only one of after, before and spanId.
	 */
	before?: string;
	/**
	 * @type string
	 * @description Returns the page around this span. Set only one of after, before and spanId.
	 */
	spanId?: string;
};

export type GetTraceThread200 = {
	data: SpantypesGettableTraceThreadDTO;
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
	 * @description A filter expression over the reserved keys name, description, created_at, updated_at, created_by and locked, and over tag keys, using the SigNoz filter grammar: comparisons such as =, !=, CONTAINS, LIKE, IN, < and >, single-quoted strings, RFC3339 timestamps in quotes for created_at and updated_at, combined with AND, OR and NOT, for example name CONTAINS 'overview' AND created_at >= '2026-10-21T00:00:00Z'. At most 1024 characters. Empty matches every dashboard.
	 */
	query?: string;
	/**
	 * @description The sort field: updated_at (default), created_at or name.
	 */
	sort?: DashboardtypesListSortDTO;
	/**
	 * @description The sort direction: asc or desc (default).
	 */
	order?: DashboardtypesListOrderDTO;
	/**
	 * @type integer
	 * @description The page size. Defaults to 20 and is capped at 200.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description The number of dashboards to skip. Defaults to 0.
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
export type MigrateDashboardV2PathParameters = {
	id: string;
};
export type MigrateDashboardV2200 = {
	data: DashboardtypesGettableDashboardV2DTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetSystemDashboardPathParameters = {
	name: string;
};
export type GetSystemDashboard200 = {
	data: DashboardtypesGettableSystemDashboardDTO;
	/**
	 * @type string
	 */
	status: string;
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
export type GetIngestionKeyPathParameters = {
	keyId: string;
};
export type GetIngestionKey200 = {
	data: GatewaytypesIngestionKeyDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateIngestionKeyPathParameters = {
	keyId: string;
};
export type GetIngestionKeyLimitsPathParameters = {
	keyId: string;
};
export type GetIngestionKeyLimits200 = {
	/**
	 * @type array,null
	 */
	data: GatewaytypesLimitDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
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

export type CreateIngestionLimit201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteIngestionLimitPathParameters = {
	limitId: string;
};
export type GetIngestionLimitPathParameters = {
	limitId: string;
};
export type GetIngestionLimit200 = {
	data: GatewaytypesLimitDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateIngestionLimitPathParameters = {
	limitId: string;
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

export type ListContainers200 = {
	data: InframonitoringtypesContainersDTO;
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
	 * @description Start of the time range as a Unix timestamp in milliseconds. Must be greater than 0; applied only when end is also set.
	 */
	start?: number | null;
	/**
	 * @type integer,null
	 * @description End of the time range as a Unix timestamp in milliseconds. Must be greater than start; applied only when start is also set.
	 */
	end?: number | null;
	/**
	 * @type integer
	 * @description Maximum number of metric names to return. Defaults to 100; must not exceed 5000.
	 */
	limit?: number;
	/**
	 * @type string
	 * @description Case-insensitive substring to match against metric names.
	 */
	searchText?: string;
	/**
	 * @type string
	 * @description Set to meter to list Cost Meter metrics instead of telemetry metrics.
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

export type ListNotificationChannelsParams = {
	/**
	 * @type string
	 * @description Case-insensitive match on the display name; at most 1024 characters.
	 */
	query?: string;
	/**
	 * @description Only channels of this provider kind.
	 */
	kind?: AlertmanagertypesChannelKindDTO;
	/**
	 * @description The sort column: updated_at (default), created_at or name.
	 */
	sort?: AlertmanagertypesChannelListSortDTO;
	/**
	 * @description The sort order: asc or desc (default).
	 */
	order?: AlertmanagertypesChannelListOrderDTO;
	/**
	 * @type integer
	 * @description The page size; defaults to 20 and is capped at 200.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description The number of channels to skip; defaults to 0.
	 */
	offset?: number;
};

export type ListNotificationChannels200 = {
	data: AlertmanagertypesListableNotificationChannelDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateNotificationChannel201 = {
	data: AlertmanagertypesGettableNotificationChannelDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteNotificationChannelPathParameters = {
	id: string;
};
export type GetNotificationChannelPathParameters = {
	id: string;
};
export type GetNotificationChannel200 = {
	data: AlertmanagertypesGettableNotificationChannelDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateNotificationChannelPathParameters = {
	id: string;
};
export type UpdateNotificationChannel200 = {
	data: AlertmanagertypesGettableNotificationChannelDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type RepairNotificationChannelPathParameters = {
	id: string;
};
export type RepairNotificationChannelParams = {
	/**
	 * @type boolean
	 * @description Apply the diagnosed action; defaults to false, a dry run that only reports it.
	 */
	apply?: boolean;
};

export type RepairNotificationChannel200 = {
	data: AlertmanagertypesChannelRepairDTO;
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
export type GetPublicDashboardPanelQueryRangeV2Params = {
	/**
	 * @type string
	 * @description Start of the time range as a Unix timestamp in milliseconds. Honored only when the public dashboard has timeRangeEnabled.
	 */
	startTime?: string;
	/**
	 * @type string
	 * @description End of the time range as a Unix timestamp in milliseconds. Honored only when the public dashboard has timeRangeEnabled.
	 */
	endTime?: string;
};

export type GetPublicDashboardPanelQueryRangeV2200 = {
	data: Querybuildertypesv5QueryRangeResponseDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type ListQuickFilters200 = {
	/**
	 * @type array
	 */
	data: QuickfiltertypesSourceFiltersDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type GetQuickFiltersPathParameters = {
	source: string;
};
export type GetQuickFilters200 = {
	data: QuickfiltertypesSourceFiltersDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateQuickFiltersPathParameters = {
	source: string;
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

export type ListRuleViews200 = {
	data: RuletypesListableRuleViewsDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateRuleView201 = {
	data: RuletypesRuleViewDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteRuleViewPathParameters = {
	id: string;
};
export type UpdateRuleViewPathParameters = {
	id: string;
};
export type UpdateRuleView200 = {
	data: RuletypesRuleViewDTO;
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
export type CloneRuleByIDPathParameters = {
	id: string;
};
export type CloneRuleByID201 = {
	data: RuletypesRuleDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type GetRuleHistoryFilterKeysPathParameters = {
	id: string;
};
export type GetRuleHistoryFilterKeysParams = {
	/**
	 * @description The signal to look up keys in: traces, logs or metrics. Empty searches every signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description The data source within the signal. Use meter for Cost Meter metrics; empty means the default source.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description Maximum number of results per signal. Defaults to 1000 for keys and 50 for values. For keys, intrinsic and materialized fields are added on top, and an empty signal applies the limit to traces, logs and metrics separately, so the response can exceed it.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the lookup window in Unix milliseconds, rounded down to a 6 hour boundary. Ignored for key lookups and meter lookups; trace and log values apply it at calendar-day granularity; metric attribute values and relatedValues apply it. Omit for no lower bound.
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description End of the lookup window in Unix milliseconds. Ignored for key lookups, trace and log value lookups and meter lookups; applied to metric attribute values and relatedValues. Omit for no upper bound.
	 */
	endUnixMilli?: number;
	/**
	 * @description Restricts keys to one context: resource, attribute, scope, span, trace, log, body or metric. Applied to trace and log keys; metric attribute keys ignore it. Empty means any context.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Restricts keys to one data type: string, bool, int64, float64 or number. Applied to trace and log keys; metric attribute keys ignore it. Empty means any type.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description Restricts keys to those seen on this metric. Metrics signal only.
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description Restricts keys to metrics in this namespace. Metrics signal only.
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description Substring to match: against key names for keys, against the values of name for values. Case-insensitive except for the meter source, where it is case-sensitive and % and _ act as wildcards. For keys, a context prefix such as resource.service.name sets fieldContext when it is empty.
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
	 * @description The signal to look up keys in: traces, logs or metrics. Empty searches every signal.
	 */
	signal?: TelemetrytypesSignalDTO;
	/**
	 * @description The data source within the signal. Use meter for Cost Meter metrics; empty means the default source.
	 */
	source?: TelemetrytypesSourceDTO;
	/**
	 * @type integer
	 * @description Maximum number of results per signal. Defaults to 1000 for keys and 50 for values. For keys, intrinsic and materialized fields are added on top, and an empty signal applies the limit to traces, logs and metrics separately, so the response can exceed it.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description Start of the lookup window in Unix milliseconds, rounded down to a 6 hour boundary. Ignored for key lookups and meter lookups; trace and log values apply it at calendar-day granularity; metric attribute values and relatedValues apply it. Omit for no lower bound.
	 */
	startUnixMilli?: number;
	/**
	 * @type integer
	 * @format int64
	 * @description End of the lookup window in Unix milliseconds. Ignored for key lookups, trace and log value lookups and meter lookups; applied to metric attribute values and relatedValues. Omit for no upper bound.
	 */
	endUnixMilli?: number;
	/**
	 * @description Restricts keys to one context: resource, attribute, scope, span, trace, log, body or metric. Applied to trace and log keys; metric attribute keys ignore it. Empty means any context.
	 */
	fieldContext?: TelemetrytypesFieldContextDTO;
	/**
	 * @description Restricts keys to one data type: string, bool, int64, float64 or number. Applied to trace and log keys; metric attribute keys ignore it. Empty means any type.
	 */
	fieldDataType?: TelemetrytypesFieldDataTypeDTO;
	/**
	 * @type string
	 * @description Restricts keys to those seen on this metric. Metrics signal only.
	 */
	metricName?: string;
	/**
	 * @type string
	 * @description Restricts keys to metrics in this namespace. Metrics signal only.
	 */
	metricNamespace?: string;
	/**
	 * @type string
	 * @description Substring to match: against key names for keys, against the values of name for values. Case-insensitive except for the meter source, where it is case-sensitive and % and _ act as wildcards. For keys, a context prefix such as resource.service.name sets fieldContext when it is empty.
	 */
	searchText?: string;
	/**
	 * @type string
	 * @description The key whose values to return, such as service.name. A context prefix such as resource.service.name sets fieldContext when it is empty.
	 */
	name?: string;
	/**
	 * @type string
	 * @description Filter expression already applied in the explorer. When set, relatedValues lists the values seen on data matching it.
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

export type ListSavedViewsParams = {
	/**
	 * @description Returns only the views of this explorer page: traces, logs, metrics, meter or ai_observability. Defaults to every source.
	 */
	source?: SavedviewtypesSourceDTO;
	/**
	 * @type string
	 * @description Returns only the view with this exact machine name.
	 */
	name?: string;
};

export type ListSavedViews200 = {
	/**
	 * @type array,null
	 */
	data: SavedviewtypesSavedViewDTO[] | null;
	/**
	 * @type string
	 */
	status: string;
};

export type CreateSavedView201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteSavedViewPathParameters = {
	id: string;
};
export type GetSavedViewPathParameters = {
	id: string;
};
export type GetSavedView200 = {
	data: SavedviewtypesSavedViewDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type UpdateSavedViewPathParameters = {
	id: string;
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
	 * @description A filter expression over the reserved keys name, description, created_at, updated_at, created_by and locked, and over tag keys, using the SigNoz filter grammar: comparisons such as =, !=, CONTAINS, LIKE, IN, < and >, single-quoted strings, RFC3339 timestamps in quotes for created_at and updated_at, combined with AND, OR and NOT, for example name CONTAINS 'overview' AND created_at >= '2026-10-21T00:00:00Z'. At most 1024 characters. Empty matches every dashboard.
	 */
	query?: string;
	/**
	 * @description The sort field: updated_at (default), created_at or name.
	 */
	sort?: DashboardtypesListSortDTO;
	/**
	 * @description The sort direction: asc or desc (default).
	 */
	order?: DashboardtypesListOrderDTO;
	/**
	 * @type integer
	 * @description The page size. Defaults to 20 and is capped at 200.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description The number of dashboards to skip. Defaults to 0.
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

export type ListRulesV3Params = {
	/**
	 * @type string
	 * @description A filter expression over rule name, description, labels and other fields, at most 1024 characters. Empty matches every rule.
	 */
	query?: string;
	/**
	 * @type array
	 * @description Only return rules in these states: firing, pending, recovering, inactive, nodata or disabled. Empty means every state.
	 */
	states?: string[];
	/**
	 * @description The field to sort by: updated_at (the default), created_at, name, state or severity.
	 */
	sort?: RuletypesListSortDTO;
	/**
	 * @description The sort direction: asc or desc (the default).
	 */
	order?: RuletypesListOrderDTO;
	/**
	 * @type integer
	 * @description The page size, 1 to 200. Defaults to 20 and larger values are clamped to 200.
	 */
	limit?: number;
	/**
	 * @type integer
	 * @description The number of rules to skip before the page. Defaults to 0.
	 */
	offset?: number;
};

export type ListRulesV3200 = {
	data: RuletypesListableRulesDTO;
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

export type ListLicenses200 = {
	/**
	 * @type array
	 */
	data: LicensetypesGettableLicenseDTO[];
	/**
	 * @type string
	 */
	status: string;
};

export type ActivateLicense201 = {
	data: TypesIdentifiableDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type DeleteLicensePathParameters = {
	id: string;
};
export type GetLicensePathParameters = {
	id: string;
};
export type GetLicense200 = {
	data: LicensetypesGettableLicenseWithKeyDTO;
	/**
	 * @type string
	 */
	status: string;
};

export type RefreshLicensePathParameters = {
	id: string;
};
export type GetActiveLicense200 = {
	data: LicensetypesGettableActiveLicenseDTO;
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

export type PrometheusQueryParams = {
	/**
	 * @type string
	 * @description PromQL expression.
	 */
	query: string;
	/**
	 * @type string
	 * @description Evaluation timestamp: RFC3339 or float unix seconds. Defaults to the server's current time.
	 */
	time?: string;
	/**
	 * @type string
	 * @description Evaluation timeout: duration string or float seconds.
	 */
	timeout?: string;
	/**
	 * @type string
	 * @description Any non-empty value includes query statistics in the response.
	 */
	stats?: string;
};

export type PrometheusQueryPostParams = {
	/**
	 * @type string
	 * @description PromQL expression.
	 */
	query: string;
	/**
	 * @type string
	 * @description Evaluation timestamp: RFC3339 or float unix seconds. Defaults to the server's current time.
	 */
	time?: string;
	/**
	 * @type string
	 * @description Evaluation timeout: duration string or float seconds.
	 */
	timeout?: string;
	/**
	 * @type string
	 * @description Any non-empty value includes query statistics in the response.
	 */
	stats?: string;
};

export type PrometheusQueryRangeParams = {
	/**
	 * @type string
	 * @description PromQL expression.
	 */
	query: string;
	/**
	 * @type string
	 * @description Range start: RFC3339 or float unix seconds.
	 */
	start: string;
	/**
	 * @type string
	 * @description Range end: RFC3339 or float unix seconds.
	 */
	end: string;
	/**
	 * @type string
	 * @description Resolution step: duration string or float seconds.
	 */
	step: string;
	/**
	 * @type string
	 * @description Evaluation timeout: duration string or float seconds.
	 */
	timeout?: string;
	/**
	 * @type string
	 * @description Any non-empty value includes query statistics in the response.
	 */
	stats?: string;
};

export type PrometheusQueryRangePostParams = {
	/**
	 * @type string
	 * @description PromQL expression.
	 */
	query: string;
	/**
	 * @type string
	 * @description Range start: RFC3339 or float unix seconds.
	 */
	start: string;
	/**
	 * @type string
	 * @description Range end: RFC3339 or float unix seconds.
	 */
	end: string;
	/**
	 * @type string
	 * @description Resolution step: duration string or float seconds.
	 */
	step: string;
	/**
	 * @type string
	 * @description Evaluation timeout: duration string or float seconds.
	 */
	timeout?: string;
	/**
	 * @type string
	 * @description Any non-empty value includes query statistics in the response.
	 */
	stats?: string;
};
