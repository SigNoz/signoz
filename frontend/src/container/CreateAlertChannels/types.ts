import {
	AlertmanagertypesChannelEmailConfigDTO,
	AlertmanagertypesChannelGoogleChatConfigDTO,
	AlertmanagertypesChannelIncidentIOConfigDTO,
	AlertmanagertypesChannelJiraConfigDTO,
	AlertmanagertypesChannelJSMOpsConfigDTO,
	AlertmanagertypesChannelKindDTO,
	AlertmanagertypesChannelMSTeamsConfigDTO,
	AlertmanagertypesChannelOpsgenieConfigDTO,
	AlertmanagertypesChannelPagerdutyConfigDTO,
	AlertmanagertypesChannelSlackConfigDTO,
	AlertmanagertypesChannelTelegramConfigDTO,
	AlertmanagertypesChannelWebhookConfigDTO,
} from 'api/generated/services/sigNoz.schemas';

export const ChannelKind = AlertmanagertypesChannelKindDTO;
export type ChannelKind = AlertmanagertypesChannelKindDTO;

/** Merged so switching kind keeps the fields the kinds share. */
export type ChannelSpecFormValues = Partial<
	AlertmanagertypesChannelSlackConfigDTO &
		AlertmanagertypesChannelWebhookConfigDTO &
		AlertmanagertypesChannelEmailConfigDTO &
		AlertmanagertypesChannelPagerdutyConfigDTO &
		AlertmanagertypesChannelOpsgenieConfigDTO &
		AlertmanagertypesChannelMSTeamsConfigDTO &
		AlertmanagertypesChannelGoogleChatConfigDTO &
		AlertmanagertypesChannelJiraConfigDTO &
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
