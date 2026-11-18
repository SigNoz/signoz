import {
	AlertmanagertypesChannelEmailConfigDTO,
	AlertmanagertypesChannelGoogleChatConfigDTO,
	AlertmanagertypesChannelIncidentIOConfigDTO,
	AlertmanagertypesChannelJiraAuthDTO,
	AlertmanagertypesChannelJiraConfigDTO,
	AlertmanagertypesChannelJSMOpsConfigDTO,
	AlertmanagertypesChannelKindDTO,
	AlertmanagertypesChannelMSTeamsConfigDTO,
	AlertmanagertypesChannelOpsgenieConfigDTO,
	AlertmanagertypesChannelPagerdutyConfigDTO,
	AlertmanagertypesChannelSlackConfigDTO,
	AlertmanagertypesChannelTelegramConfigDTO,
	AlertmanagertypesChannelWebhookConfigDTO,
	AlertmanagertypesJiraDeploymentDTO,
} from 'api/generated/services/sigNoz.schemas';

export const ChannelKind = AlertmanagertypesChannelKindDTO;
export type ChannelKind = AlertmanagertypesChannelKindDTO;

export const JiraDeployment = AlertmanagertypesJiraDeploymentDTO;
export type JiraDeployment = AlertmanagertypesJiraDeploymentDTO;

export type KeysOfUnion<T> = T extends unknown ? keyof T : never;

export type JiraFormSpec = Omit<
	AlertmanagertypesChannelJiraConfigDTO,
	'auth'
> & {
	auth?: AlertmanagertypesChannelJiraAuthDTO;
};

/** Merged so switching kind keeps the fields the kinds share. */
export type ChannelSpecFormValues = Partial<
	AlertmanagertypesChannelSlackConfigDTO &
		AlertmanagertypesChannelWebhookConfigDTO &
		AlertmanagertypesChannelEmailConfigDTO &
		AlertmanagertypesChannelPagerdutyConfigDTO &
		AlertmanagertypesChannelOpsgenieConfigDTO &
		AlertmanagertypesChannelMSTeamsConfigDTO &
		AlertmanagertypesChannelGoogleChatConfigDTO &
		JiraFormSpec &
		AlertmanagertypesChannelJSMOpsConfigDTO &
		AlertmanagertypesChannelIncidentIOConfigDTO &
		AlertmanagertypesChannelTelegramConfigDTO
>;

export const WebhookAuth = {
	none: 'none',
	basic: 'basic',
	bearer: 'bearer',
} as const;
export type WebhookAuth = (typeof WebhookAuth)[keyof typeof WebhookAuth];

export type ChannelFormValues = ChannelSpecFormValues & {
	name?: string;
	/** Never sent: the API reads the mode from which credentials are set. */
	webhookAuth?: WebhookAuth;
};
