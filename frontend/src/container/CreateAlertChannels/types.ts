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
		AlertmanagertypesChannelIncidentIOConfigDTO
>;

export type ChannelFormValues = ChannelSpecFormValues & {
	name?: string;
};
